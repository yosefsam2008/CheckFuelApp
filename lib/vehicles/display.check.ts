// Run: npx ts-node --compiler-options {\"module\":\"commonjs\"} lib/vehicles/display.check.ts
import assert from 'node:assert';
import { cleanModel, costPer100, formatPlate, shownConsumption, titleCase, vehicleLabels } from './display';

const P = { Gasoline: 8, Diesel: 10, Electric: 0.5 };

assert.equal(formatPlate('1234567'), '12-345-67');
assert.equal(formatPlate('12345678'), '123-45-678');
assert.equal(formatPlate('12-345-67'), '12-345-67');
assert.equal(formatPlate('123456'), '123456');
assert.equal(formatPlate('AB12345'), 'AB12345');
assert.equal(formatPlate(''), '');
assert.equal(titleCase('MERCEDES-BENZ'), 'Mercedes-Benz');
assert.equal(titleCase('toyota'), 'Toyota');
assert.equal(titleCase('LAND ROVER'), 'Land Rover');
assert.equal(costPer100({ avgConsumption: 16, fueltype: 'Gasoline', type: 'car' }, P), 50);
assert.equal(costPer100({ avgConsumption: 20, fueltype: 'Diesel', type: 'car' }, P), 50);
assert.equal(costPer100({ avgConsumption: 0.15, fueltype: 'Electric', type: 'car' }, P), 7.5);
assert.equal(costPer100({ avgConsumption: 0.15, fueltype: 'PHEV', type: 'car' }, P), null);
assert.equal(costPer100({ fueltype: 'Gasoline', type: 'car' }, P), null);
assert.equal(shownConsumption({ avgConsumption: 0.155, fueltype: 'Electric' }), 15.5);
console.log('display ok');
assert.equal(cleanModel('COROLLA HSD SDN'), 'Corolla HSD SDN');
assert.equal(cleanModel('GLC 43 AMG 2024'), 'GLC 43 AMG');
assert.equal(cleanModel('Tucson'), 'Tucson');
assert.deepEqual(vehicleLabels({ name: 'Tucson 2021', brand: 'HYUNDAI', model: 'TUCSON', year: 2021 }), { title: 'Tucson', brand: 'Hyundai', subline: 'Hyundai · 2021' });
assert.deepEqual(vehicleLabels({ name: 'Hyundai', brand: 'Hyundai', model: 'Tucson', year: 2021 }), { title: 'Tucson', brand: 'Hyundai', subline: 'Hyundai · 2021' });
assert.deepEqual(vehicleLabels({ name: 'הרכב של אמא', brand: 'TOYOTA', model: 'COROLLA HSD SDN', year: 2019 }), { title: 'הרכב של אמא', brand: 'Toyota', subline: 'Toyota · Corolla HSD SDN · 2019' });
assert.deepEqual(vehicleLabels({ name: 'Mazda', brand: 'Mazda', model: '', year: undefined }), { title: 'Mazda', brand: '', subline: '' });
console.log('labels ok');
