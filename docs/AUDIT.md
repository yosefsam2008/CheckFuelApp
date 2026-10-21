# Audit: Places autocomplete, API cost, UX upgrades, trip split

Started 2026-10-21. App = this repo; server = `checkfuel-data`.
Baseline: `tsc` clean. `expo lint` had 2 errors (unescaped `"` in `components/modals/FirstLaunchModal.tsx:73`), fixed in commit `6c80869`. The 14 warnings are pre-existing ad-component hook deps, left alone.
`checkfuel-data` has no `package.json`, TypeScript, or linter. It is plain ESM run by Vercel. Its check is `node --test test/`.

## Phase 0: audit

| # | Item | Status | Evidence |
|---|------|--------|----------|
| 1.1 | `POST /api/places/autocomplete` | ❌ | `checkfuel-data/api/` has only `prices.js` and `route.js` |
| 1.2 | `GET /api/places/details` | ❌ | same |
| 1.3 | Shared KV cache (fail-open) | ⚠️ | `route.js:7` uses a per-instance `Map`: lost on every cold start, never expires, not shared across instances |
| 1.4 | `route.js` accepts `originPlaceId` / `destPlaceId` | ❌ | `route.js:27-30` accepts coords or address origin and text destination only, so the destination is always text-geocoded by Google |
| 1.5 | Validation, `{error:{code,message}}`, rate limit, no PII logs | ⚠️ | validation exists (`route.js:31-33`) but the error shape is `{error:'code'}` (`route.js:18,24,33,56,59`); no rate limit; no logs at all (so no PII, but also no hit/miss) |
| 2.1 | `lib/usePlaceSearch.ts` | ❌ | missing |
| 2.2 | Sheet shows highlighted suggestions | ❌ | `InputSheet.tsx:81-92` shows recent-text chips only |
| 2.3 | Only picked places can be confirmed | ❌ | `calculator.tsx` `submitDestination` sends any free text to `getRoute` |
| 2.4 | Loading / no results / offline states | ❌ | none in `InputSheet.tsx` |
| 2.5 | RTL / bidi | ⚠️ | `InputSheet.tsx:108` uses `textAlign:'right'` with no `writingDirection`, so mixed Hebrew/Latin/numbers can reorder |
| 2.6 | Haptic on selection | ⚠️ | `expo-haptics` installed and wrapped in `constants/motion.ts:39`, but not used by the sheet |
| 3.1 | Recents `{placeId, main, secondary, lat, lng, lastUsed}`, dedup by placeId, cap 10 | ❌ | `calculator.tsx` stores `string[]` capped at 5 under `recentDestinations` |
| 3.2 | Favorites בית / עבודה | ❌ | missing |
| 3.3 | Persist last custom origin (6h) | ❌ | `originText` is component state only |
| 3.4 | Migrate old recents | ❌ | no migration (needed once 3.1 changes the shape) |
| 4.1 | ⇅ swap | ❌ | missing |
| 4.2 | Round trip ×2 + persisted | ⚠️ | toggle exists (`RouteCard.tsx` `RoundTripPill`, `calculator.tsx` `km * 2`), but is not persisted |
| 4.3 | Route requests pass placeIds | ❌ | `lib/route.ts` `getRoute(origin, destination: string)` |
| 5.1 | "חלק עם הנוסעים" button + sheet with 1–8 stepper (default 2) | ⚠️ | `ResultSheet.tsx:123-134` has a split card + share, shown only when the calculator's `PassengerStepper` (max 5, `PassengerStepper.tsx:11`) is above 1; no sheet |
| 5.2 | Per person rounded to ₪0.5 | ❌ | `ResultSheet.tsx:60` shows 2 decimals |
| 5.3 | Share text with origin ← destination | ⚠️ | `ResultSheet.tsx:78` shares km, vehicle, total, split, but no place names |
| 5.4 | Zero API calls | ✅ | the split is pure local math (`ResultSheet.tsx:60`) |

## Phase 1: server (`checkfuel-data`)

- New `api/_lib.js`: CORS, `{error:{code,message}}`, Upstash REST KV over `fetch` (fail-open with an 800ms timeout), `cache: hit/miss` logs, per-IP limit of 60/min.
- New `api/places/autocomplete.js` and `api/places/details.js`.
- `api/route.js` accepts `originPlaceId` / `destPlaceId`, plus the old coords/address input. It uses the KV cache in place of the per-instance `Map`.
- New `test/google.test.mjs` (7 tests). `node --test test/`: 19/19 pass. There is no tsc or lint in this repo.

## Phases 2–4: app (one commit)

These share the same state block in `calculator.tsx` and can't be split into separate commits without a non-working middle state.

- **Phase 2.** New `lib/usePlaceSearch.ts`: local filter per keystroke; remote from 2 characters with a 300ms debounce; aborts the previous request; per-session query cache; `expo-crypto` UUID per sheet opening, rotated after each details call. New `components/calculator/PlaceSheet.tsx` replaces `InputSheet.tsx` (deleted; its only callers were the two route sheets). It has highlighted matches, bold main and gray secondary text, skeleton rows, empty/offline/error states, an RLM prefix plus `writingDirection:'rtl'` for bidi, and a light haptic on pick. Free text can't be confirmed: return-key with text says "בחרו מקום מהרשימה". Return-key on an empty origin field means GPS.
- **Phase 3.** New `lib/places.ts`. Recents are `Place[]` under `recentPlaces` (deduped by placeId, max 10), migrated from the old `recentDestinations` string list on first load. Favorites בית/עבודה are under `favoritePlaces`. The last custom origin is under `lastOrigin` and restored if under 6h old. New `lib/places.check.ts` self-check (passes).
- **Phase 4.** ⇅ button on the dotted line in `RouteCard.tsx`. Round trip is persisted under `roundTrip`. `getRoute(Endpoint, Endpoint)` sends `originPlaceId`/`destPlaceId` or coords, never text. An in-app route cache makes swapping back free.
- `tsc` clean. `expo lint`: 0 errors; the 14 warnings are pre-existing and none are in new code.

## Decisions made

- **Upstash REST over `fetch`, no `@upstash/redis`.** The repo has no `package.json`, and one REST call is a few lines. It reads `UPSTASH_REDIS_REST_*` or Vercel KV's `KV_REST_API_*`.
- **One Google key, `GOOGLE_MAPS_API_KEY`.** It falls back to the existing `GOOGLE_ROUTES_API_KEY`, so nothing breaks before you add the new name. The key must also have **Places API (New)** enabled.
- **Cache TTLs: route 24h, autocomplete 7 days.** I could not load the Maps Service Specific Terms page (it renders with JavaScript), so these are conservative choices from the commonly cited rules: placeIds are unlimited, and other Content (lat/lng) up to 30 days. **Please confirm against the live terms.** The route cache value keeps the response shape the app already reads (`distanceMeters`, `durationSeconds`, `polyline`) rather than `{distanceKm, durationMin}`. That keeps old app builds working, and the mini map still gets its polyline on a hit.
- **Place Details is not cached on the server.** A cached details hit would leave the autocomplete session open and bill each keystroke. The app keeps the coords with the recent place instead.
- **The rate limit is per instance and in memory.** It costs nothing, and IPs never leave memory (no PII stored).
- **Recents and favorites need no Places call when picked, even after their coords expire.** Coords stored on the device are dropped after 30 days (ToS). Routing uses the placeId, which may be kept indefinitely, so the "zero calls on reselect" rule still holds.
- **Places base URL is derived from `EXPO_PUBLIC_ROUTE_URL`** (`…/api/route` → `…/api/places`), so there is no new app env var.
- **Offline is detected from fetch's `TypeError`**, not `@react-native-community/netinfo`. That avoids a native dependency, and the sheet only needs to know when a request failed for lack of a network.
- **Saving a favorite:** long-press opens an inline action row ("שמור כבית / שמור כעבודה / ביטול") inside the sheet, not `Alert.alert`, because `Alert` does nothing on react-native-web. Saving a remote suggestion resolves it first (one details call, which closes the session). Tapping an unset favorite chip switches the sheet to "איפה הבית?"; the next pick saves it **and** uses it for the current field.
- **Picks go into recents when picked**, not after the route succeeds. They are real Google places now, and a route failure doesn't make the place wrong. Origins and destinations share one recents list.
- **Card chips under the destination field** show only recents that have a placeId (max 5). Old text-only recents appear in the sheet, where picking one resolves it via autocomplete + details.
- **Swap with a GPS origin** takes a fresh GPS fix and makes it a fixed "המיקום שלי" coords destination. Swapping back turns it into GPS again. "Navigate to destination" for that case uses `lat,lng`.
- **Bias uses the GPS fix** (30km circle). A custom origin does not move the bias.
