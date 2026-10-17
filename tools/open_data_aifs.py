"""Experimental AIFS ENS adapter; six-hourly data, never hourly probability."""
import argparse
import datetime as dt
import json
import math
import time
from open_data_collect import ADEN, UTC, POINTS, week, stamp, write_candidate

STORAGE = 'https://dynamical-ecmwf-aifs-ens.s3.us-west-2.amazonaws.com/ecmwf-aifs-ens-forecast/v0.1.0.icechunk'
VARIABLES = {'precipitation_surface': 'kg m-2 s-1', 'temperature_2m': 'degree_Celsius',
             'wind_u_10m': 'm s-1', 'wind_v_10m': 'm s-1'}
MEMBERS = 51


def probability(amounts, threshold=0.1):
    if len(amounts) != MEMBERS or any(v is None or not math.isfinite(v) or v < 0 for v in amounts):
        raise ValueError('incomplete_ensemble')
    return round(100*sum(v > threshold for v in amounts)/MEMBERS, 5)


def day_amount(times, rates, start, end):
    total, covered, estimated = 0.0, 0.0, False
    for i in range(1, len(times)):
        overlap = max(0, (min(end, times[i])-max(start, times[i-1])).total_seconds())
        if overlap:
            if rates[i] is None or not math.isfinite(rates[i]) or rates[i] < 0:
                raise ValueError('missing_rain_member')
            total += rates[i]*overlap  # kg/m²/s = mm/s; no pre-threshold rounding
            covered += overlap
            estimated |= overlap != (times[i]-times[i-1]).total_seconds()
    if covered != (end-start).total_seconds():
        raise ValueError('incomplete_day')
    return total, estimated


def summary(run, leads, rates, temperatures, u, v, period):
    if not leads or leads[0] != 0 or any(b-a != 21600 for a, b in zip(leads, leads[1:])):
        raise ValueError('six_hour_axis_required')
    arrays = [rates, temperatures, u, v]
    if any(len(a) != len(leads) or any(len(row) != MEMBERS for row in a) for a in arrays):
        raise ValueError('ensemble_shape')
    times = [run+dt.timedelta(seconds=s) for s in leads]
    start, end = stamp(period['startAt']), stamp(period['endAt'])
    if times[0] > start or times[-1] < end:
        raise ValueError('incomplete_week')
    needed_rain = [i for i in range(1, len(times)) if times[i] > start and times[i-1] < end]
    needed_instant = [i for i, t in enumerate(times) if start <= t < end]
    for i in needed_rain:
        if any(x is None or not math.isfinite(x) or x < 0 for x in rates[i]):
            raise ValueError('missing_rain_member')
    for i in needed_instant:
        for a in [temperatures, u, v]:
            if any(x is None or not math.isfinite(x) for x in a[i]):
                raise ValueError('missing_instant_member')
        if any(not -100 <= x <= 70 for x in temperatures[i]) or any(abs(x) > 200 for a in [u, v] for x in a[i]):
            raise ValueError('invalid_instant_value')
    intervals = []
    for i in needed_rain:
        amounts = [x*(leads[i]-leads[i-1]) for x in rates[i]]
        intervals.append({'startAt': times[i-1].isoformat(), 'endAt': times[i].isoformat(),
                          'ensembleMeanMm': round(sum(amounts)/MEMBERS, 5),
                          'probabilityAbove0_1mmPercent': probability(amounts), 'members': MEMBERS})
    daily = []
    for day in range(7):
        a, b = start+dt.timedelta(days=day), start+dt.timedelta(days=day+1)
        amounts, estimated = [], False
        for member in range(MEMBERS):
            amount, split = day_amount(times, [row[member] for row in rates], a, b)
            amounts.append(amount)
            estimated |= split
        samples = [i for i, t in enumerate(times) if a <= t < b]
        if not samples:
            raise ValueError('missing_day_samples')
        daily.append({'date': a.astimezone(ADEN).date().isoformat(),
                      'ensembleMeanRainMm': round(sum(amounts)/MEMBERS, 5),
                      'estimatedDayBoundaries': estimated,
                      'dailyRainProbabilityAbove0_1mmPercent': probability(amounts),
                      'meanMemberSampledTemperatureMaxC': round(sum(max(temperatures[i][m] for i in samples) for m in range(MEMBERS))/MEMBERS, 4),
                      'meanMemberSampledTemperatureMinC': round(sum(min(temperatures[i][m] for i in samples) for m in range(MEMBERS))/MEMBERS, 4),
                      'meanMemberSampledWindMaxKmh': round(sum(max(math.hypot(u[i][m], v[i][m])*3.6 for i in samples) for m in range(MEMBERS))/MEMBERS, 4),
                      'members': MEMBERS})
    return {'daily': daily, 'nativeSixHourIntervals': intervals,
            'dailyProbabilityDefinition': 'fraction of 51 members whose allocated Yemen-day total exceeds 0.1 mm; day boundaries estimated',
            'sixHourProbabilityDefinition': 'fraction of 51 members whose native six-hour total exceeds 0.1 mm',
            'notEquivalentToCurrentHourlyProbability': True}


def collect():
    import icechunk
    import numpy as np
    import xarray as xr
    from zarr.storage import WrapperStore

    class MeteredStore(WrapperStore):
        def __init__(self, store):
            super().__init__(store)
            self.delivered_bytes = self.calls = 0

        def account(self, buffers):
            for value in buffers:
                if value is not None:
                    self.delivered_bytes += len(value)
                    self.calls += 1
            if self.delivered_bytes > 128*1024*1024:
                raise ValueError('encoded_data_budget')

        async def get(self, key, prototype, byte_range=None):
            value = await self._store.get(key, prototype, byte_range)
            self.account([value])
            return value

        async def get_partial_values(self, prototype, key_ranges):
            values = await self._store.get_partial_values(prototype, key_ranges)
            self.account(values)
            return values

        async def get_ranges(self, key, byte_ranges, **kwargs):
            async for group in self._store.get_ranges(key, byte_ranges, **kwargs):
                self.account(v for _, v in group)
                yield group

    now, begin = dt.datetime.now(UTC), time.monotonic()
    repo = icechunk.Repository.open(icechunk.http_storage(STORAGE))
    session = repo.readonly_session('main')
    store = MeteredStore(session.store)
    ds = xr.open_zarr(store, chunks=None)
    if ds.ensemble_member.values.tolist() != list(range(MEMBERS)):
        raise ValueError('51_members_required')
    for name, unit in VARIABLES.items():
        if ds[name].attrs.get('units') != unit:
            raise ValueError('unit_mismatch:'+name)
    period, checked, selected = week(now), [], None
    # Try only a few most recent source runs if the archive's latest is incomplete.
    for index in range(ds.sizes['init_time']-1, max(-1, ds.sizes['init_time']-5), -1):
        init = ds.init_time.values[index]
        run = dt.datetime.fromtimestamp(float(init.astype('datetime64[s]').astype('int64')), UTC)
        if run > now or now-run > dt.timedelta(hours=48):
            continue
        a = ds[list(VARIABLES)].isel(init_time=index).sel(
            latitude=xr.DataArray([p['lat'] for p in POINTS], dims='point'),
            longitude=xr.DataArray([p['lon'] for p in POINTS], dims='point'), method='nearest').load()
        leads = a.lead_time.values.astype('timedelta64[s]').astype('int64').tolist()
        try:
            local, raw = [], []
            for i, p in enumerate(POINTS):
                values = {name: a[name].isel(point=i).transpose('lead_time', 'ensemble_member').values.tolist() for name in VARIABLES}
                result = summary(run, leads, values['precipitation_surface'], values['temperature_2m'], values['wind_u_10m'], values['wind_v_10m'], period)
                local.append({**p, 'sourceGrid': {'lat': float(a.latitude.values[i]), 'lon': float(a.longitude.values[i])}, **result})
                raw.append({'name': p['name'], **{key: [[v if math.isfinite(v) else None for v in row] for row in value] for key, value in values.items()}})
            selected = (run, local, raw, leads)
            checked.append({'run': run.isoformat(), 'complete': True})
            break
        except ValueError as e:
            checked.append({'run': run.isoformat(), 'error': str(e)})
    if selected is None:
        raise ValueError('no_complete_aifs_run:'+json.dumps(checked))
    run, local, raw, leads = selected
    ds.close()
    return {'schema': 'hada-aifs-ens-experiment-v1', 'experimental': True, 'readyForSite': False,
            'checkedAt': now.isoformat(), 'run': run.isoformat(), 'period': period,
            'members': MEMBERS, 'nativeStepHours': 6, 'local': local,
            'source': {'dataset': 'ECMWF AIFS ENS forecast processed by dynamical.org',
                       'storage': STORAGE, 'snapshotId': str(session.snapshot_id),
                       'catalog': 'https://dynamical.org/catalog/ecmwf-aifs-ens-forecast/',
                       'license': 'CC BY 4.0 and ECMWF Terms of Use', 'units': VARIABLES},
            'runsChecked': checked, 'rawLocalMemberValues': raw, 'rawLeadSeconds': leads,
            'elapsedSeconds': round(time.monotonic()-begin, 2),
            'encodedZarrBytesDelivered': store.delivered_bytes, 'zarrBuffersDelivered': store.calls,
            'transferMetricNote': 'Logical encoded buffers delivered by the Icechunk store; not total HTTP bandwidth or installation size.',
            'limitations': ['No hourly rain probability equivalence.', 'Day-boundary rainfall allocation is estimated.',
                            'No elevation correction or spatial interpolation.', 'No website or map integration.']}


if __name__ == '__main__':
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument('--output', required=True)
    args = p.parse_args()
    result = collect()
    write_candidate(args.output, result)
    print(json.dumps({k: result[k] for k in ['run', 'members', 'nativeStepHours', 'elapsedSeconds',
                                           'encodedZarrBytesDelivered', 'zarrBuffersDelivered']}, ensure_ascii=False))
