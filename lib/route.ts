// Driving route provider. The Google key lives server-side in supabase/functions/route.
export interface LatLng {
  latitude: number;
  longitude: number;
}
export interface RouteResult {
  distanceMeters: number;
  durationSeconds: number;
  polyline?: string;
}

const ROUTE_URL = process.env.EXPO_PUBLIC_ROUTE_URL;
const ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

export const routeProviderConfigured = !!ROUTE_URL;

export async function getRoute(origin: LatLng, destination: string): Promise<RouteResult> {
  if (!ROUTE_URL) throw new Error('Route provider not configured');
  const res = await fetch(ROUTE_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(ANON_KEY ? { Authorization: `Bearer ${ANON_KEY}`, apikey: ANON_KEY } : {}),
    },
    body: JSON.stringify({ origin, destination }),
  });
  if (!res.ok) throw new Error(`Route request failed: ${res.status}`);
  const data = (await res.json()) as RouteResult;
  if (!(data.distanceMeters > 0)) throw new Error('No route');
  return data;
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
