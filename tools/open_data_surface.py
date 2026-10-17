"""Bounded native surface-field experiment; never updates the live site.

Keep individual variable timestamps, grids and units. No hourly interpolation,
weather-code synthesis, rain probabilities or current-observation claims.
"""
import argparse
import concurrent.futures
import datetime as dt
import time
import json
import math
from open_data_collect import (Budget, Ranges, POINTS, MODELS, UTC, stamp,
                               choose_run, read_variable, write_candidate)

FIELDS = ['temperature_2m', 'relative_humidity_2m', 'cloud_cover',
          'cloud_cover_low', 'cloud_cover_mid', 'cloud_cover_high',
          'cape', 'visibility', 'wind_gusts_10m', 'weather_code']
DOMAINS = {**MODELS, 'GFS025': 'ncep_gfs025'}


def wind_series(u, v):
    if u['times'] != v['times'] or u['grid'] != v['grid'] or u['unit'] != 'm/s' or v['unit'] != 'm/s':
        raise ValueError('surface_wind_mismatch')
    if len(u['values']) != len(v['values']) or len(u['times']) != len(u['values']):
        raise ValueError('surface_axis')
    speed, direction = [], []
    for a, b in zip(u['values'], v['values']):
        s = math.hypot(a, b) if a is not None and b is not None else None
        speed.append(round(s, 5) if s is not None else None)
        direction.append(round(math.degrees(math.atan2(-a, -b)) % 360, 5) if s else None)
    shared = {'times': u['times'], 'grid': u['grid'], 'derivedFrom': ['wind_u_component_10m', 'wind_v_component_10m']}
    return ({**shared, 'unit': 'm/s', 'values': speed},
            {**shared, 'unit': 'degrees', 'values': direction})


def window_series(row, start, end):
    """Retain bracketing native samples, including explicit missing values."""
    times = [stamp(t) for t in row['times']]
    if len(times) != len(row['values']) or not times or any(b <= a for a, b in zip(times, times[1:])):
        raise ValueError('surface_axis')
    before = [i for i, t in enumerate(times) if t <= start]
    after = [i for i, t in enumerate(times) if t >= end]
    lo, hi = before[-1] if before else 0, after[0] if after else len(times)-1
    out = {**row, 'times': row['times'][lo:hi+1], 'values': row['values'][lo:hi+1]}
    out['complete48Hours'] = bool(before and after) and all(v is not None for v in out['values'])
    out['sampling'] = 'native; no interpolation or gap filling'
    return out


def sample_at(row, at, max_age_hours=3):
    """Latest model-valid sample, not an observation; no future fallback."""
    if len(row['times']) != len(row['values']):
        raise ValueError('surface_axis')
    eligible = [(stamp(t), v) for t, v in zip(row['times'], row['values']) if stamp(t) <= at]
    if not eligible:
        return None
    t, value = max(eligible, key=lambda p: p[0])
    # A missing latest value must not silently fall back to an earlier good one.
    if value is None or (at-t).total_seconds() > max_age_hours*3600:
        return None
    return {'validAt': t.isoformat(), 'value': value, 'unit': row['unit'],
            'ageMinutesAtCollection': round((at-t).total_seconds()/60, 2),
            'modelEstimate': True, 'observation': False}


def domain_collect(label, domain, now, budget):
    start = now.replace(minute=0, second=0, microsecond=0)
    end = start+dt.timedelta(hours=48)
    (meta, provenance, prefix), checked = choose_run(domain, end, now, budget)
    wind = ['wind_speed_10m', 'wind_direction_10m'] if label == 'CMC' else ['wind_u_component_10m', 'wind_v_component_10m']
    fields = FIELDS+wind
    available = set(meta['variables'])
    fs, data, errors = Ranges(budget), {}, {}
    for field in fields:
        if field not in available:
            continue
        try:
            data[field] = read_variable(prefix, field, meta, POINTS, fs)
        except Exception as e:
            errors[field] = str(e)[:180]
    rows = []
    for i, p in enumerate(POINTS):
        native = {field: values[i] for field, values in data.items()}
        if all(f in native for f in ['wind_u_component_10m', 'wind_v_component_10m']):
            native['wind_speed_10m'], native['wind_direction_10m'] = wind_series(native['wind_u_component_10m'], native['wind_v_component_10m'])
        series = {field: window_series(row, start, end) for field, row in native.items()}
        # Preserve separate validity times and do not present interval gusts as
        # instantaneous winds. They stay in their labelled native series.
        estimates = {field: sample_at(row, now) for field, row in series.items()
                     if field != 'wind_gusts_10m'}
        rows.append({**p, 'series': series, 'modelSamplesAtCollection': estimates})
    return {'model': label, 'domain': domain, 'run': meta['reference_time'],
            'provenance': provenance, 'runsChecked': checked,
            'startAt': start.isoformat(), 'endAt': end.isoformat(),
            'missingFields': [f for f in fields if f not in available],
            'fieldErrors': errors, 'local': rows,
            'rangeBytes': fs.bytes, 'rangeRequests': fs.requests}


def collect(now=None):
    now = (now or dt.datetime.now(UTC)).astimezone(UTC)
    budget, begin = Budget(max_bytes=64*1024*1024, max_requests=1800), time.monotonic()
    result = {'schema': 'hada-open-data-surface-v1', 'experimental': True,
              'readyForSite': False, 'staticSnapshot': True,
              'startedAt': now.isoformat(), 'models': {}, 'errors': {},
              'source': 'Open-Meteo AWS Open Data / CC BY 4.0',
              'limitations': ['Native model samples, not observations.',
                              'No hourly interpolation, elevation correction or invented values.',
                              'GFS025 supplements GFS013; separate run, grid and validity times remain visible.',
                              'Gusts retain native source values, not current sustained winds.',
                              'No apparent temperature, rain probability, alert or best-rain-hour adapter.']}
    with concurrent.futures.ThreadPoolExecutor(max_workers=5) as pool:
        jobs = {pool.submit(domain_collect, k, d, now, budget): k for k, d in DOMAINS.items()}
        for job in concurrent.futures.as_completed(jobs):
            label = jobs[job]
            try:
                result['models'][label] = job.result()
            except Exception as e:
                result['errors'][label] = str(e)[:200]
    result['finishedAt'] = dt.datetime.now(UTC).isoformat()
    result['elapsedSeconds'] = round(time.monotonic()-begin, 2)
    result['budget'] = {'reservedBytes': budget.bytes, 'requestAttempts': budget.requests,
                        'rangeBytes': sum(m['rangeBytes'] for m in result['models'].values()),
                        'maxBytes': budget.max_bytes, 'deadlineSeconds': 600}
    return result


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output', required=True)
    args = parser.parse_args()
    result = collect()
    write_candidate(args.output, result)
    print(json.dumps({k: result[k] for k in ['errors', 'elapsedSeconds', 'budget']}, ensure_ascii=False))
    for label, model in result['models'].items():
        print(json.dumps({'model': label, 'run': model['run'], 'missing': model['missingFields'],
                          'errors': model['fieldErrors'], 'fields': list(model['local'][0]['series'])}, ensure_ascii=False))
