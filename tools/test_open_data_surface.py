import datetime as dt
import unittest
from open_data_collect import stamp, clean, UNITS
from open_data_surface import sample_at, window_series, wind_series


class SurfaceChecks(unittest.TestCase):
    def setUp(self):
        self.start = stamp('2026-10-17T09:00Z')

    def series(self, hours, values):
        return {'times': [(self.start+dt.timedelta(hours=h)).isoformat() for h in hours],
                'values': values, 'unit': '%', 'grid': {'lat': 14.25, 'lon': 47.25}}

    def test_future_sample_never_becomes_current(self):
        self.assertIsNone(sample_at(self.series([1], [60]), self.start))

    def test_missing_latest_does_not_reuse_old_good_value(self):
        self.assertIsNone(sample_at(self.series([-1, 0], [60, None]), self.start))

    def test_old_sample_and_valid_zero(self):
        self.assertIsNone(sample_at(self.series([-4], [60]), self.start))
        r = sample_at(self.series([0], [0]), self.start)
        self.assertEqual(r['value'], 0)
        self.assertFalse(r['observation'])

    def test_48h_brackets_are_not_interpolated(self):
        source = self.series([-2, 1, 4, 46, 49, 52], [1, 2, 3, 4, 5, 6])
        r = window_series(source, self.start, self.start+dt.timedelta(hours=48))
        self.assertEqual(r['values'], [1, 2, 3, 4, 5])
        self.assertTrue(r['complete48Hours'])
        self.assertEqual(r['grid'], source['grid'])

    def test_missing_or_short_series_is_incomplete(self):
        for source in [self.series([0, 48], [0, None]), self.series([0, 47], [0, 0])]:
            self.assertFalse(window_series(source, self.start, self.start+dt.timedelta(hours=48))['complete48Hours'])

    def test_malformed_axes_rejected(self):
        for source in [self.series([0, 0], [1, 2]), self.series([1, 0], [1, 2]), self.series([0], [])]:
            with self.assertRaises(ValueError):
                window_series(source, self.start, self.start+dt.timedelta(hours=48))

    def test_units_and_bounds_for_extended_fields(self):
        self.assertEqual(UNITS['visibility'], 'm')
        self.assertEqual(UNITS['wind_gusts_10m'], 'm/s')
        self.assertEqual(clean('cape', 0), 0)
        for field, v in [('visibility', -1), ('cape', -1), ('cloud_cover_low', 101), ('wind_gusts_10m', -1), ('weather_code', 3.5)]:
            with self.subTest(field=field), self.assertRaises(ValueError):
                clean(field, v)

    def test_wind_direction_and_missing_components(self):
        u = self.series([0, 1, 2], [0, 0, None]);u['unit'] = 'm/s'
        v = self.series([0, 1, 2], [-2, 0, 2]);v['unit'] = 'm/s'
        speed, direction = wind_series(u, v)
        self.assertEqual(speed['values'], [2, 0, None])
        self.assertEqual(direction['values'], [0, None, None])
        v['grid'] = {'lat': 15, 'lon': 47}
        with self.assertRaisesRegex(ValueError, 'wind_mismatch'):
            wind_series(u, v)


if __name__ == '__main__':
    unittest.main()
