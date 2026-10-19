// Run: npx ts-node --compiler-options {\"module\":\"commonjs\"} lib/calc/check/history.ts
import assert from 'node:assert';
import { addRoute, isDuplicateTrip, MAX_ROUTES, type SavedRoute } from '../history';
import type { TripRecord } from '../../../types/trip';

const T = 1_700_000_000_000;
const rec = (o: Partial<TripRecord> = {}): TripRecord => ({
  id: '1', date: '', timestamp: T, distance: 63, vehicleName: 'Mazda', vehicleModel: '3', fuelType: 'Gasoline',
  totalCost: 35.2, fuelConsumed: 5, costPerKm: 0.5, consumption: 20, energyType: 'fuel', ...o,
});

assert.equal(isDuplicateTrip(undefined, rec()), false);
assert.equal(isDuplicateTrip(rec(), rec({ timestamp: T + 9 * 60_000, totalCost: 35.4 })), true, 'same trip, rounded cost equal, <10 min');
assert.equal(isDuplicateTrip(rec(), rec({ timestamp: T + 10 * 60_000 })), false, '10 min = new trip');
assert.equal(isDuplicateTrip(rec(), rec({ distance: 64 })), false);
assert.equal(isDuplicateTrip(rec(), rec({ totalCost: 36.6 })), false, 'different rounded cost');
assert.equal(isDuplicateTrip(rec(), rec({ vehicleModel: '6' })), false);

let r: SavedRoute[] = [];
r = addRoute(r, ' עבודה ', 18);
assert.deepEqual(r.map((x) => [x.label, x.km]), [['עבודה', 18]]);
assert.equal(addRoute(r, 'שוב', 18), r, 'same km is not saved twice');
assert.equal(addRoute(r, '', 25)[1].label, '25', 'empty name falls back to the km');
for (let i = 0; i < 20; i++) r = addRoute(r, 'x', 100 + i);
assert.equal(r.length, MAX_ROUTES, 'max 10 saved destinations');

console.log('history checks passed');
