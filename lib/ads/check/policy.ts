// Run: npx ts-node --compiler-options {\"module\":\"commonjs\"} lib/ads/check/policy.ts
import assert from 'node:assert';
import { afterCalculation, afterShown, shouldShowInterstitial as ask, type AdState } from '../policy';

const T = 1_700_000_000_000;
const base: AdState = { calcsSinceLast: 3, lastShownAt: T - 200_000, sessionShown: 0, resultSeen: true };

assert.equal(ask(base, T), true, 'all conditions met');
assert.equal(ask({ ...base, resultSeen: false }, T), false, 'never before a result was seen');
assert.equal(ask({ ...base, calcsSinceLast: 2 }, T), false, 'needs >= 3 calculations');
assert.equal(ask({ ...base, lastShownAt: T - 179_999 }, T), false, 'needs >= 180s gap');
assert.equal(ask({ ...base, lastShownAt: T - 180_000 }, T), true, '180s exactly is enough');
assert.equal(ask({ ...base, sessionShown: 2 }, T), false, 'max 2 per session');
assert.equal(ask({ ...base, sessionShown: 1 }, T), true);

// Walk a session: first launch, 1st-3rd calculations, leave, then more.
let s: AdState = { calcsSinceLast: 0, lastShownAt: 0, sessionShown: 0, resultSeen: false };
assert.equal(ask(s, T), false, 'fresh state: no ad');
s = afterCalculation(s);
assert.equal(ask(s, T), false, 'first result is never gated');
s = afterCalculation(afterCalculation(s));
assert.equal(ask(s, T), true, '3rd calc then leave');
s = afterShown(s, T);
assert.deepEqual([s.calcsSinceLast, s.sessionShown], [0, 1]);
for (let i = 0; i < 3; i++) s = afterCalculation(s);
assert.equal(ask(s, T + 60_000), false, 'only 60s after the last ad');
assert.equal(ask(s, T + 180_000), true, '180s after the last ad');
s = afterShown(s, T + 180_000);
for (let i = 0; i < 9; i++) s = afterCalculation(s);
assert.equal(ask(s, T + 10_000_000), false, 'session cap reached');
console.log('ad policy checks passed');
