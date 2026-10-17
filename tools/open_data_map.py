"""Experimental regional rainfall snapshot from public OM files only."""
import argparse
import concurrent.futures
import datetime as dt
import json
import pathlib
import statistics
import time
from open_data_collect import (ADEN, UTC, MODELS, POINTS, Budget, Ranges,
                               choose_run, read_variable, rain_day, stamp,
                               week, write_candidate)

GRID = {'west': 42, 'east': 60, 'south': 9, 'north': 21,
        'step': 0.75, 'nx': 25, 'ny': 17}
MAP_NAMES = {'ECMWF': 'ecmwf_ifs025', 'GFS': 'gfs_global',
             'ICON': 'icon_global', 'CMC': 'gem_global', 'AIFS': 'ecmwf_aifs025_ensemble'}
LOCALS = [{'name': 'عتق — نقطة مرجعية', 'lat': 14.537, 'lon': 46.832},
          POINTS[1], POINTS[0]]


def points():
    return [{'lat': GRID['north']-y*GRID['step'],
             'lon': GRID['west']+x*GRID['step']}
            for y in range(GRID['ny']) for x in range(GRID['nx'])]+LOCALS


def read_model(label, domain, period, now, budget):
    start, end = stamp(period['startAt']), stamp(period['endAt'])
    (meta, provenance, prefix), checked = choose_run(domain, end, now, budget)
    if 'precipitation' not in meta['variables']:
        raise ValueError('precipitation_missing')
    fs = Ranges(budget)
    rows = read_variable(prefix, 'precipitation', meta, points(), fs)
    run, result = stamp(meta['reference_time']), []
    for row in rows:
        times = [stamp(t) for t in row['times']]
        daily = [rain_day(times, row['values'], run,
                          start+dt.timedelta(days=i), start+dt.timedelta(days=i+1))
                 for i in range(7)]
        result.append({'daily': [v['mm'] for v in daily],
                       'complete': all(v['complete'] for v in daily),
                       'coveredHours': [v['coveredHours'] for v in daily],
                       'estimatedDayBoundaries': any(v['estimatedBoundary'] for v in daily),
                       'sourceGrid': row['grid']})
    return {'model': label, 'domain': domain, 'run': meta['reference_time'],
            'availableUntil': meta['valid_times'][-1], 'provenance': provenance,
            'runsChecked': checked, 'points': result,
            'rangeBytes': fs.bytes, 'rangeRequests': fs.requests}


def aggregate_point(models, index):
    totals, daily, excluded, estimated = {}, {}, {}, []
    for label, source in models.items():
        row, key = source['points'][index], MAP_NAMES[label]
        if row['complete'] and all(v is not None and v >= 0 for v in row['daily']):
            daily[key] = row['daily']
            totals[key] = round(sum(row['daily']), 4)
            if row['estimatedDayBoundaries']:
                estimated.append(key)
        else:
            excluded[key] = {'reason': 'incomplete_period_or_values',
                             'coveredHours': row['coveredHours']}
    v = list(totals.values())
    good = len(v) >= 3
    median = statistics.median(v) if good else None
    return {'value': round(median, 4) if good else None,
            'min': min(v) if v else None, 'max': max(v) if v else None,
            'count': len(v), 'totals': totals, 'daily': daily, 'excludedModels': excluded,
            'estimatedDayBoundaryModels': estimated,
            'disagreement': bool(good and max(v)-min(v) >= 20 and max(v)-min(v) > median)}


def inside_ring(lon, lat, ring):
    hit = False
    for (a, b), (c, d) in zip(ring, ring[-1:]+ring[:-1]):
        if (b > lat) != (d > lat) and lon < (c-a)*(lat-b)/(d-b)+a:
            hit = not hit
    return hit


def inside_geometry(lon, lat, geometry):
    if geometry['type'] not in ('Polygon', 'MultiPolygon'):
        raise ValueError('unsupported_boundary')
    polys = [geometry['coordinates']] if geometry['type'] == 'Polygon' else geometry['coordinates']
    return any(inside_ring(lon, lat, p[0]) and not any(inside_ring(lon, lat, hole) for hole in p[1:]) for p in polys)


def province_summary(cells, geometry):
    selected = [cell for p, cell in zip(points()[:425], cells)
                if inside_geometry(p['lon'], p['lat'], geometry)]
    good = [v['value'] for v in selected if v['value'] is not None]
    return {'name': 'محافظة شبوة', 'gridSampleCount': len(selected),
            'validGridSampleCount': len(good), 'complete': bool(selected) and len(good) == len(selected),
            'minimumMm': min(good) if good else None, 'maximumMm': max(good) if good else None,
            'method': 'range of median-model weekly totals at grid samples inside actual boundary',
            'note': 'Coarse 0.75-degree grid samples; not an area integral or a forecast for every village.'}


def collect(now=None):
    now, begin = now or dt.datetime.now(UTC), time.monotonic()
    budget, period = Budget(max_bytes=128*1024*1024, max_requests=4096, seconds=900), week(now)
    models, errors = {}, {}
    with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
        jobs = {pool.submit(read_model, label, domain, period, now, budget): label for label, domain in MODELS.items()}
        for job in concurrent.futures.as_completed(jobs):
            label = jobs[job]
            try:
                models[label] = job.result()
            except Exception as e:
                errors[label] = str(e)[:200]
    cells = [aggregate_point(models, i) for i in range(425)]
    local = [{**p, **aggregate_point(models, 425+i)} for i, p in enumerate(LOCALS)]
    boundary = pathlib.Path(__file__).resolve().parents[1]/'sea-map-data/yemen-adm1.geojson'
    features = json.loads(boundary.read_text())['features']
    geometry = next(f['geometry'] for f in features if f['properties'].get('shapeISO') == 'YE-SH')
    start = stamp(period['startAt']).astimezone(ADEN)
    compatible_period = {**period, 'start': start.date().isoformat(),
                         'end': (start+dt.timedelta(days=6)).date().isoformat(),
                         'until': (start+dt.timedelta(days=7)).date().isoformat()}
    return {'schema': 1, 'experimental': True, 'readyForSite': False,
            'startedAt': now.isoformat(), 'fetchedAt': dt.datetime.now(UTC).isoformat(),
            'period': compatible_period, 'grid': GRID,
            'models': [MAP_NAMES[m] for m in models], 'cells': cells, 'local': local,
            'method': 'median-model-total', 'track': None,
            'source': 'Open-Meteo AWS Open Data / CC BY 4.0; derived with interval allocation where marked',
            'modelReadResults': models, 'errors': errors,
            'completeGridAtLeastThreeModels': all(c['value'] is not None for c in cells+local),
            'completeGridFourModels': all(c['count'] == 4 for c in cells+local),
            'provinceSummary': province_summary(cells, geometry),
            'elapsedSeconds': round(time.monotonic()-begin, 2),
            'budget': {'reservedBytes': budget.bytes, 'requestAttempts': budget.requests,
                       'rangeBytes': sum(m['rangeBytes'] for m in models.values()),
                       'maxBytes': budget.max_bytes, 'deadlineSeconds': 900}}


if __name__ == '__main__':
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument('--output', required=True)
    args = p.parse_args()
    result = collect()
    write_candidate(args.output, result)
    print(json.dumps({k: result[k] for k in ['errors', 'completeGridAtLeastThreeModels',
                     'completeGridFourModels', 'provinceSummary', 'elapsedSeconds', 'budget']}, ensure_ascii=False))
