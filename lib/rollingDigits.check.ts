// Run: npx ts-node --compiler-options {\"module\":\"commonjs\"} lib/rollingDigits.check.ts
import assert from 'node:assert';
import { centerRow, digitAt, glyphs, rollTarget } from './rollingDigits';

// up: 3 -> 7 is 4 rows; 7 -> 2 wraps forward through 9, 0
assert.equal(rollTarget(13, 7, 1), 17);
assert.equal(rollTarget(17, 2, 1), 22);
// down: 7 -> 2 is 5 rows back; 2 -> 7 wraps back through 0, 9
assert.equal(rollTarget(17, 2, -1), 12);
assert.equal(rollTarget(12, 7, -1), 7);
// same digit: no move
assert.equal(rollTarget(15, 5, 1), 15);
assert.equal(rollTarget(15, 5, -1), 15);
// mid-roll (row 14.5) heading for 9 keeps going the same way
assert.equal(rollTarget(14.5, 9, 1), 19);
assert.equal(rollTarget(14.5, 9, -1), 9);
// after centering, any roll stays within rows 0-29
for (let p = 0; p < 30; p += 0.5) for (let d = 0; d < 10; d++) for (const dir of [1, -1] as const) {
  const t = rollTarget(centerRow(p), d, dir);
  assert.ok(t >= 0 && t < 30, `${p} ${d} ${dir}`);
  assert.equal(((t % 10) + 10) % 10, d);
}
assert.equal(centerRow(22.0000001), 12);
assert.equal(centerRow(3), 13);

assert.equal(digitAt(7.12, -2), 2);
assert.equal(digitAt(7.12, -1), 1);
assert.equal(digitAt(7.12, 0), 7);
assert.equal(digitAt(0.29, -2), 9);
assert.equal(digitAt(1234, 2), 2);
assert.equal(digitAt(5, 1), 0);

const g = glyphs('1,234.5');
assert.deepEqual(g.map((x) => x.key), ['d3', 's2,', 'd2', 'd1', 'd0', 's-1.', 'd-1']);
assert.deepEqual(glyphs('33').map((x) => x.key), ['d1', 'd0']);
assert.deepEqual(glyphs('7.12').map((x) => x.place), [0, -1, -1, -2]);
console.log('rollingDigits ok');
