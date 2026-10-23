// Run: npx ts-node --compiler-options {\"module\":\"commonjs\"} lib/format.check.ts
import assert from 'node:assert';
import { formatMoney, formatShareMoney } from './format';

const iso = (s: string) => `⁦${s}⁩`;

assert.equal(formatMoney(0, { decimals: 0 }), iso('₪0'));
assert.equal(formatMoney(0), iso('₪0.00'));
assert.equal(formatMoney(0.5), iso('₪0.50'));
assert.equal(formatMoney(105, { decimals: 0 }), iso('₪105'));
assert.equal(formatMoney(105.49, { decimals: 0 }), iso('₪105'), 'decimals 0 rounds');
assert.equal(formatMoney(30.75, { decimals: 2 }), iso('₪30.75'));
assert.equal(formatMoney(1234.5), iso('₪1,234.50'));
assert.equal(formatMoney(1234.5, { decimals: 0, isolate: false }), '₪1,235', 'SVG form: no isolate marks');
// deltas: callers pass the absolute value and draw the arrow themselves
assert.equal(formatMoney(Math.abs(-18), { decimals: 0 }), iso('₪18'));
assert.equal(formatShareMoney(100, 3), iso('₪33.5'));
assert.equal(formatShareMoney(66, 2), iso('₪33'));

console.log('format checks passed');
