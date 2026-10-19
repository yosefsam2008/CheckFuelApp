// Self-check for the trip cost formula and polyline decoder.
// Run: npx ts-node --transpile-only -O "{\"module\":\"commonjs\",\"moduleResolution\":\"node\",\"customConditions\":null}" lib/tripCost.check.ts
/* eslint-disable @typescript-eslint/no-require-imports */
import assert from 'node:assert/strict';

// the formula module imports AsyncStorage for an unrelated logger; stub it so node can load it
require.cache[require.resolve('@react-native-async-storage/async-storage')] = { exports: { default: {} } } as NodeModule;

const { calculateAdjustedConsumption, calculateVehicleAge } = require('./data/fuelConsumptionAdjustments');
const { computeTrip, DEFAULT_PREFS, priceFor } = require('./tripCost') as typeof import('./tripCost');
const { decodePolyline } = require('./route') as typeof import('./route');

const close = (a: number, b: number) => assert.ok(Math.abs(a - b) < 1e-9, `${a} != ${b}`);
const year = new Date().getFullYear() - 5;
const car = { id: '1', name: 'c', model: 'm', engine: 'e', fueltype: 'Gasoline', avgConsumption: 15, year };

// base trip: formula output (normal/mixed, no AC) times the AC multiplier
const adj = calculateAdjustedConsumption(15, {
  vehicleAge: calculateVehicleAge(year), fuelType: 'Gasoline', drivingStyle: 'normal', climate: 'hot',
  tripType: 'mixed', vehicleCondition: 'good', useAC: false, shortTrips: false,
}).adjustedConsumption;
const r = computeTrip(car, 120, 8.25, DEFAULT_PREFS);
close(r.fuelConsumed, (120 / adj) * 1.04);
close(r.totalCost, r.fuelConsumed * 8.25);
close(r.costPerKm, r.totalCost / 120);
close(r.consumption, 120 / r.fuelConsumed);
assert.equal(r.energyType, 'fuel');

// modes: eco -7%, sport +12%, AC off removes the 4%
const at = (p: Partial<typeof DEFAULT_PREFS>) => computeTrip(car, 100, 1, { ...DEFAULT_PREFS, ...p }).totalCost;
close(at({ mode: 'eco' }) / at({}), 0.93);
close(at({ mode: 'sport' }) / at({}), 1.12);
close(at({ ac: false }) / at({}), 1 / 1.04);

// electric: avg is kWh/km, formula runs on kWh/100km
const ev = { ...car, fueltype: 'Electric', avgConsumption: 0.15 };
const e = computeTrip(ev, 100, 0.6, DEFAULT_PREFS);
assert.equal(e.energyType, 'electricity');
close(e.fuelConsumed, e.consumption * 100);
close(e.totalCost, e.fuelConsumed * 0.6);

const prices = { Gasoline: 8, Diesel: 10, Electric: 0.6 };
assert.equal(priceFor(car, prices), 8);
assert.equal(priceFor({ ...car, fueltype: 'Diesel' }, prices), 10);
assert.equal(priceFor({ ...car, type: 'Truck' }, prices), 10);
assert.equal(priceFor(ev, prices), 0.6);

// Google's reference polyline
assert.deepEqual(decodePolyline('_p~iF~ps|U_ulLnnqC_mqNvxq`@'), [[38.5, -120.2], [40.7, -120.95], [43.252, -126.453]]);

console.log('tripCost checks passed');
