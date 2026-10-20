// Run: npx ts-node --compiler-options {\"module\":\"commonjs\"} lib/check/prices.ts
import assert from 'node:assert';
import { CACHE_KEY, CACHE_TTL_MS, DEFAULT_PRICES, getPrices, type PriceIO } from '../prices';

const T0 = 1_700_000_000_000;
const mk = (payload: unknown | Error, store: Record<string, string> = {}) => {
  const io: PriceIO = {
    fetchJson: async () => {
      if (payload instanceof Error) throw payload;
      return payload;
    },
    storage: { get: async (k) => store[k] ?? null, set: async (k, v) => void (store[k] = v) },
  };
  return { io, store };
};
const good = { Gasoline: '7.29', Diesel: '9.70', Electric: '0.62' };

(async () => {
  // live, nothing cached: no previous, cache written
  const a = mk(good);
  let r = await getPrices(a.io, undefined, T0);
  assert.equal(r.source, 'live');
  assert.equal(r.prices.Gasoline, 7.29);
  assert.equal(r.previous, undefined);
  assert.equal(JSON.parse(a.store[CACHE_KEY]).fetchedAt, T0);

  // same values refetched later: previous stays unset
  r = await getPrices(mk(good, a.store).io, undefined, T0 + CACHE_TTL_MS + 1);
  assert.equal(r.source, 'live');
  assert.equal(r.previous, undefined);

  // changed values: previous = the old set
  r = await getPrices(mk({ ...good, Gasoline: '7.41' }, a.store).io, undefined, T0 + 2 * CACHE_TTL_MS + 2);
  assert.equal(r.prices.Gasoline, 7.41);
  assert.equal(r.previous?.Gasoline, 7.29);

  // same values again: previous is kept, not overwritten by the identical set
  r = await getPrices(mk({ ...good, Gasoline: '7.41' }, a.store).io, undefined, T0 + 3 * CACHE_TTL_MS + 3);
  assert.equal(r.previous?.Gasoline, 7.29);

  // fresh cache: served immediately as 'cache', background refresh reported through onUpdate
  const f = mk({ ...good, Gasoline: '7.50' }, a.store);
  let updated: number | undefined;
  r = await getPrices(f.io, (u) => (updated = u.prices.Gasoline), T0 + 3 * CACHE_TTL_MS + 60_000);
  assert.equal(r.source, 'cache');
  assert.equal(r.prices.Gasoline, 7.41);
  await new Promise((res) => setTimeout(res, 10));
  assert.equal(updated, 7.5);

  // stale cache + offline
  const old = { ...a.store };
  r = await getPrices(mk(new TypeError('Network request failed'), old).io, undefined, T0 + 10 * CACHE_TTL_MS);
  assert.equal(r.source, 'cache-stale');
  assert.equal(r.offline, true);
  assert.equal(r.prices.Gasoline, 7.5);

  // invalid payloads never reach the cache; stale cache is used and it is not "offline"
  for (const bad of [{ Gasoline: '700', Diesel: '9', Electric: '0.6' }, { Gasoline: 'x', Diesel: '9', Electric: '0.6' }, null, { Gasoline: '7', Diesel: '9', Electric: '0' }]) {
    const s = { ...old };
    r = await getPrices(mk(bad, s).io, undefined, T0 + 10 * CACHE_TTL_MS);
    assert.equal(r.source, 'cache-stale');
    assert.equal(r.offline, false);
    assert.equal(s[CACHE_KEY], old[CACHE_KEY]);
  }

  // new optional fields pass through live, fresh cache and stale cache; junk in them is dropped
  const full = { ...good, effectiveFrom: '2026-10-05', source: 'data.gov.il', computed: { Gasoline: true, Diesel: true, Electric: false, x: 1 } };
  const n = mk(full);
  r = await getPrices(n.io, undefined, T0);
  const info = { effectiveFrom: '2026-10-05', source: 'data.gov.il', computed: { Gasoline: true, Diesel: true, Electric: false } };
  assert.deepEqual(r.info, info);
  r = await getPrices(mk(new Error('offline'), n.store).io, undefined, T0 + 1);
  assert.deepEqual([r.source, r.info], ['cache', info]);
  r = await getPrices(mk(new Error('offline'), n.store).io, undefined, T0 + CACHE_TTL_MS + 1);
  assert.deepEqual([r.source, r.info], ['cache-stale', info]);
  r = await getPrices(mk({ ...good, effectiveFrom: '5.10', computed: 'yes' }).io, undefined, T0);
  assert.equal(r.info, undefined);

  // old 3-field server and an old cache entry without info: prices load, info stays unset
  r = await getPrices(mk(good).io, undefined, T0);
  assert.deepEqual([r.source, r.prices.Gasoline, r.info], ['live', 7.29, undefined]);
  const legacy = { [CACHE_KEY]: JSON.stringify({ prices: { Gasoline: 7.1, Diesel: 9, Electric: 0.6 }, fetchedAt: T0 }) };
  r = await getPrices(mk(new Error('offline'), legacy).io, undefined, T0 + CACHE_TTL_MS + 1);
  assert.deepEqual([r.source, r.prices.Gasoline, r.info], ['cache-stale', 7.1, undefined]);

  // offline and nothing cached: defaults; corrupt cache counts as nothing cached
  r = await getPrices(mk(new Error('offline')).io, undefined, T0);
  assert.deepEqual([r.source, r.prices], ['default', DEFAULT_PRICES]);
  r = await getPrices(mk(new Error('offline'), { [CACHE_KEY]: '{oops' }).io, undefined, T0);
  assert.equal(r.source, 'default');
  console.log('prices checks passed');
})();
