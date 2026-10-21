// Self-check for the place stores: migration, dedupe/cap, coord expiry, origin TTL, route endpoints, split rounding.
// Run: npx ts-node --transpile-only -O "{\"module\":\"commonjs\",\"moduleResolution\":\"node\",\"customConditions\":null}" lib/places.check.ts
/* eslint-disable @typescript-eslint/no-require-imports */
import assert from 'node:assert/strict';

require.cache[require.resolve('@react-native-async-storage/async-storage')] = { exports: { default: {} } } as NodeModule;
const P = require('./places') as typeof import('./places');
const { roundHalf } = require('./format') as typeof import('./format');

const NOW = 1_800_000_000_000;
const DAY = 24 * 3600 * 1000;

// old text-only recents migrate, stay displayable, and have no placeId (resolved via autocomplete on pick)
const old = P.migrateRecents(['תל אביב', ' ', 'חיפה', 'תל אביב', 42, null], NOW);
assert.deepEqual(old.map((p) => p.main), ['תל אביב', 'חיפה']);
assert.equal(old[0].placeId, undefined);
assert.equal(P.isLocal(old[0]), false);
assert.equal(P.placeEndpoint(old[0]), null); // free text never becomes a route endpoint
assert.deepEqual(P.migrateRecents('garbage'), []);
assert.deepEqual(P.migrateRecents({ main: 'x' }), []);

// coords older than 30 days are dropped; the placeId stays, so the place still routes with no API call
const stale = P.migrateRecents([{ placeId: 'A', main: 'a', lat: 1, lng: 2, coordsAt: NOW - 31 * DAY, lastUsed: 1 }], NOW)[0];
assert.equal(stale.lat, undefined);
assert.deepEqual(P.placeEndpoint(stale), { placeId: 'A' });
assert.equal(P.isLocal(stale), true);
const fresh = P.migrateRecents([{ placeId: 'B', main: 'b', lat: 1, lng: 2, coordsAt: NOW - DAY }], NOW)[0];
assert.equal(fresh.lat, 1);

// dedupe by placeId (newest first), cap 10, GPS marker never stored
let list: import('./places').Place[] = [];
for (let i = 0; i < 12; i++) list = P.addRecent(list, { placeId: `p${i}`, main: `m${i}` }, NOW + i);
assert.equal(list.length, P.MAX_RECENTS);
list = P.addRecent(list, { placeId: 'p5', main: 'renamed' }, NOW + 99);
assert.equal(list[0].main, 'renamed');
assert.equal(list.filter((p) => p.placeId === 'p5').length, 1);
assert.equal(P.addRecent(list, { main: P.MY_LOCATION, lat: 1, lng: 2 }), list);
assert.equal(P.isGpsPlace({ main: P.MY_LOCATION, lat: 1, lng: 2 }), true);

// local filter
assert.deepEqual(P.filterLocal([{ main: 'עזריאלי', secondary: 'Tel Aviv' }, { main: 'חיפה' }], 'tel').map((p) => p.main), ['עזריאלי']);

// custom origin restores only within 6 hours
const saved = { place: { placeId: 'O', main: 'o' }, at: NOW - 5 * 3600 * 1000 };
assert.equal(P.restoreOrigin(saved, NOW)?.placeId, 'O');
assert.equal(P.restoreOrigin({ ...saved, at: NOW - 7 * 3600 * 1000 }, NOW), null);
assert.equal(P.restoreOrigin(null, NOW), null);

// split: nearest ₪0.5
assert.deepEqual([roundHalf(33.24), roundHalf(33.26), roundHalf(33.75), roundHalf(10)], [33, 33.5, 34, 10]);

console.log('places.check: ok');
