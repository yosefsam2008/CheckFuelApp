// Run: npx ts-node --compiler-options {\"module\":\"commonjs\"} lib/calc/check/defaultVehicle.ts
import assert from 'node:assert';
import { defaultVehicle } from '../defaultVehicle';

const vs = [{ id: 'a', name: 'Mazda', model: '3' }, { id: 'b', name: 'Kia', model: 'Niro' }, { id: 'c', name: 'Seat', model: 'Ibiza' }];
const trip = (t: number, n: string, m: string) => ({ timestamp: t, vehicleName: n, vehicleModel: m });

assert.equal(defaultVehicle([], [], 'a'), null);
assert.equal(defaultVehicle(vs, [], 'c')?.id, 'c', 'last chosen wins');
assert.equal(defaultVehicle(vs, [trip(1, 'Mazda', '3')], 'zzz')?.id, 'a', 'unknown last id falls through');
assert.equal(defaultVehicle(vs, [trip(1, 'Mazda', '3'), trip(5, 'Kia', 'Niro'), trip(3, 'Seat', 'Ibiza')], null)?.id, 'b', 'most recent trip');
assert.equal(defaultVehicle(vs, [trip(9, 'Gone', 'Car')], null)?.id, 'a', 'trip of a deleted vehicle -> first');
assert.equal(defaultVehicle(vs, [], undefined)?.id, 'a');
console.log('defaultVehicle checks passed');
