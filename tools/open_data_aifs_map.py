"""Add AIFS ensemble mean as ONE model to an experimental rainfall map."""
import argparse
import datetime as dt
import json
import time
from open_data_aifs import STORAGE
from open_data_collect import UTC, stamp, write_candidate
from open_data_map import MAP_NAMES, LOCALS, points, aggregate_point, province_summary


def combine(base, aifs, geometry):
    if aifs['period'] != {k: base['period'][k] for k in ['startAt', 'endAt', 'hours']}:
        raise ValueError('period_mismatch')
    if len(aifs['points']) != 428 or aifs['members'] != 51:
        raise ValueError('regional_ensemble_shape')
    models = {**base['modelReadResults'], 'AIFS': aifs}
    cells = [aggregate_point(models, i) for i in range(425)]
    local = [{**p, **aggregate_point(models, 425+i)} for i, p in enumerate(LOCALS)]
    all_cells = cells+local
    deterministic = ['ecmwf_ifs025', 'gfs_global', 'icon_global', 'gem_global']
    return {**base, 'cells': cells, 'local': local, 'models': [MAP_NAMES[m] for m in models],
            'modelReadResults': models, 'readyForSite': False,
            'fetchedAt': dt.datetime.now(UTC).isoformat(),
            'source': 'Open-Meteo AWS Open Data; ECMWF AIFS ENS processed by dynamical.org; CC BY 4.0; derived interval allocations',
            'completeGridAtLeastThreeModels': all(c['count'] >= 3 for c in all_cells),
            'completeGridAtLeastFourModels': all(c['count'] >= 4 for c in all_cells),
            'completeGridFourModels': all(all(m in c['totals'] for m in deterministic) for c in all_cells),
            'completeGridFiveModels': all(c['count'] == 5 for c in all_cells),
            'minimumCompleteModelCount': min(c['count'] for c in all_cells),
            'provinceSummary': province_summary(cells, geometry),
            'aifsWeight': 'one model: mean of all 51 members, then median across complete model totals',
            'aifsTransferMetrics': aifs['transferMetrics']}


def collect(base, local_aifs):
    import icechunk
    import numpy as np
    import xarray as xr
    from zarr.storage import WrapperStore
    begin = time.monotonic()
    class Meter(WrapperStore):
        def __init__(self, store):
            super().__init__(store)
            self.bytes = self.calls = 0

        def account(self, values):
            for v in values:
                if v is not None:
                    self.bytes += len(v)
                    self.calls += 1
            if self.bytes > 128*1024*1024:
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

    repo = icechunk.Repository.open(icechunk.http_storage(STORAGE))
    session = repo.readonly_session(snapshot_id=local_aifs['source']['snapshotId'])
    meter = Meter(session.store)
    ds = xr.open_zarr(meter, chunks=None)
    if ds.ensemble_member.values.tolist() != list(range(51)) or ds.precipitation_surface.attrs.get('units') != 'kg m-2 s-1':
        raise ValueError('ensemble_or_units')
    run = stamp(local_aifs['run'])
    if dt.datetime.now(UTC)-run > dt.timedelta(hours=48):
        raise ValueError('run_age')
    p = points()
    a = ds.precipitation_surface.sel(init_time=np.datetime64(run.replace(tzinfo=None))).sel(
        latitude=xr.DataArray([v['lat'] for v in p], dims='point'),
        longitude=xr.DataArray([v['lon'] for v in p], dims='point'), method='nearest').load()
    leads = a.lead_time.values.astype('timedelta64[s]').astype('int64')
    if int(leads[0]) != 0 or np.any(np.diff(leads) != 21600):
        raise ValueError('six_hour_axis_required')
    times = [run+dt.timedelta(seconds=int(s)) for s in leads]
    period = {k: base['period'][k] for k in ['startAt', 'endAt', 'hours']}
    start, end = stamp(period['startAt']), stamp(period['endAt'])
    if times[0] > start or times[-1] < end:
        raise ValueError('incomplete_week')
    ix = [i for i in range(1, len(times)) if times[i] > start and times[i-1] < end]
    rain = a.transpose('lead_time', 'ensemble_member', 'point').values[ix]
    if not np.isfinite(rain).all() or np.any(rain < 0):
        raise ValueError('incomplete_regional_members')
    # All 51 members must be present before calculating the ensemble mean.
    mean_rate = rain.mean(axis=1, dtype=np.float64)
    daily, estimated = [], []
    for day in range(7):
        lo, hi = start+dt.timedelta(days=day), start+dt.timedelta(days=day+1)
        weights = np.array([max(0, (min(hi, times[i])-max(lo, times[i-1])).total_seconds()) for i in ix])
        if float(weights.sum()) != 86400:
            raise ValueError('incomplete_day')
        daily.append(np.tensordot(weights, mean_rate, axes=(0, 0)))
        estimated.append(any(0 < w < 21600 for w in weights))
    daily = np.asarray(daily)
    if not np.isfinite(daily).all() or np.any(daily < 0) or np.any(daily > 3000):
        raise ValueError('invalid_rain')
    result = {'model': 'AIFS', 'domain': 'ECMWF AIFS ENS via dynamical.org',
              'run': run.isoformat(), 'members': 51, 'nativeStepHours': 6, 'period': period,
              'provenance': local_aifs['source'],
              'points': [{'daily': [round(float(v), 5) for v in daily[:, i]],
                          'complete': True, 'coveredHours': [24]*7,
                          'estimatedDayBoundaries': any(estimated),
                          'sourceGrid': {'lat': float(a.latitude.values[i]), 'lon': float(a.longitude.values[i])}}
                         for i in range(428)],
              'transferMetrics': {'encodedZarrBytesDelivered': meter.bytes,
                                  'zarrBuffersDelivered': meter.calls,
                                  'note': 'Logical encoded buffers, not total HTTP bandwidth.',
                                  'elapsedSeconds': round(time.monotonic()-begin, 2)}}
    ds.close()
    return result


if __name__ == '__main__':
    import pathlib
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument('--base', required=True)
    p.add_argument('--local-aifs', required=True)
    p.add_argument('--output', required=True)
    args = p.parse_args()
    base = json.loads(pathlib.Path(args.base).read_text())
    local = json.loads(pathlib.Path(args.local_aifs).read_text())
    aifs = collect(base, local)
    features = json.loads((pathlib.Path(__file__).resolve().parents[1]/'sea-map-data/yemen-adm1.geojson').read_text())['features']
    geometry = next(f['geometry'] for f in features if f['properties'].get('shapeISO') == 'YE-SH')
    result = combine(base, aifs, geometry)
    write_candidate(args.output, result)
    print(json.dumps({k: result[k] for k in ['minimumCompleteModelCount', 'completeGridFiveModels',
                                           'provinceSummary', 'aifsTransferMetrics']}, ensure_ascii=False))
