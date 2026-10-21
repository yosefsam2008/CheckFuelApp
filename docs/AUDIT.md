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

## Phase 5: trip split

- New `components/calculator/SplitSheet.tsx`. In `ResultSheet.tsx`, the split card is now a "חלק עם הנוסעים" row (shown on every result). It opens the sheet, which has a 1–8 stepper (reusing `PassengerStepper` with a `max` prop), a live per-person amount rounded to ₪0.5, and `Share`. The iOS image attachment is kept.
- `lib/format.ts`: `roundHalf`, `formatShare`, `splitMessage`, covered by `places.check.ts`.
- `ResultData` gains `from`/`to` place names. In manual-distance mode, `destination` is now empty, which also fixes a bug: "נווט ליעד" used to point at a stale route destination after switching to a manual distance.
- `tsc` clean, lint 0 errors, self-checks pass.

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
- **The split sheet starts at** the calculator's passenger count when it is above 1, otherwise at 2. The calculator's own stepper stays, now with a max of 8 to match. The share message's first line reads "🚗 נסיעה" when there are no place names (manual distance). A GPS origin is named "המיקום שלי".
- **The server still accepts text addresses** so app builds already in users' hands keep working. The new app never sends one.

## Dependencies added

- App: `expo-crypto ~15.0.8` (via `npx expo install`). `expo-haptics` was already installed.
- Server: none. KV is accessed with plain `fetch` to Upstash's REST API.

## checkfuel-data environment / KV setup

1. **Google key:** in Google Cloud, enable **Places API (New)** on the key the server already uses. Optionally store it as `GOOGLE_MAPS_API_KEY`; the old `GOOGLE_ROUTES_API_KEY` still works. The key is read from `process.env` only.
2. **KV (optional, fail-open):** Vercel → project checkfuel-data → Storage → add an **Upstash for Redis** (Marketplace) database and connect it to the project. That injects `KV_REST_API_URL` + `KV_REST_API_TOKEN`, or `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN`. Either pair works. Without them, every request goes straight to Google.
3. Redeploy. Check in Vercel → Logs that you see `route cache: miss`, then `route cache: hit` for the same trip.

## Deploy order

1. **Server first:** push `checkfuel-data` (`main`) so Vercel deploys `api/places/*` and the new `route.js`. Old app builds keep working because the route input and response shapes are backward compatible.
2. **Then the app:** build/submit. The app derives `…/api/places` from the existing `EXPO_PUBLIC_ROUTE_URL`, so no new app env var is needed.

## Manual test checklist (device)

1. Destination → type "עזריאלי": Google suggestions appear about 0.3s after you stop typing, the match is highlighted, the city shows in gray. Pick one → route + km appear.
2. Type nonsense ("קקקקזזז") → "לא נמצאו תוצאות, נסו ניסוח אחר". Press return → "בחרו מקום מהרשימה" and no route call.
3. Reopen destination → the recent appears at the top. Pick it → in Metro: `[places] select: local place, no API call`, and no `autocomplete call` / `details call` lines.
4. One search + pick → Metro shows N × `autocomplete call` and exactly one `details call (closes session)`.
5. Pick the same destination again → Vercel log `route cache: hit` (with KV configured).
6. Long-press a recent → "שמור כבית" → the בית chip turns green in both sheets. Tap an unset "הוסף עבודה" → title "איפה העבודה?" → pick → saved and used.
7. Origin → pick a place → route recalculates. Force-quit, reopen within 6h → the origin is still set. Change the device clock forward 7h → back to GPS.
8. Origin sheet: empty field + return, or the "המיקום שלי" chip → GPS.
9. ⇅ with a GPS origin → origin becomes the place, destination "המיקום שלי", route recalculates. ⇅ again → back to GPS origin, instant (app cache).
10. Toggle הלוך-חזור → km ×2. Force-quit and reopen → the toggle is still on.
11. Calculate → "חלק עם הנוסעים" → stepper 1–8 starts at 2, the amount updates live in ₪0.5 steps → "שלח לנוסעים" → WhatsApp text matches the template, with real place names.
12. Airplane mode → open the sheet and type → offline notice, recents only. Recents still route if the route is cached in the app; otherwise an error with "נסה שוב".
13. Old install upgrade: an install that had text recents shows them in the sheet, and picking one resolves it (autocomplete + details) and routes.
14. Mixed text: a place like "Azrieli Mall 132" or "דיזנגוף 50" reads right-to-left with the number in place.

## Not completed / not verified

- **Not run on a device or simulator, and not against live Google or Upstash.** Verified by `tsc`, lint, `lib/places.check.ts`, and the server's `node --test` (fetch faked: cache hit, fail-open, session token, field masks, error shape). The "≈0.5s suggestions" criterion is the 300ms debounce plus network, so it needs a device check.
- **Google ToS caching TTLs** were not checked against the live terms page (it could not be fetched). See Decisions.
- The rate limit is per instance and not shared.
- The bidi behavior of `writingDirection` differs on Android (it ignores it); the RLM prefix is what handles Android. Needs a visual check (test 14).
