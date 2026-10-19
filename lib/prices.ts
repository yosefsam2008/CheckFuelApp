// Fuel/electricity prices: live -> fresh cache -> stale cache -> built-in defaults. Network and storage are injected so the check runs in node.
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { FuelPrices as Prices } from './tripCost';

export const PRICES_URL = 'https://checkfuel-data.vercel.app/prices.json';
export const CACHE_KEY = 'pricesCache';
export const CACHE_TTL_MS = 12 * 60 * 60 * 1000;
export const FETCH_TIMEOUT_MS = 5000;
export const DEFAULT_PRICES: Prices = { Gasoline: 7.08, Diesel: 9.58, Electric: 0.6 };

export type PriceSource = 'live' | 'cache' | 'cache-stale' | 'default';
export interface PriceResult {
  prices: Prices;
  previous?: Prices; // last stored set whose values differ from `prices`
  source: PriceSource;
  fetchedAt?: number;
  offline?: boolean; // cache-stale only: the request never reached the server (vs. a bad response)
}
export interface PriceIO {
  fetchJson: (url: string, signal: AbortSignal) => Promise<unknown>;
  storage: { get: (k: string) => Promise<string | null>; set: (k: string, v: string) => Promise<void> };
}
interface Cache { prices: Prices; fetchedAt: number; previous?: Prices }

class BadResponse extends Error {}

export const defaultIO: PriceIO = {
  fetchJson: async (url, signal) => {
    const res = await fetch(url, { signal });
    if (!res.ok) throw new BadResponse(`HTTP ${res.status}`);
    return res.json();
  },
  storage: { get: (k) => AsyncStorage.getItem(k), set: (k, v) => AsyncStorage.setItem(k, v) },
};

const inRange = (n: number, lo: number, hi: number) => Number.isFinite(n) && n >= lo && n <= hi;

export function parsePrices(data: any): Prices {
  const p = { Gasoline: parseFloat(data?.Gasoline), Diesel: parseFloat(data?.Diesel), Electric: parseFloat(data?.Electric) };
  if (!inRange(p.Gasoline, 1, 20) || !inRange(p.Diesel, 1, 20) || !inRange(p.Electric, 0.2, 3)) throw new BadResponse('prices out of range');
  return p;
}

const same = (a: Prices, b: Prices) => a.Gasoline === b.Gasoline && a.Diesel === b.Diesel && a.Electric === b.Electric;

async function readCache(io: PriceIO): Promise<Cache | null> {
  try {
    const c = JSON.parse((await io.storage.get(CACHE_KEY)) ?? 'null');
    return c && typeof c.fetchedAt === 'number' ? { prices: parsePrices(c.prices), fetchedAt: c.fetchedAt, previous: c.previous && parsePrices(c.previous) } : null;
  } catch {
    return null; // corrupt cache = no cache
  }
}

async function fetchLive(io: PriceIO, cached: Cache | null, now: number): Promise<PriceResult> {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), FETCH_TIMEOUT_MS);
  try {
    const prices = parsePrices(await io.fetchJson(PRICES_URL, ctl.signal));
    const previous = cached && !same(cached.prices, prices) ? cached.prices : cached?.previous;
    await io.storage.set(CACHE_KEY, JSON.stringify({ prices, fetchedAt: now, previous })).catch(() => {});
    return { prices, previous, source: 'live', fetchedAt: now };
  } finally {
    clearTimeout(timer);
  }
}

// `onUpdate` fires when the background refresh behind a fresh cache lands.
export async function getPrices(io: PriceIO = defaultIO, onUpdate?: (r: PriceResult) => void, now = Date.now()): Promise<PriceResult> {
  const cached = await readCache(io);
  if (cached && now - cached.fetchedAt < CACHE_TTL_MS) {
    fetchLive(io, cached, now).then(onUpdate, () => {});
    return { prices: cached.prices, previous: cached.previous, source: 'cache', fetchedAt: cached.fetchedAt };
  }
  try {
    return await fetchLive(io, cached, now);
  } catch (e) {
    if (cached) return { prices: cached.prices, previous: cached.previous, source: 'cache-stale', fetchedAt: cached.fetchedAt, offline: !(e instanceof BadResponse) };
    return { prices: DEFAULT_PRICES, source: 'default' };
  }
}
