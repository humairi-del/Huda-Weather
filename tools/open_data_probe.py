"""Read-only feasibility probe, never used by the site or a scheduler.

Install omfiles==1.2.0 and numpy in an isolated environment before running.
Reads only public Open-Meteo AWS files, not the non-commercial Free API.
Output is a native grid sample, without elevation/downscaling corrections.
"""
import datetime as dt
import hashlib
import json
import math
import re
import time
import urllib.request
from omfiles import OmFileReader

BASE = 'https://openmeteo.s3.amazonaws.com/'
LAT, LON = 14.230586, 47.199415


class BoundedRanges:
    """Cache aligned blocks so hierarchical metadata needs few round trips."""
    def __init__(self):
        self.blocks = {}
        self.lengths = {}
        self.bytes = 0
        self.requests = 0

    def size(self, path):
        if not path.startswith(BASE + 'data_spatial/'):
            raise ValueError('unexpected source')
        if path not in self.lengths:
            with urllib.request.urlopen(urllib.request.Request(path, method='HEAD'), timeout=25) as r:
                self.lengths[path] = int(r.headers['Content-Length'])
        return self.lengths[path]

    def cat_file(self, path, start=None, end=None):
        size = self.size(path)
        start = 0 if start is None else start
        end = size if end is None else min(end, size)
        if not 0 <= start <= end <= size or end-start > 2*1024*1024:
            raise ValueError('invalid or excessive read')
        result = bytearray()
        for offset in range(start//65536*65536, end, 65536):
            key = (path, offset)
            if key not in self.blocks:
                if self.requests >= 128:
                    raise ValueError('probe download budget exceeded')
                stop = min(offset+65536, size)
                req = urllib.request.Request(path, headers={'Range': f'bytes={offset}-{stop-1}'})
                with urllib.request.urlopen(req, timeout=25) as r:
                    if r.status != 206:
                        raise ValueError('range request not honored')
                    b = r.read(stop-offset+1)
                    if len(b) != stop-offset:
                        raise ValueError('incomplete range')
                self.blocks[key] = b
                self.bytes += len(b)
                self.requests += 1
            b = self.blocks[key]
            result.extend(b[max(start-offset, 0):min(end-offset, len(b))])
        return bytes(result)


def metadata(model):
    url = BASE + 'data_spatial/' + model + '/latest.json'
    with urllib.request.urlopen(url, timeout=25) as r:
        raw = r.read(262145)
    if len(raw) > 262144:
        raise ValueError('metadata too large')
    m = json.loads(raw)
    return m, {'model': model, 'url': url, 'sha256': hashlib.sha256(raw).hexdigest(),
               'completed': m['completed'], 'run': m['reference_time'],
               'first': m['valid_times'][0], 'last': m['valid_times'][-1],
               'variables': m['variables']}


def probe():
    begin = time.monotonic()
    manifest = {'checkedAt': dt.datetime.now(dt.timezone.utc).isoformat(),
                'evaluationOnly': True, 'point': {'lat': LAT, 'lon': LON},
                'metadata': [], 'errors': [], 'sample': None}
    source = None
    for model in ['dwd_icon', 'ecmwf_ifs025', 'ncep_gfs013',
                  'cmc_gem_gdps_15km', 'cams_global', 'ecmwf_aifs025_ensemble']:
        try:
            m, record = metadata(model)
            manifest['metadata'].append(record)
            if model == 'dwd_icon':
                source = m
        except Exception as e:
            manifest['errors'].append({'model': model, 'error': str(e)})
    if source:
        try:
            if not source['completed']:
                raise ValueError('incomplete run')
            run = dt.datetime.fromisoformat(source['reference_time'].replace('Z', '+00:00'))
            now = dt.datetime.now(dt.timezone.utc)
            valid = next(t for t in source['valid_times']
                         if dt.datetime.fromisoformat(t.replace('Z', '+00:00')) >= now)
            url = BASE + 'data_spatial/dwd_icon/' + run.strftime('%Y/%m/%d/%H%MZ/') + valid.replace(':', '').removesuffix('Z') + '.om'
            bounds = re.search(r'BBOX\[([^]]+)\]', source['crs_wkt'])
            south, west, north, east = map(float, bounds.group(1).split(','))
            fs = BoundedRanges()
            with OmFileReader.from_fsspec(fs, url) as root:
                values, grid = {}, None
                for name in ['temperature_2m', 'relative_humidity_2m', 'precipitation']:
                    a = root.get_child_by_name(name)
                    ny, nx = a.shape
                    dy, dx = (north-south)/(ny-1), (east-west)/(nx-1)
                    y, x = round((LAT-south)/dy), round((LON-west)/dx)
                    v = float(a[y:y+1, x:x+1][0, 0])
                    if not math.isfinite(v):
                        raise ValueError('missing sample ' + name)
                    values[name] = v
                    grid = {'shape': [ny, nx], 'x': x, 'y': y,
                            'lat': south+y*dy, 'lon': west+x*dx}
            manifest['sample'] = {'url': url, 'run': source['reference_time'],
                                  'validTime': valid, 'grid': grid, 'values': values,
                                  'rangeBytes': fs.bytes, 'rangeRequests': fs.requests,
                                  'note': 'Native grid values; not corrected for elevation. No full-week validation.'}
        except Exception as e:
            manifest['errors'].append({'sample': str(e)})
    manifest['elapsedSeconds'] = round(time.monotonic()-begin, 2)
    return manifest


if __name__ == '__main__':
    print(json.dumps(probe(), ensure_ascii=False, indent=2))
