// Run: npx ts-node --compiler-options {\"module\":\"commonjs\"} lib/calc/check/monthly.ts
import assert from 'node:assert';
import { dayLabel, lastMonths, monthKey, monthSummary, tripTime } from '../monthly';
import type { TripRecord } from '../../../types/trip';

const at = (y: number, m: number, d: number, h = 12, min = 0) => new Date(y, m - 1, d, h, min).getTime();
const rec = (ts: number, cost: number, o: Partial<TripRecord> = {}): TripRecord => ({
  id: String(ts), date: 'ignored', timestamp: ts, distance: 10, vehicleName: 'Mazda', vehicleModel: '3',
  fuelType: 'Gasoline', totalCost: cost, fuelConsumed: 1, costPerKm: 1, consumption: 15, energyType: 'fuel', ...o,
});

// month boundaries
const oct = monthKey(at(2026, 10, 15));
assert.equal(monthKey(at(2026, 10, 31, 23, 59)), oct, '23:59 on the last day is still October');
assert.equal(monthKey(at(2026, 11, 1, 0, 0)), oct + 1, '00:00 on the 1st is the next month');
const edge = [rec(at(2026, 10, 31, 23, 59), 5), rec(at(2026, 11, 1, 0, 0), 7)];
assert.equal(monthSummary(edge, oct, at(2026, 11, 20)).total, 5);
assert.equal(monthSummary(edge, oct + 1, at(2026, 11, 20)).total, 7);

// January -> December year boundary
const yr = [rec(at(2025, 12, 10), 100), rec(at(2026, 1, 10), 150)];
const jan = monthSummary(yr, monthKey(at(2026, 1, 10)), at(2026, 1, 20));
assert.equal(jan.deltaPct, 50);

// records without timestamp fall back to Number(id), and `date` is never read
const legacy = rec(0, 20, { id: String(at(2026, 10, 3)), timestamp: undefined as unknown as number, date: '1/1/1999' });
assert.equal(tripTime(legacy), at(2026, 10, 3));
assert.equal(monthSummary([legacy], oct, at(2026, 10, 20)).count, 1);

// Feb 29 2028 (leap year): in February, and day 29 of 29 projects to its own total
const feb = monthKey(at(2028, 2, 29));
assert.equal(feb, monthKey(at(2028, 2, 1)));
assert.notEqual(feb, monthKey(at(2028, 3, 1)));
assert.equal(monthSummary([rec(at(2028, 2, 29), 290)], feb, at(2028, 2, 29)).projection, 290);
// day 14 of 29: 140 / 14 * 29 = 290
assert.equal(monthSummary([rec(at(2028, 2, 5), 140)], feb, at(2028, 2, 14)).projection, 290);

// projection: null on day 6, set on day 7 (rounded to 10), null for past months
const t = [rec(at(2026, 10, 2), 70)];
assert.equal(monthSummary(t, oct, at(2026, 10, 6)).projection, null);
assert.equal(monthSummary(t, oct, at(2026, 10, 7)).projection, 310); // 70/7*31
assert.equal(monthSummary(t, oct, at(2026, 11, 20)).projection, null);

// deltaPct null when the previous month is 0
assert.equal(monthSummary(t, oct, at(2026, 10, 20)).deltaPct, null);

// order, km, lastMonths (oldest first, 6 entries, gaps are 0)
const many = [rec(at(2026, 10, 1), 10), rec(at(2026, 10, 9), 20), rec(at(2026, 5, 9), 30)];
assert.deepEqual(monthSummary(many, oct, at(2026, 10, 20)).trips.map((x) => x.totalCost), [20, 10]);
assert.equal(monthSummary(many, oct, at(2026, 10, 20)).km, 20);
const lm = lastMonths(many, at(2026, 10, 20));
assert.equal(lm.length, 6);
assert.equal(lm[5].key, oct);
assert.deepEqual(lm.map((m) => m.total), [30, 0, 0, 0, 0, 30]);
assert.equal(lastMonths(yr, at(2026, 1, 20))[0].key, monthKey(at(2025, 8, 1)), 'crosses the year boundary');

// dayLabel
const now = at(2026, 10, 19, 15, 0);
assert.equal(dayLabel(at(2026, 10, 19, 10, 1), now), 'היום · 10:01');
assert.equal(dayLabel(at(2026, 10, 18, 8, 40), now), 'אתמול · 08:40');
assert.equal(dayLabel(at(2026, 10, 12, 18, 22), now), '12.10 · 18:22');
assert.equal(dayLabel(at(2026, 10, 18, 23, 59), at(2026, 10, 19, 0, 1)), 'אתמול · 23:59');

console.log('monthly checks passed');
