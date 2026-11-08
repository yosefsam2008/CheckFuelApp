// Run: npx ts-node --compiler-options {\"module\":\"commonjs\"} lib/growth.check.ts
import assert from 'node:assert';
import Module from 'node:module';

// growth.ts imports native modules; stub them so the pure rules run under node
const load = (Module as any)._load;
(Module as any)._load = (req: string, ...rest: unknown[]) =>
  ['react-native', 'expo-store-review', '@react-native-async-storage/async-storage'].includes(req) ? { Share: {}, AppState: {}, Platform: { OS: 'android' } } : load(req, ...rest);
const { reviewDue, buildShareMessage, STORE_URL } = require('./growth') as typeof import('./growth');

const DAY = 86_400_000;
const NOW = 1_800_000_000_000;
const ok = { firstOpen: NOW - 3 * DAY, askedAt: null, adAt: 0, error: false };
assert.equal(reviewDue(NOW, ok), true);
assert.equal(reviewDue(NOW, { ...ok, firstOpen: null }), false, 'first open not recorded yet');
assert.equal(reviewDue(NOW, { ...ok, firstOpen: NOW - DAY }), false, 'too new');
assert.equal(reviewDue(NOW, { ...ok, error: true }), false, 'error this session');
assert.equal(reviewDue(NOW, { ...ok, askedAt: NOW - 30 * DAY }), false, 'asked recently');
assert.equal(reviewDue(NOW, { ...ok, askedAt: NOW - 91 * DAY }), true);
assert.equal(reviewDue(NOW, { ...ok, adAt: NOW - 60_000 }), false, 'just after an ad');

const msg = buildShareMessage({ total: 123.4, km: 84.6, roundTrip: true, from: 'בית', to: 'עזריאלי', people: 3 });
assert.equal(msg.split('\n').at(-1), STORE_URL, 'link is the last line');
assert.ok(msg.includes('85 ק"מ') && msg.includes('הלוך-חזור'));
console.log('growth ok');
