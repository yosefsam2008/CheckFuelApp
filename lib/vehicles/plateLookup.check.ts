// Self-check for plate lookup and consumption helpers.
// Run: npx ts-node --compiler-options {\"module\":\"commonjs\"} lib/vehicles/plateLookup.check.ts
/* eslint-disable @typescript-eslint/no-require-imports */
import assert from 'node:assert/strict';

(globalThis as any).__DEV__ = false;
const { lookupPlate, plateDigits } = require('./plateLookup') as typeof import('./plateLookup');
const { parseDecimal, isValidConsumption, toStored, toDisplay } = require('./consumption') as typeof import('./consumption');

const reject = (async () => { throw new Error('net'); }) as unknown as typeof fetch;
const empty = (async () => ({ ok: true, json: async () => ({ result: { records: [] } }) })) as unknown as typeof fetch;

(async () => {
  assert.equal(plateDigits('12-345-67'), plateDigits('1234567'));
  const urls: string[] = [];
  const spy = (async (u: string) => { urls.push(u); throw new Error('net'); }) as unknown as typeof fetch;
  await lookupPlate('12-345-67', { fetchImpl: spy });
  await lookupPlate('1234567', { fetchImpl: spy });
  assert.deepEqual(urls.slice(0, 3), urls.slice(3));

  assert.deepEqual(await lookupPlate('1234567', { fetchImpl: reject }), { status: 'offline' });

  let n = 0;
  const mixed = ((u: string) => (n++ === 0 ? empty(u) : reject(u))) as unknown as typeof fetch;
  assert.deepEqual(await lookupPlate('1234567', { fetchImpl: mixed }), { status: 'offline' });
  assert.deepEqual(await lookupPlate('1234567', { fetchImpl: empty }), { status: 'notfound' });

  const hang = (() => new Promise(() => {})) as unknown as typeof fetch;
  assert.deepEqual(await lookupPlate('1234567', { fetchImpl: hang, timeoutMs: 50 }), { status: 'offline' });

  assert.equal(parseDecimal('6,5'), 6.5);
  assert.equal(parseDecimal('abc'), null);
  assert.equal(isValidConsumption(parseDecimal('0')), false);
  assert.equal(toStored(17, 'Electric'), 0.17);
  assert.equal(toDisplay(0.17, 'Electric'), 17);
  assert.equal(toStored(15.5, 'Gasoline'), 15.5);
  console.log('plateLookup.check: ok');
})();
