"""Experimental local weather collector. No API key, scheduler or site writes.

Only native run-based AWS data are read. All rainfall daily allocations that
split a native interval are explicitly marked as estimates. Nothing here
constitutes an adapter for the live website or a 428-point regional map.
"""
import argparse
import concurrent.futures
import datetime as dt
import hashlib
import json
import math
import os
import pathlib
import re
import threading
import time
import urllib.error
import urllib.request

BASE = 'https://openmeteo.s3.amazonaws.com/'
UTC = dt.timezone.utc
ADEN = dt.timezone(dt.timedelta(hours=3))
POINTS = [{'name': 'هدى', 'lat': 14.230586, 'lon': 47.199415},
          {'name': 'حبان', 'lat': 14.3541, 'lon': 47.0765}]
MODELS = {'ECMWF': 'ecmwf_ifs025', 'GFS': 'ncep_gfs013',
          'ICON': 'dwd_icon', 'CMC': 'cmc_gem_gdps_15km'}
UNITS = {'temperature_2m': 'celsius', 'relative_humidity_2m': '%',
         'cloud_cover': '%', 'precipitation': 'mm',
         'wind_u_component_10m': 'm/s', 'wind_v_component_10m': 'm/s',
         'wind_speed_10m': 'm/s', 'wind_direction_10m': 'degrees',
         'dust': 'ug/m3'}
UNITS.update({**{f'cloud_cover_{level}': '%' for level in ['low', 'mid', 'high']},
              'cape': 'J/kg', 'visibility': 'm', 'wind_gusts_10m': 'm/s',
              'weather_code': 'wmo code'})


def stamp(s):
    v = dt.datetime.fromisoformat(s.replace('Z', '+00:00'))
    if v.tzinfo is None:
        raise ValueError('timezone_required')
    return v.astimezone(UTC)


def week(now):
    start = now.astimezone(ADEN).replace(hour=0, minute=0, second=0, microsecond=0) + dt.timedelta(days=1)
    end = start + dt.timedelta(days=7)
    return {'startAt': start.isoformat(), 'endAt': end.isoformat(), 'hours': 168}


class Budget:
    def __init__(self, max_bytes=32*1024*1024, max_requests=1024, seconds=600):
        self.max_bytes, self.max_requests = max_bytes, max_requests
        self.bytes = self.requests = 0
        self.deadline = time.monotonic()+seconds
        self.lock = threading.Lock()

    def reserve(self, size):
        with self.lock:
            if time.monotonic() > self.deadline:
                raise ValueError('collection_deadline')
            if self.bytes+size > self.max_bytes or self.requests+1 > self.max_requests:
                raise ValueError('download_budget')
            self.bytes += size
            self.requests += 1


def request(url, budget, headers=None, method='GET', cap=262144):
    if not url.startswith(BASE):
        raise ValueError('unexpected_source')
    # Reserve before starting I/O, including failed attempts.
    budget.reserve(0 if method == 'HEAD' else cap)
    with urllib.request.urlopen(urllib.request.Request(url, headers=headers or {}, method=method), timeout=25) as r:
        if r.url != url:
            raise ValueError('unexpected_redirect')
        b = b'' if method == 'HEAD' else r.read(cap+1)
        if len(b) > cap:
            raise ValueError('response_size')
        return r.status, dict(r.headers), b


class Ranges:
    def __init__(self, budget):
        self.budget, self.info, self.blocks = budget, {}, {}
        self.bytes = self.requests = 0

    def size(self, path):
        if not path.startswith(BASE+'data_run/'):
            raise ValueError('unexpected_file')
        if path not in self.info:
            try:
                _, h, _ = request(path, self.budget, method='HEAD')
            except urllib.error.HTTPError as e:
                if e.code != 404:
                    raise
                # Some published objects answer HEAD with 404 while a bounded
                # GET succeeds. One GET of the identical public resource only.
                status, h, b = request(path, self.budget, {'Range': 'bytes=0-0'}, cap=1)
                headers = {k.lower(): v for k, v in h.items()}
                match = re.fullmatch(r'bytes 0-0/(\d+)', headers.get('content-range', ''))
                if status != 206 or not match or len(b) != 1:
                    raise ValueError('file_size_unavailable')
                h = {**headers, 'content-length': match.group(1)}
            h = {k.lower(): v for k, v in h.items()}
            self.info[path] = (int(h['content-length']), h.get('etag'))
        return self.info[path][0]

    def cat_file(self, path, start=None, end=None):
        size = self.size(path)
        start, end = 0 if start is None else start, size if end is None else min(end, size)
        if not 0 <= start <= end <= size or end-start > 2*1024*1024:
            raise ValueError('invalid_range')
        out = bytearray()
        for offset in range(start//65536*65536, end, 65536):
            key, stop = (path, offset), min(size, offset+65536)
            if key not in self.blocks:
                headers = {'Range': f'bytes={offset}-{stop-1}'}
                if self.info[path][1]:
                    headers['If-Match'] = self.info[path][1]
                status, h, b = request(path, self.budget, headers, cap=stop-offset)
                h = {k.lower(): v for k, v in h.items()}
                if status != 206 or h.get('content-range') != f'bytes {offset}-{stop-1}/{size}' or len(b) != stop-offset:
                    raise ValueError('range_not_honored')
                self.blocks[key] = b
                self.bytes += len(b)
                self.requests += 1
            b = self.blocks[key]
            out.extend(b[max(0, start-offset):min(end-offset, len(b))])
        return bytes(out)


def read_meta(url, budget):
    _, _, raw = request(url, budget)
    m = json.loads(raw)
    times = [stamp(t) for t in m['valid_times']]
    if len(times) < 2 or any(b <= a for a, b in zip(times, times[1:])):
        raise ValueError('invalid_time_axis')
    return m, {'url': url, 'sha256': hashlib.sha256(raw).hexdigest()}


def run_url(domain, run):
    return BASE+'data_run/'+domain+'/'+run.strftime('%Y/%m/%d/%H%MZ/')


def choose_run(domain, end, now, budget):
    latest, _ = read_meta(BASE+'data_spatial/'+domain+'/latest.json', budget)
    if latest.get('completed') is not True:
        raise ValueError('incomplete_latest_run')
    first = stamp(latest['reference_time'])
    if first > now or now-first > dt.timedelta(hours=48):
        raise ValueError('run_age')
    # 00/12 cycles often have longer horizons than 06/18 cycles.
    candidates = [first]
    for h in range(6, 31, 6):
        r = first-dt.timedelta(hours=h)
        if r.hour in (0, 12):
            candidates.append(r)
    checked, best = [], None
    for r in candidates:
        try:
            m, provenance = read_meta(run_url(domain, r)+'meta.json', budget)
            if stamp(m['reference_time']) != r:
                raise ValueError('run_mismatch')
            if stamp(m['created_at']) > now:
                raise ValueError('future_metadata')
            checked.append({'run': r.isoformat(), 'end': m['valid_times'][-1]})
            entry = (m, provenance, run_url(domain, r))
            if best is None or stamp(m['valid_times'][-1]) > stamp(best[0]['valid_times'][-1]):
                best = entry
            if stamp(m['valid_times'][-1]) >= end:
                return entry, checked
        except urllib.error.HTTPError as e:
            if e.code != 404:
                raise
            checked.append({'run': r.isoformat(), 'error': 'not_published'})
    if best is None:
        raise ValueError('no_completed_run_metadata')
    return best, checked


def coordinate(wkt, shape, point):
    if not wkt.startswith('GEOGCRS["WGS 84"') or len(shape) != 3:
        raise ValueError('unsupported_grid')
    south, west, north, east = map(float, re.search(r'BBOX\[([^]]+)\]', wkt).group(1).split(','))
    ny, nx, _ = shape
    if min(nx, ny) < 2:
        raise ValueError('invalid_grid')
    dy, dx = (north-south)/(ny-1), (east-west)/(nx-1)
    x, y = round((point['lon']-west)/dx), round((point['lat']-south)/dy)
    if not (0 <= x < nx and 0 <= y < ny):
        raise ValueError('point_outside_grid')
    return x, y, {'lat': south+y*dy, 'lon': west+x*dx, 'x': x, 'y': y}


def clean(variable, v):
    v = float(v)
    if not math.isfinite(v):
        return None
    bounds = {'temperature_2m': (-100, 70), 'relative_humidity_2m': (0, 100),
              'cloud_cover': (0, 100), 'precipitation': (0, 3000),
              'wind_u_component_10m': (-200, 200), 'wind_v_component_10m': (-200, 200),
              'wind_speed_10m': (0, 200), 'wind_direction_10m': (0, 360), 'dust': (0, 100000)}
    bounds.update({**{f'cloud_cover_{level}': (0, 100) for level in ['low', 'mid', 'high']},
                   'cape': (0, 100000), 'visibility': (0, 1000000),
                   'wind_gusts_10m': (0, 200), 'weather_code': (0, 99)})
    a, b = bounds[variable]
    if not a <= v <= b or (variable == 'weather_code' and not v.is_integer()):
        raise ValueError('invalid_'+variable)
    return round(v, 5)


def variable_metadata(reader, meta, variable):
    # Per-variable file attributes are authoritative: e.g. CAMS dust has a
    # 3-hour axis even when the domain metadata lists an hourly union of times.
    unit = reader.get_child_by_name('unit').read_scalar()
    aliases = {'celsius': {'°C', 'celsius'}, 'ug/m3': {'μg/m³', 'µg/m³', 'ug/m3'},
               'degrees': {'°', 'degrees', '° (from north)'}}
    if unit not in aliases.get(UNITS[variable], {UNITS[variable]}):
        raise ValueError('unit_mismatch:'+variable+':'+str(unit))
    reference = float(reader.get_child_by_name('forecast_reference_time').read_scalar())
    if reference != stamp(meta['reference_time']).timestamp():
        raise ValueError('file_run_mismatch')
    epochs = reader.get_child_by_name('time')[:].reshape(-1).tolist()
    times = [dt.datetime.fromtimestamp(float(t), UTC) for t in epochs]
    allowed = {stamp(t) for t in meta['valid_times']}
    if len(times) != reader.shape[-1] or not times or any(t not in allowed for t in times) or any(b <= a for a, b in zip(times, times[1:])):
        raise ValueError('file_time_axis')
    wkt = reader.get_child_by_name('crs_wkt').read_scalar()
    return times, wkt


def read_variable(prefix, variable, meta, points, fs):
    from omfiles import OmFileReader
    result = []
    with OmFileReader.from_fsspec(fs, prefix+variable+'.om') as reader:
        times, wkt = variable_metadata(reader, meta, variable)
        for p in points:
            x, y, grid = coordinate(wkt, reader.shape, p)
            values = reader[y:y+1, x:x+1, :].reshape(-1).tolist()
            result.append({'grid': grid, 'times': [t.isoformat() for t in times],
                           'values': [clean(variable, v) for v in values], 'unit': UNITS[variable]})
    return result


def rain_day(times, values, run, start, end):
    """Native backward amounts; split only with explicit estimated flag."""
    covered, total, split, missing = 0, 0.0, False, False
    previous = run
    for t, value in zip(times, values):
        if t <= previous:
            # Lead-zero rainfall carries no accumulation interval.
            if t == previous:
                continue
            raise ValueError('non_monotonic_rain')
        overlap = max(0, (min(end, t)-max(start, previous)).total_seconds())
        if overlap:
            if value is None:
                missing = True
            else:
                width = (t-previous).total_seconds()
                covered += overlap
                total += value*overlap/width
                split |= overlap != width
        previous = t
    complete = not missing and covered == (end-start).total_seconds()
    return {'mm': round(total, 4) if complete else None, 'complete': complete,
            'coveredHours': round(covered/3600, 3), 'estimatedBoundary': split,
            'allocation': 'uniform-within-native-interval' if split else 'native-interval-sum'}


def model_collect(label, domain, period, now, budget):
    start, end = stamp(period['startAt']), stamp(period['endAt'])
    (meta, provenance, prefix), checked = choose_run(domain, end, now, budget)
    fs = Ranges(budget)
    fields = ['precipitation', 'temperature_2m', 'relative_humidity_2m', 'cloud_cover']
    fields += ['wind_speed_10m', 'wind_direction_10m'] if label == 'CMC' else ['wind_u_component_10m', 'wind_v_component_10m']
    missing = sorted(set(fields)-set(meta['variables']))
    if missing:
        raise ValueError('variables_missing:'+','.join(missing))
    data = {f: read_variable(prefix, f, meta, POINTS, fs) for f in fields}
    local = []
    run = stamp(meta['reference_time'])
    for i, p in enumerate(POINTS):
        rain = data['precipitation'][i]
        times = [stamp(t) for t in rain['times']]
        daily = []
        for day in range(7):
            a, b = start+dt.timedelta(days=day), start+dt.timedelta(days=day+1)
            temp = data['temperature_2m'][i]
            samples = [v for t, v in zip(temp['times'], temp['values']) if a <= stamp(t) < b]
            native = data['wind_speed_10m'][i] if label == 'CMC' else data['wind_u_component_10m'][i]
            if label != 'CMC' and native['times'] != data['wind_v_component_10m'][i]['times']:
                raise ValueError('wind_component_axis_mismatch')
            wind = []
            for j, t in enumerate(native['times']):
                if a <= stamp(t) < b:
                    if label == 'CMC':
                        speed = native['values'][j]
                    else:
                        u, v = native['values'][j], data['wind_v_component_10m'][i]['values'][j]
                        speed = math.hypot(u, v) if u is not None and v is not None else None
                    wind.append(speed*3.6 if speed is not None else None)
            valid_temp = bool(samples) and all(v is not None for v in samples)
            valid_wind = bool(wind) and all(v is not None for v in wind)
            daily.append({'date': a.astimezone(ADEN).date().isoformat(),
                          'rain': rain_day(times, rain['values'], run, a, b),
                          'sampledTemperatureMinC': min(samples) if valid_temp else None,
                          'sampledTemperatureMaxC': max(samples) if valid_temp else None,
                          'sampledWindMaxKmh': round(max(wind), 3) if valid_wind else None,
                          'rainProbabilityPercent': None})
        local.append({**p, 'daily': daily, 'series': {f: data[f][i] for f in fields}})
    return {'model': label, 'domain': domain, 'run': meta['reference_time'],
            'availableUntil': meta['valid_times'][-1], 'provenance': provenance,
            'runsChecked': checked, 'local': local,
            'completeRainWeek': all(d['rain']['complete'] for p in local for d in p['daily']),
            'estimatedDayBoundaries': any(d['rain']['estimatedBoundary'] for p in local for d in p['daily']),
            'rangeBytes': fs.bytes, 'rangeRequests': fs.requests}


def dust_collect(now, budget):
    start = now.replace(minute=0, second=0, microsecond=0)
    end = start+dt.timedelta(hours=48)
    (meta, provenance, prefix), checked = choose_run('cams_global', end, now, budget)
    if 'dust' not in meta['variables']:
        raise ValueError('dust_missing')
    fs = Ranges(budget)
    rows = read_variable(prefix, 'dust', meta, POINTS, fs)
    local = []
    for p, row in zip(POINTS, rows):
        # Retain native samples bracketing the requested 48 hours; do not
        # manufacture hourly dust values from 3-hour source data.
        pairs = list(zip(row['times'], row['values']))
        before = [(t, v) for t, v in pairs if stamp(t) <= start]
        after = [(t, v) for t, v in pairs if stamp(t) >= end]
        a = stamp(before[-1][0]) if before else start
        b = stamp(after[0][0]) if after else end
        values = [(t, v) for t, v in pairs if a <= stamp(t) <= b]
        times = [stamp(t) for t, _ in values]
        complete = bool(times) and times[0] <= start and times[-1] >= end and all(v is not None for _, v in values) and all(0 < (b-a).total_seconds() <= 3*3600 for a, b in zip(times, times[1:]))
        local.append({**p, 'grid': row['grid'], 'times': [t for t, _ in values],
                      'values': [v for _, v in values], 'unit': 'ug/m3',
                      'sampling': 'native; no hourly interpolation', 'complete48Hours': complete})
    return {'run': meta['reference_time'], 'startAt': start.isoformat(), 'endAt': end.isoformat(),
            'provenance': provenance, 'runsChecked': checked, 'local': local,
            'complete48Hours': all(p['complete48Hours'] for p in local),
            'rangeBytes': fs.bytes, 'rangeRequests': fs.requests}


def collect(now=None):
    now = (now or dt.datetime.now(UTC)).astimezone(UTC)
    budget, begin = Budget(), time.monotonic()
    result = {'schema': 'hada-open-data-local-v1', 'experimental': True, 'readyForSite': False,
              'startedAt': now.isoformat(), 'period': week(now), 'models': {}, 'errors': {},
              'source': 'Open-Meteo AWS Open Data / CC BY 4.0',
              'limitations': ['No elevation correction or spatial interpolation.',
                              'Daily rain boundary splits are estimates, explicitly flagged.',
                              'Temperature/wind extrema are sampled native values.',
                              'Deterministic rainfall is not a probability.',
                              'No AIFS ensemble adapter, regional map grid or live-site integration.']}
    with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
        jobs = {pool.submit(model_collect, label, domain, result['period'], now, budget): label
                for label, domain in MODELS.items()}
        jobs[pool.submit(dust_collect, now, budget)] = 'dust'
        for job in concurrent.futures.as_completed(jobs):
            label = jobs[job]
            try:
                value = job.result()
                if label == 'dust':
                    result['dust'] = value
                else:
                    result['models'][label] = value
            except Exception as e:
                result['errors'][label] = str(e)[:200]
    result['completeFourModelRainWeek'] = len(result['models']) == 4 and all(m['completeRainWeek'] for m in result['models'].values())
    result['finishedAt'] = dt.datetime.now(UTC).isoformat()
    result['elapsedSeconds'] = round(time.monotonic()-begin, 2)
    result['budget'] = {'reservedBytes': budget.bytes, 'requestAttempts': budget.requests,
                        'rangeBytes': sum(m['rangeBytes'] for m in result['models'].values())+result.get('dust', {}).get('rangeBytes', 0),
                        'maxBytes': budget.max_bytes, 'deadlineSeconds': 600}
    return result


def write_candidate(path, result):
    path = pathlib.Path(path)
    if path.name in {'latest.json', 'index.html'}:
        raise ValueError('candidate_path_required')
    path.parent.mkdir(parents=True, exist_ok=True)
    temp = path.with_suffix(path.suffix+'.tmp')
    temp.write_text(json.dumps(result, ensure_ascii=False, indent=2, allow_nan=False)+'\n')
    os.replace(temp, path)


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output', required=True, help='Experimental result path; cannot be latest.json')
    args = parser.parse_args()
    result = collect()
    write_candidate(args.output, result)
    print(json.dumps({'models': list(result['models']), 'errors': result['errors'],
                      'completeFourModelRainWeek': result['completeFourModelRainWeek'],
                      'dust48Hours': result.get('dust', {}).get('complete48Hours'),
                      'readyForSite': False, 'elapsedSeconds': result['elapsedSeconds'],
                      'budget': result['budget']}, ensure_ascii=False))
