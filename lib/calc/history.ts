// Saving a calculation to tripHistory (shape unchanged) and the saved-destination chips.
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { TripRecord } from '../../types/trip';

export const DEDUPE_MS = 10 * 60 * 1000;
export const MAX_ROUTES = 10;
export interface SavedRoute { id: string; label: string; km: number }

// Same (vehicle, distance, cost rounded to the shekel) saved less than 10 minutes ago = same trip.
export const isDuplicateTrip = (last: TripRecord | undefined, next: TripRecord) =>
  !!last &&
  last.vehicleName === next.vehicleName &&
  last.vehicleModel === next.vehicleModel &&
  last.distance === next.distance &&
  Math.round(last.totalCost) === Math.round(next.totalCost) &&
  next.timestamp - last.timestamp < DEDUPE_MS;

const latest = (h: TripRecord[]) => h.reduce<TripRecord | undefined>((m, t) => (!m || t.timestamp > m.timestamp ? t : m), undefined);

async function readHistory(): Promise<TripRecord[]> {
  const stored = await AsyncStorage.getItem('tripHistory');
  return stored ? JSON.parse(stored) : [];
}

// ids stay Date.now()-style strings, but never repeat: two saves in the same millisecond get now and now + 1
export const nextId = (history: TripRecord[], now: number) =>
  String(Math.max(now, ...history.map((t) => Number(t.id) + 1).filter(Number.isFinite)));

export async function saveTrip(rec: TripRecord): Promise<'saved' | 'duplicate'> {
  const history = await readHistory();
  if (isDuplicateTrip(latest(history), rec)) return 'duplicate';
  await AsyncStorage.setItem('tripHistory', JSON.stringify([...history, { ...rec, id: nextId(history, rec.timestamp) }]));
  return 'saved';
}

export async function removeTrip(id: string) {
  const history = await readHistory();
  await AsyncStorage.setItem('tripHistory', JSON.stringify(history.filter((t) => t.id !== id)));
}

export const loadTrips = () => readHistory().catch(() => [] as TripRecord[]);

export const hasRoute = (routes: SavedRoute[], km: number) => routes.some((r) => r.km === km);
export function addRoute(routes: SavedRoute[], label: string, km: number): SavedRoute[] {
  if (routes.length >= MAX_ROUTES || hasRoute(routes, km)) return routes;
  return [...routes, { id: Date.now().toString(), label: label.trim() || `${km}`, km }];
}
export async function loadRoutes(): Promise<SavedRoute[]> {
  try {
    const r = JSON.parse((await AsyncStorage.getItem('savedRoutes')) ?? '[]');
    return Array.isArray(r) ? r.filter((x) => x && typeof x.km === 'number' && typeof x.label === 'string').slice(0, MAX_ROUTES) : [];
  } catch {
    return [];
  }
}
export const storeRoutes = (r: SavedRoute[]) => AsyncStorage.setItem('savedRoutes', JSON.stringify(r)).catch(() => {});
