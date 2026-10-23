// Run: npx ts-node --compiler-options {\"module\":\"commonjs\"} lib/calc/check/history.ts
import assert from 'node:assert';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { addRoute, isDuplicateTrip, MAX_ROUTES, nextId, saveTrip, type SavedRoute } from '../history';
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

assert.equal(nextId([], T), String(T));
assert.equal(nextId([rec({ id: String(T) })], T), String(T + 1), 'same millisecond -> next id');
assert.equal(nextId([rec({ id: String(T + 5) }), rec({ id: 'old-x' })], T), String(T + 6), 'non-numeric ids are ignored');

// saveTrip against an in-memory AsyncStorage
(async () => {
  const mem = new Map<string, string>();
  Object.assign(AsyncStorage, {
    getItem: async (k: string) => mem.get(k) ?? null,
    setItem: async (k: string, v: string) => void mem.set(k, v),
  });
  const stored = () => JSON.parse(mem.get('tripHistory')!) as TripRecord[];

  assert.equal(await saveTrip(rec({ id: String(T) })), 'saved');
  assert.equal(await saveTrip(rec({ id: String(T) })), 'duplicate', 'double tap -> one trip');
  assert.equal(stored().length, 1);
  assert.equal(await saveTrip(rec({ id: String(T), distance: 80 })), 'saved', 'another trip in the same millisecond');
  const ids = stored().map((t) => t.id);
  assert.deepEqual(ids, [String(T), String(T + 1)], 'two saves in the same millisecond -> two distinct ids');

  console.log('history checks passed');
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
