import copy
import datetime as dt
import unittest
import open_data_aifs as a
import open_data_map as m
import open_data_aifs_map as am
from open_data_collect import stamp, week


class AifsChecks(unittest.TestCase):
    def test_all_members_required(self):
        with self.assertRaisesRegex(ValueError, 'incomplete_ensemble'):
            a.probability([1]*50)

    def test_missing_member_is_not_dropped(self):
        with self.assertRaisesRegex(ValueError, 'incomplete_ensemble'):
            a.probability([1]*50+[None])

    def test_strict_threshold_and_denominator(self):
        self.assertEqual(a.probability([0.1]*50+[0.100001]), round(100/51, 5))

    def test_rate_becomes_mm_and_day_split_is_estimated(self):
        start = stamp('2026-10-17T21:00Z')
        times = [stamp('2026-10-17T18:00Z')+dt.timedelta(hours=h) for h in [0, 6, 12, 18, 24, 30]]
        value, estimated = a.day_amount(times, [None]+[1/3600]*5, start, start+dt.timedelta(days=1))
        self.assertAlmostEqual(value, 24)
        self.assertTrue(estimated)

    def test_amount_is_not_rounded_before_probability(self):
        start = stamp('2026-10-17T00:00Z')
        value, _ = a.day_amount([start, start+dt.timedelta(hours=6)], [None, 0.100001/21600], start, start+dt.timedelta(hours=6))
        self.assertGreater(value, 0.1)

    def test_missing_overlap_rejects_day(self):
        start = stamp('2026-10-17T00:00Z')
        with self.assertRaisesRegex(ValueError, 'missing_rain_member'):
            a.day_amount([start, start+dt.timedelta(hours=6)], [None, None], start, start+dt.timedelta(hours=6))

    def test_short_horizon_rejected(self):
        run = stamp('2026-10-17T00:00Z')
        values = [[0.0]*51 for _ in range(2)]
        with self.assertRaisesRegex(ValueError, 'incomplete_week'):
            a.summary(run, [0, 21600], values, values, values, values, week(run))

    def test_full_ensemble_fixture_uses_daily_definition(self):
        run = stamp('2026-10-17T00:00Z')
        leads = list(range(0, 9*86400+1, 21600))
        rain = [[None]*51]+[[0.1/3600]*51 for _ in leads[1:]]
        temp = [[20.0]*51 for _ in leads]
        u = [[1.0]*51 for _ in leads]
        v = [[0.0]*51 for _ in leads]
        out = a.summary(run, leads, rain, temp, u, v, week(run))
        self.assertEqual(len(out['daily']), 7)
        self.assertEqual(out['daily'][0]['ensembleMeanRainMm'], 2.4)
        self.assertEqual(out['daily'][0]['dailyRainProbabilityAbove0_1mmPercent'], 100)
        self.assertEqual(out['daily'][0]['meanMemberSampledWindMaxKmh'], 3.6)
        self.assertTrue(out['notEquivalentToCurrentHourlyProbability'])


class RegionalChecks(unittest.TestCase):
    def test_grid_has_428_ordered_points(self):
        p = m.points()
        self.assertEqual(len(p), 428)
        self.assertEqual(p[0], {'lat': 21, 'lon': 42})
        self.assertEqual(p[424], {'lat': 9, 'lon': 60})
        self.assertEqual(p[-1]['name'], 'هدى')

    def test_incomplete_model_is_excluded_not_zero(self):
        def source(complete, value):
            return {'points': [{'complete': complete, 'daily': [value]*7,
                                'coveredHours': [24]*6+[15], 'estimatedDayBoundaries': False}]}
        models = {'ECMWF': source(True, 1), 'GFS': source(True, 2),
                  'CMC': source(True, 3), 'ICON': source(False, None)}
        cell = m.aggregate_point(models, 0)
        self.assertEqual(cell['count'], 3)
        self.assertEqual(cell['value'], 14)
        self.assertNotIn('icon_global', cell['totals'])
        self.assertIn('icon_global', cell['excludedModels'])

    def test_two_models_do_not_make_a_consensus(self):
        row = {'complete': True, 'daily': [1]*7, 'coveredHours': [24]*7, 'estimatedDayBoundaries': False}
        cell = m.aggregate_point({'ECMWF': {'points': [row]}, 'GFS': {'points': [row]}}, 0)
        self.assertIsNone(cell['value'])

    def test_polygon_holes_and_multiple_parts(self):
        outer = [[0,0],[4,0],[4,4],[0,4],[0,0]]
        hole = [[1,1],[2,1],[2,2],[1,2],[1,1]]
        geo = {'type': 'MultiPolygon', 'coordinates': [[outer, hole]]}
        self.assertTrue(m.inside_geometry(3,3,geo))
        self.assertFalse(m.inside_geometry(1.5,1.5,geo))
        self.assertFalse(m.inside_geometry(9,9,geo))


class EnsembleMapChecks(unittest.TestCase):
    def fixture(self):
        period = {'startAt': '2026-10-18T00:00:00+03:00',
                  'endAt': '2026-10-25T00:00:00+03:00', 'hours': 168}
        def row(complete, amount):
            return {'complete': complete, 'daily': [amount]*7,
                    'coveredHours': [24]*6+[24 if complete else 15],
                    'estimatedDayBoundaries': False}
        models = {key: {'points': [row(True, value)]*428}
                  for key, value in [('ECMWF', 1), ('GFS', 2), ('CMC', 3)]}
        models['ICON'] = {'points': [row(False, None)]*428}
        base = {'period': period, 'modelReadResults': models}
        aifs = {'period': period.copy(), 'members': 51, 'points': [row(True, 100)]*428,
                'transferMetrics': {}}
        geometry = {'type': 'Polygon', 'coordinates': [[[0,0],[70,0],[70,50],[0,50],[0,0]]]}
        return base, aifs, geometry

    def test_51_members_count_as_one_model(self):
        base, aifs, geometry = self.fixture()
        result = am.combine(base, aifs, geometry)
        self.assertEqual(result['cells'][0]['value'], 17.5)
        self.assertEqual(result['cells'][0]['count'], 4)
        self.assertEqual(result['minimumCompleteModelCount'], 4)
        self.assertFalse(result['completeGridFourModels'])  # original deterministic four
        self.assertFalse(result['completeGridFiveModels'])
        self.assertTrue(result['completeGridAtLeastFourModels'])

    def test_ensemble_map_period_must_match(self):
        base, aifs, geometry = self.fixture()
        aifs['period']['endAt'] = '2026-10-26T00:00:00+03:00'
        with self.assertRaisesRegex(ValueError, 'period_mismatch'):
            am.combine(base, aifs, geometry)

    def test_map_ensemble_cannot_drop_members(self):
        base, aifs, geometry = self.fixture()
        aifs['members'] = 50
        with self.assertRaisesRegex(ValueError, 'regional_ensemble_shape'):
            am.combine(base, aifs, geometry)


if __name__ == '__main__':
    unittest.main()
