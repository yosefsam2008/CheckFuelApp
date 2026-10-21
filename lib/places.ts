// Places: Google autocomplete/details through checkfuel-data (the key never ships in the app), plus the local
// recents / favorites / last-origin stores. Pure helpers are exported for lib/places.check.ts.
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Endpoint, LatLng } from './route';

export interface Place {
  placeId?: string; // missing only on entries migrated from the old text-only recents
  main: string;
  secondary?: string;
  lat?: number;
  lng?: number;
  coordsAt?: number; // when lat/lng came from Google; dropped after COORDS_TTL_MS (Maps ToS: coords cached up to 30 days)
  lastUsed?: number; // set once a place is stored locally; a remote suggestion never has it
}
export type FavKey = 'home' | 'work';
export type Favorites = Partial<Record<FavKey, Place>>;

export const MY_LOCATION = 'המיקום שלי';
export const MAX_RECENTS = 10;
export const COORDS_TTL_MS = 30 * 24 * 3600 * 1000;
export const ORIGIN_TTL_MS = 6 * 3600 * 1000;

// ---------- API ----------
const PLACES_URL = process.env.EXPO_PUBLIC_ROUTE_URL?.replace(/\/route$/, '/places');

// dev-only trace so "zero Places calls on a recent" can be checked in the Metro log
export const log = (...a: unknown[]) => __DEV__ && console.log('[places]', ...a);

export async function autocomplete(input: string, sessionToken: string, bias: LatLng | null, signal?: AbortSignal): Promise<Place[]> {
  if (!PLACES_URL) throw new Error('not_configured');
  log('autocomplete call');
  const res = await fetch(`${PLACES_URL}/autocomplete`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ input, sessionToken, ...(bias && { lat: bias.latitude, lng: bias.longitude }) }),
    signal,
  });
  if (!res.ok) throw new Error(`autocomplete ${res.status}`);
  return ((await res.json()) as { suggestions: Place[] }).suggestions;
}

export async function placeDetails(placeId: string, sessionToken: string): Promise<{ lat: number; lng: number }> {
  if (!PLACES_URL) throw new Error('not_configured');
  log('details call (closes session)');
  const res = await fetch(`${PLACES_URL}/details?id=${encodeURIComponent(placeId)}&token=${encodeURIComponent(sessionToken)}`);
  if (!res.ok) throw new Error(`details ${res.status}`);
  return res.json();
}

/** What the route API gets: always a placeId or coords, never free text. */
export function placeEndpoint(p: Place): Endpoint | null {
  if (p.placeId) return { placeId: p.placeId };
  if (p.lat != null && p.lng != null) return { latitude: p.lat, longitude: p.lng };
  return null;
}

export const isGpsPlace = (p: Place | null | undefined) => !!p && !p.placeId && p.main === MY_LOCATION;
export const placeLabel = (p: Place) => (p.secondary ? `${p.main}, ${p.secondary}` : p.main);
export const samePlace = (a: Place, b: Place) => (a.placeId && b.placeId ? a.placeId === b.placeId : a.main === b.main && a.secondary === b.secondary);
/** Local entries (recents, favorites) can be used without any Places call. */
export const isLocal = (p: Place) => !!p.placeId && (p.lat != null || p.lastUsed != null);

// ---------- pure store helpers ----------
const dropStaleCoords = (p: Place, now: number): Place =>
  p.lat != null && (!p.coordsAt || now - p.coordsAt > COORDS_TTL_MS) ? { ...p, lat: undefined, lng: undefined, coordsAt: undefined } : p;

/** Old `string[]` recents, the new shape, or junk -> Place[] (never throws). */
export function migrateRecents(raw: unknown, now = Date.now()): Place[] {
  if (!Array.isArray(raw)) return [];
  const out: Place[] = [];
  for (const r of raw) {
    const p: Place | null =
      typeof r === 'string' ? (r.trim() ? { main: r.trim(), lastUsed: 0 } : null)
      : r && typeof r === 'object' && typeof (r as Place).main === 'string' ? (r as Place)
      : null;
    if (p && !out.some((q) => samePlace(q, p))) out.push(dropStaleCoords(p, now));
  }
  return out.slice(0, MAX_RECENTS);
}

export function addRecent(list: Place[], p: Place, now = Date.now()): Place[] {
  if (isGpsPlace(p)) return list;
  return [{ ...p, lastUsed: now }, ...list.filter((q) => !samePlace(q, p))].slice(0, MAX_RECENTS);
}

/** Local filter for every keystroke: substring match on main/secondary, case-insensitive. */
export function filterLocal(places: Place[], query: string): Place[] {
  const q = query.trim().toLowerCase();
  if (!q) return places;
  return places.filter((p) => p.main.toLowerCase().includes(q) || !!p.secondary?.toLowerCase().includes(q));
}

export function restoreOrigin(raw: unknown, now = Date.now()): Place | null {
  const o = raw as { place?: Place; at?: number } | null;
  return o?.place && typeof o.at === 'number' && now - o.at < ORIGIN_TTL_MS ? dropStaleCoords(o.place, now) : null;
}

// ---------- AsyncStorage ----------
const RECENTS_KEY = 'recentPlaces';
const OLD_RECENTS_KEY = 'recentDestinations';
const FAVORITES_KEY = 'favoritePlaces';
const ORIGIN_KEY = 'lastOrigin';

const readJson = async (key: string) => {
  try {
    const s = await AsyncStorage.getItem(key);
    return s ? JSON.parse(s) : null;
  } catch {
    return null;
  }
};
const writeJson = (key: string, v: unknown) => AsyncStorage.setItem(key, JSON.stringify(v)).catch(() => {});

export async function loadRecents(): Promise<Place[]> {
  return migrateRecents((await readJson(RECENTS_KEY)) ?? (await readJson(OLD_RECENTS_KEY)));
}
export const saveRecents = (list: Place[]) => writeJson(RECENTS_KEY, list);

export async function loadFavorites(): Promise<Favorites> {
  const f = (await readJson(FAVORITES_KEY)) as Favorites | null;
  const fix = (p: unknown) => migrateRecents([p])[0] as Place | undefined;
  return { home: fix(f?.home), work: fix(f?.work) };
}
export const saveFavorites = (f: Favorites) => writeJson(FAVORITES_KEY, f);

export const loadOrigin = async () => restoreOrigin(await readJson(ORIGIN_KEY));
export const saveOrigin = (p: Place | null) => (p ? writeJson(ORIGIN_KEY, { place: p, at: Date.now() }) : AsyncStorage.removeItem(ORIGIN_KEY).catch(() => {}));
