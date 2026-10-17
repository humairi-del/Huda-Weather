import datetime as dt
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch
import open_data_collect as c


class CollectorChecks(unittest.TestCase):
    def test_yemen_day_boundary(self):
        p = c.week(c.stamp('2026-10-17T21:30Z'))
        self.assertEqual(p['startAt'], '2026-10-19T00:00:00+03:00')
        self.assertEqual((c.stamp(p['endAt'])-c.stamp(p['startAt'])).total_seconds(), 168*3600)

    def test_timezone_required(self):
        with self.assertRaisesRegex(ValueError, 'timezone_required'):
            c.stamp('2026-10-17T12:00')

    def test_native_rain_is_not_reaccumulated(self):
        r = c.stamp('2026-10-17T00:00Z')
        times = [r+dt.timedelta(hours=i) for i in (1, 2, 3)]
        d = c.rain_day(times, [2, 1, 3], r, r, times[-1])
        self.assertEqual(d['mm'], 6)
        self.assertTrue(d['complete'])
        self.assertFalse(d['estimatedBoundary'])

    def test_split_rain_is_explicit_and_conserves_amount(self):
        r = c.stamp('2026-10-17T18:00Z')
        t, middle = r+dt.timedelta(hours=6), r+dt.timedelta(hours=3)
        a = c.rain_day([t], [12], r, r, middle)
        b = c.rain_day([t], [12], r, middle, t)
        self.assertEqual(a['mm']+b['mm'], 12)
        self.assertTrue(a['estimatedBoundary'])

    def test_missing_rain_is_never_zero(self):
        r = c.stamp('2026-10-17T00:00Z')
        d = c.rain_day([r+dt.timedelta(hours=1)], [None], r, r, r+dt.timedelta(hours=1))
        self.assertIsNone(d['mm'])
        self.assertFalse(d['complete'])

    def test_short_horizon_is_not_extended(self):
        r = c.stamp('2026-10-17T00:00Z')
        d = c.rain_day([r+dt.timedelta(hours=1)], [0], r, r, r+dt.timedelta(hours=2))
        self.assertIsNone(d['mm'])
        self.assertEqual(d['coveredHours'], 1)

    def test_lead_zero_has_no_rain_interval(self):
        r = c.stamp('2026-10-17T00:00Z')
        d = c.rain_day([r, r+dt.timedelta(hours=1)], [None, 4], r, r, r+dt.timedelta(hours=1))
        self.assertEqual(d['mm'], 4)

    def test_omitted_lead_zero_mapping(self):
        m = {'valid_times': ['2026-10-17T00:00Z', '2026-10-17T03:00Z']}
        self.assertEqual(c.align_axis(m, 1, 'precipitation'), [c.stamp(m['valid_times'][1])])
        with self.assertRaisesRegex(ValueError, 'time_axis_length'):
            c.align_axis(m, 1, 'temperature_2m')

    def test_nearest_grid_matches_probed_location(self):
        wkt = 'GEOGCRS["WGS 84",BBOX[-90,-180,90,179.75]]'
        x, y, grid = c.coordinate(wkt, (1441, 2879, 180), c.POINTS[0])
        self.assertEqual((x, y), (1818, 834))
        self.assertEqual((grid['lat'], grid['lon']), (14.25, 47.25))

    def test_projected_grid_is_rejected(self):
        with self.assertRaisesRegex(ValueError, 'unsupported_grid'):
            c.coordinate('PROJCRS["unknown"]', (10, 10, 10), c.POINTS[0])

    def test_nan_retains_missing_state(self):
        self.assertIsNone(c.clean('precipitation', float('nan')))

    def test_invalid_weather_value_is_rejected(self):
        for name, value in [('precipitation', -1), ('relative_humidity_2m', 101)]:
            with self.subTest(name=name), self.assertRaises(ValueError):
                c.clean(name, value)

    def test_budget_reserves_before_request(self):
        b = c.Budget(max_bytes=100, max_requests=1)
        b.reserve(80)
        with self.assertRaisesRegex(ValueError, 'download_budget'):
            b.reserve(1)

    def test_range_reuse_and_boundaries(self):
        raw = bytes(range(256))*600
        url = c.BASE+'data_run/test/file.om'
        fs = c.Ranges(c.Budget())
        fs.info[url] = (len(raw), 'test-etag')
        def request(path, budget, headers, cap):
            self.assertEqual(headers['If-Match'], 'test-etag')
            a, b = map(int, headers['Range'][6:].split('-'))
            return 206, {'Content-Range': f'bytes {a}-{b}/{len(raw)}'}, raw[a:b+1]
        with patch.object(c, 'request', request):
            self.assertEqual(fs.cat_file(url, 65530, 65548), raw[65530:65548])
            self.assertEqual(fs.cat_file(url, 65536, 65540), raw[65536:65540])
        self.assertEqual(fs.requests, 2)

    def test_ignored_ranges_are_rejected(self):
        url = c.BASE+'data_run/test/file.om'
        fs = c.Ranges(c.Budget())
        fs.info[url] = (10, 'tag')
        with patch.object(c, 'request', return_value=(200, {}, b'x'*10)):
            with self.assertRaisesRegex(ValueError, 'range_not_honored'):
                fs.cat_file(url, 0, 1)

    def test_older_longer_run_can_replace_short_latest(self):
        now = c.stamp('2026-10-17T05:00Z')
        def read(url, budget):
            if url.endswith('latest.json'):
                return {'completed': True, 'reference_time': '2026-10-16T18:00Z'}, {}
            run = '2026-10-16T12:00Z' if '/1200Z/' in url else '2026-10-16T18:00Z'
            end = '2026-10-31T12:00Z' if '/1200Z/' in url else '2026-10-22T18:00Z'
            return {'reference_time': run, 'created_at': '2026-10-17T01:00Z',
                    'valid_times': [run, end]}, {'url': url}
        with patch.object(c, 'read_meta', read):
            (m, _, _), checked = c.choose_run('ecmwf_ifs025', c.stamp('2026-10-24T21:00Z'), now, c.Budget())
        self.assertEqual(m['reference_time'], '2026-10-16T12:00Z')
        self.assertEqual(len(checked), 2)

    def test_no_output_can_overwrite_latest(self):
        with tempfile.TemporaryDirectory() as d:
            p = Path(d)/'latest.json'
            p.write_text('last-good')
            with self.assertRaisesRegex(ValueError, 'candidate_path_required'):
                c.write_candidate(p, {'readyForSite': False})
            self.assertEqual(p.read_text(), 'last-good')

    def test_output_has_no_nonstandard_nan(self):
        with tempfile.TemporaryDirectory() as d:
            p = Path(d)/'candidate.json'
            c.write_candidate(p, {'rain': None, 'readyForSite': False})
            self.assertIn('null', p.read_text())
            self.assertFalse(p.with_suffix('.json.tmp').exists())


if __name__ == '__main__':
    unittest.main()
