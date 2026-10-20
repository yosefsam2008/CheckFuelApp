// Fuel/electricity prices: live -> fresh cache -> stale cache -> built-in defaults. Network and storage are injected so the check runs in node.
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { FuelPrices as Prices } from './tripCost';

export const PRICES_URL = 'https://checkfuel-data.vercel.app/prices.json';
export const CACHE_KEY = 'pricesCache';
export const CACHE_TTL_MS = 12 * 60 * 60 * 1000;
export const FETCH_TIMEOUT_MS = 5000;
export const DEFAULT_PRICES: Prices = { Gasoline: 8.25, Diesel: 10.74, Electric: 0.6 }; // prices.json on 2026-10-19; only used before the first successful fetch

export type PriceSource = 'live' | 'cache' | 'cache-stale' | 'default';
export interface PriceResult {
  prices: Prices;
  previous?: Prices; // last stored set whose values differ from `prices`
  source: PriceSource;
  fetchedAt?: number;
  offline?: boolean; // cache-stale only: the request never reached the server (vs. a bad response)
  info?: PriceInfo;
}
// optional fields from the computing server; old servers and old caches send none of them
export interface PriceInfo {
  effectiveFrom?: string; // YYYY-MM-DD
  source?: string;
  computed?: Partial<Record<keyof Prices, boolean>>; // false = the server fell back to a fixed value
}
export interface PriceIO {
  fetchJson: (url: string, signal: AbortSignal) => Promise<unknown>;
  storage: { get: (k: string) => Promise<string | null>; set: (k: string, v: string) => Promise<void> };
}
interface Cache { prices: Prices; fetchedAt: number; previous?: Prices; info?: PriceInfo }

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

export function parseInfo(data: any): PriceInfo | undefined {
  const info: PriceInfo = {};
  if (typeof data?.effectiveFrom === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(data.effectiveFrom)) info.effectiveFrom = data.effectiveFrom;
  if (typeof data?.source === 'string') info.source = data.source;
  const fields = (['Gasoline', 'Diesel', 'Electric'] as const).filter((f) => typeof data?.computed?.[f] === 'boolean');
  if (fields.length) info.computed = Object.fromEntries(fields.map((f) => [f, data.computed[f]]));
  return Object.keys(info).length ? info : undefined;
}

const same =(a: Prices, b: Prices) => a.Gasoline === b.Gasoline && a.Diesel === b.Diesel && a.Electric === b.Electric;

async function readCache(io: PriceIO): Promise<Cache | null> {
  try {
    const c = JSON.parse((await io.storage.get(CACHE_KEY)) ?? 'null');
    return c && typeof c.fetchedAt === 'number' ? { prices: parsePrices(c.prices), fetchedAt: c.fetchedAt, previous: c.previous && parsePrices(c.previous), info: parseInfo(c.info) } : null;
  } catch {
    return null; // corrupt cache = no cache
  }
}

async function fetchLive(io: PriceIO, cached: Cache | null, now: number): Promise<PriceResult> {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), FETCH_TIMEOUT_MS);
  try {
    const data = await io.fetchJson(PRICES_URL, ctl.signal);
    const prices = parsePrices(data);
    const info = parseInfo(data);
    const previous = cached && !same(cached.prices, prices) ? cached.prices : cached?.previous;
    await io.storage.set(CACHE_KEY, JSON.stringify({ prices, fetchedAt: now, previous, info })).catch(() => {});
    return { prices, previous, source: 'live', fetchedAt: now, info };
  } finally {
    clearTimeout(timer);
  }
}

// `onUpdate` fires when the background refresh behind a fresh cache lands.
export async function getPrices(io: PriceIO = defaultIO, onUpdate?: (r: PriceResult) => void, now = Date.now()): Promise<PriceResult> {
  const cached = await readCache(io);
  if (cached && now - cached.fetchedAt < CACHE_TTL_MS) {
    fetchLive(io, cached, now).then(onUpdate, () => {});
    return { prices: cached.prices, previous: cached.previous, source: 'cache', fetchedAt: cached.fetchedAt, info: cached.info };
  }
  try {
    return await fetchLive(io, cached, now);
  } catch (e) {
    if (cached) return { prices: cached.prices, previous: cached.previous, source: 'cache-stale', fetchedAt: cached.fetchedAt, info: cached.info, offline: !(e instanceof BadResponse) };
    return { prices: DEFAULT_PRICES, source: 'default' };
  }
}
