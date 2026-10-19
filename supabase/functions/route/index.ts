// Supabase Edge Function: driving route proxy for Google Routes API (Essentials tier).
// Deploy: supabase functions deploy route ; supabase secrets set GOOGLE_ROUTES_API_KEY=...
const API_KEY = Deno.env.get('GOOGLE_ROUTES_API_KEY');

// shortcut: per-instance memory cache, lost on cold start; move to a table if route costs matter
const cache = new Map<string, unknown>();

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);
  if (!API_KEY) return json({ error: 'not_configured' }, 500);

  let body: { origin?: { latitude?: unknown; longitude?: unknown }; destination?: unknown };
  try {
    body = await req.json();
  } catch {
    return json({ error: 'bad_json' }, 400);
  }
  const lat = body.origin?.latitude;
  const lng = body.origin?.longitude;
  const dest = typeof body.destination === 'string' ? body.destination.trim() : '';
  if (typeof lat !== 'number' || typeof lng !== 'number' || Math.abs(lat) > 90 || Math.abs(lng) > 180 || !dest || dest.length > 200) {
    return json({ error: 'bad_request' }, 400);
  }

  // ~100m origin rounding so nearby requests share a cache entry
  const key = `${lat.toFixed(3)},${lng.toFixed(3)}|${dest.toLowerCase()}`;
  const cached = cache.get(key);
  if (cached) return json(cached);

  const res = await fetch('https://routes.googleapis.com/directions/v2:computeRoutes', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': API_KEY,
      'X-Goog-FieldMask': 'routes.distanceMeters,routes.duration,routes.polyline.encodedPolyline',
    },
    body: JSON.stringify({
      origin: { location: { latLng: { latitude: lat, longitude: lng } } },
      destination: { address: dest },
      travelMode: 'DRIVE',
      languageCode: 'he',
      regionCode: 'IL',
    }),
  });
  if (!res.ok) return json({ error: 'upstream', status: res.status }, 502);

  const route = (await res.json()).routes?.[0];
  if (!route?.distanceMeters) return json({ error: 'no_route' }, 404);

  const out = {
    distanceMeters: route.distanceMeters,
    durationSeconds: parseInt(route.duration ?? '0', 10),
    polyline: route.polyline?.encodedPolyline,
  };
  cache.set(key, out);
  return json(out);
});
