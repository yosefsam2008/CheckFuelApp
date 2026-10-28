// Driving route provider. The Google key lives server-side in the checkfuel-data Vercel function (api/route.js in the checkfuel-data repo).
export interface LatLng {
  latitude: number;
  longitude: number;
}
interface ServerRoute {
  distanceMeters: number;
  durationSeconds: number;
  polyline?: string;
  name?: string;
  hasToll?: boolean;
}
/** Top level = Google's default route; `routes` = it plus up to 2 alternatives (absent from servers before rt2) */
export interface RouteResult extends ServerRoute {
  routes?: ServerRoute[];
}

export interface RouteOption {
  polyline: string;
  distanceKm: number;
  durationMin: number;
  hasToll: boolean;
  name: string;
}

/** The routes to offer, at most 3; an older server's single route becomes a list of one. */
export function routeOptions(r: RouteResult): RouteOption[] {
  const list = r.routes?.length ? r.routes : [r];
  return list.slice(0, 3).map((x) => ({
    polyline: x.polyline ?? '',
    distanceKm: x.distanceMeters / 1000,
    durationMin: Math.round(x.durationSeconds / 60),
    hasToll: !!x.hasToll,
    name: x.name ?? '',
  }));
}

const ROUTE_URL = process.env.EXPO_PUBLIC_ROUTE_URL;

export const routeProviderConfigured = !!ROUTE_URL;

/** A route end: a Google placeId (hits the server cache) or coords. Never free text. */
export type Endpoint = { placeId: string } | LatLng;

export const endpointKey = (e: Endpoint) => ('placeId' in e ? e.placeId : `${e.latitude.toFixed(3)},${e.longitude.toFixed(3)}`);

export async function getRoute(origin: Endpoint, destination: Endpoint): Promise<RouteResult> {
  if (!ROUTE_URL) throw new Error('Route provider not configured');
  // a weak network must end in the error message, not a minute-long spinner
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), 15000);
  try {
    const res = await fetch(ROUTE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...('placeId' in origin ? { originPlaceId: origin.placeId } : { origin }),
        ...('placeId' in destination ? { destPlaceId: destination.placeId } : { destination }),
      }),
      signal: ctl.signal,
    });
    if (!res.ok) throw new Error(`Route request failed: ${res.status}`);
    const data = (await res.json()) as RouteResult;
    if (!(data.distanceMeters > 0)) throw new Error('No route');
    return data;
  } finally {
    clearTimeout(timer);
  }
}

/** Google encoded polyline -> [lat, lng][] */
export function decodePolyline(encoded: string): [number, number][] {
  const points: [number, number][] = [];
  let index = 0, lat = 0, lng = 0;
  while (index < encoded.length) {
    for (const axis of [0, 1]) {
      let shift = 0, result = 0, byte: number;
      do {
        byte = encoded.charCodeAt(index++) - 63;
        result |= (byte & 0x1f) << shift;
        shift += 5;
      } while (byte >= 0x20);
      const delta = result & 1 ? ~(result >> 1) : result >> 1;
      if (axis === 0) lat += delta;
      else lng += delta;
    }
    points.push([lat / 1e5, lng / 1e5]);
  }
  return points;
}
