// Self-check for the add-vehicle reveal helpers.
// Run: npx ts-node --compiler-options {\"module\":\"commonjs\"} lib/vehicles/reveal.check.ts
import assert from 'node:assert/strict';
import { derivePhase, formatPlate, gaugeFraction, gaugeScaleMax, isRtlText, titleCase } from './reveal';

// formatPlate
assert.equal(formatPlate('1234567'), '12-345-67');
assert.equal(formatPlate('12345678'), '123-45-678');
assert.equal(formatPlate('1234'), '1234');
assert.equal(formatPlate(''), '');
assert.equal(formatPlate('12-345 67'), '12-345-67'); // pasted with dashes and spaces
assert.equal(formatPlate('123 45-678 9'), '123-45-678'); // extra digits are cut at 8
assert.equal(formatPlate(formatPlate('12345678')), '123-45-678'); // idempotent on its own output

// titleCase: brand from translateBrandToEnglish + registry model in caps
assert.equal(titleCase('Mercedes-Benz GLC 43 AMG'), 'Mercedes-Benz GLC 43 AMG');
assert.equal(titleCase('MERCEDES-BENZ GLC 43 AMG'), 'Mercedes-Benz GLC 43 AMG');
assert.equal(titleCase('Toyota COROLLA'), 'Toyota Corolla');
assert.equal(titleCase('Hyundai TUCSON'), 'Hyundai Tucson');
assert.equal(titleCase('Kia EV6'), 'Kia EV6');
assert.equal(titleCase('BMW X5'), 'BMW X5');
assert.equal(titleCase('GLC 43 AMG 2024'), 'GLC 43 AMG 2024'); // the default vehicle name: model + year
assert.equal(titleCase('לא ידוע'), 'לא ידוע');

// derivePhase: every status
const p = (plate: string, status: Parameters<typeof derivePhase>[0]['status'], hasResult = false) => derivePhase({ plate, status, hasResult });
assert.equal(p('', 'idle'), 'idle');
assert.equal(p('12', 'idle'), 'typing');
assert.equal(p('12-345-67', 'idle'), 'typing');
assert.equal(p('12-345-67', 'searching'), 'searching');
assert.equal(p('12-345-67', 'found', true), 'found');
assert.equal(p('12-345-67', 'found', false), 'idle');
assert.equal(p('12-345-67', 'notfound'), 'notFound');
assert.equal(p('12-345-67', 'offline'), 'error');
assert.equal(p('12-345-67', 'duplicate'), 'duplicate');

// gaugeScaleMax / gaugeFraction
assert.equal(gaugeScaleMax(0), 20);
assert.equal(gaugeScaleMax(12), 20);
assert.equal(gaugeScaleMax(16.1), 25); // 20.1 -> 25
assert.equal(gaugeScaleMax(24), 30);
for (const v of [0.5, 6, 12, 16.1, 19, 40, 99]) assert.ok(gaugeFraction(v) <= 0.8, `needle pinned at ${v}`);
assert.equal(gaugeFraction(null), 0);
assert.equal(gaugeFraction(0), 0);
assert.equal(gaugeFraction(-3), 0);
assert.equal(gaugeFraction(NaN), 0);
assert.equal(gaugeFraction(Infinity), 0);

// isRtlText
assert.equal(isRtlText('Toyota RAV4 Hybrid'), false);
assert.equal(isRtlText('לא ידוע'), true);
assert.equal(isRtlText('2024 טויוטה'), true); // digits are weak, the first letter decides

console.log('reveal.check: ok');
