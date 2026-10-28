# CheckFuel — Design Handoff (React Native / Expo)

Source of truth for the UI redesign. `screens/*.dc.html` are the design mockups (HTML + inline styles, RTL Hebrew).
Read them as **visual spec**: exact colors, sizes, radii, spacing and copy. Do not port the HTML literally — rebuild in RN.

## Hard rule
**Do not change business logic.** Extract the existing calculator state/logic into `hooks/useFuelCalculator.ts`
(cut-paste, no behavior change), keep the old screen working on top of it, and build the new UI as a second
screen behind a flag `USE_NEW_UI`. Pure calc → `calcTrip()` with unit tests before/after.

## Screen map
| File | What it is |
|---|---|
| `Main.dc.html` | Home/calculator (interactive): vehicle card, route card w/ "לפי יעד / מרחק ידני" toggle, trip type, advanced-options row + bottom sheet |
| `MainOptions.dc.html` | Same screen, advanced-options sheet **open** (static) |
| `MainManual.dc.html` | Same screen, **manual distance** mode (static) |
| `MainEmpty.dc.html` | First run, **no saved vehicle** — dashed slot + "הוסף רכב" → navigates to My Cars tab |
| `Result.dc.html` | Result screen: 3 route option cards, dark total card (with trip-type toggle), split & share card (passenger stepper inside), Waze / Apple Maps, ad slot |
| `Motion.dc.html` | Motion spec (9 animations, durations, easings, RN hints) |
| `Brand.dc.html` | Logo lockups, app icon, palette, type |
| `FeatureGraphic.dc.html`, `Social.dc.html` | Store banner 1024×500, social post 1080×1080 (not app UI) |

## Tokens
```ts
export const c = {
  ink: '#0B1410', ink2: '#17231D', inkLine: '#22302A', inkBorder: '#2A3A31', inkMuted: '#9FB0A6',
  mist: '#F3F5F1', line: '#E2E7E1', divider: '#EEF1EC', white: '#FFFFFF',
  green: '#40D63C',      // accent on dark, primary CTA fill, tab-active pill
  greenText: '#22A321',  // green on light backgrounds (logo "fuel", ₪ sign, switch on)
  deep: '#0A7A43',       // green text links/labels on light
  muted: '#5B6660', faint: '#8FA197', disabled: '#DDE3DC', warn: '#B4530A',
};
radius: card 20–24, hero 24–28, field 14–18, segmented 14 (thumb 10), pill 999
spacing: screen padding 16, card padding 12–18, vertical gap 12
touch targets ≥ 44
```
Font: **Rubik** (`@expo-google-fonts/rubik`) 400/500/600/700/800. Numbers use `fontVariant: ['tabular-nums']`.

## Logo
Lockup = mark as the "C" + `heck` (Rubik 500) + `fuel` (Rubik 700).
- On dark: `assets/mark-white.png`, heck white, fuel `#40D63C`
- On light: `assets/mark-ink.png`, heck ink, fuel `#22A321`
- On green: ink mark, all ink
- App icon: `assets/mark-gradient.png` on ink square
Mark size ≈ 1.08 × font size, overlap −0.06em toward "h", bottom slightly below baseline.

## Components to build (presentational, props only)
- `VehicleCard` — overline brand (11px, letterSpacing .08em, uppercase) / nickname 17 bold / "בנזין 95 · ₪7.77 לליטר" 12 muted / "החלף" pill. Empty variant: dashed border + green "הוסף רכב" → My Cars.
- `RouteCard` (dark) — top `Segmented` "לפי יעד | מרחק ידני" (white thumb on ink2). Destination mode: origin row, dashed connector, search field, recent chips. Manual mode: field with **"ק״מ" on the right** + divider + big number (52px/800), green border when filled, presets 10/25/50/100. Switching modes keeps the typed km.
- `Segmented` — sliding thumb, used for trip type, fuel 95/98, driving mode (two-line options).
- `AdvancedRow` → `AdvancedSheet` (bottom sheet): fuel type, **editable price-per-liter field (42px)** with "מחיר מפוקח" / "המחיר שלך + איפוס" states, driving mode Eco −8% / Normal / Sport +12% (placeholders — calibrate), AC switch +4%, "שמור הגדרות". Edits are a draft; only commit on save.
- Result total (Result screen dark card) — digit roll per column when the number changes.
- `ShareCard` — "כל אחד מעביר ₪X" 44px, seat avatars, full-width green "שלח לחברים".
- Primary CTA: ink 56h radius 18; disabled `#DDE3DC` with contextual label ("בחר יעד כדי לחשב" / "הקלד מרחק כדי לחשב" / "הוסף רכב כדי לחשב").

## Motion (Reanimated 3)
Note: there is NO separate "v2 / pump" calculator screen — the app is `Main` (home) → `Result`. The digit roll applies to the Result total.
| # | What | Spec |
|---|---|---|
| 1 | Digit roll (hero) | translateY per digit, 900ms, bezier(.16,1,.3,1), 70ms stagger right→left; leading zeros dimmed |
| 2 | Route line draw | strokeDashoffset → 0, 1000ms, bezier(.65,0,.35,1) |
| 3 | Calculating | digits spin loop 480ms linear, min 600ms |
| 4 | Segmented thumb | translateX 280–300ms, bezier(.2,.8,.2,1) + `Haptics.selectionAsync()` |
| 5 | Press | scale .97, 120ms; Light impact haptic on CTA/stepper only |
| 6 | Result actions | FadeInDown 380ms after number lands |
| 7 | Sheet open | 460ms bezier(.32,.72,0,1); scrim 300ms to rgba(11,20,16,.48) |
| 8 | Sheet content | rows fade+rise 14px, 420ms, delay 90ms + 50ms/row |
| 9 | Save in sheet | close sheet → after 280ms commit → digit roll |
Respect `useReducedMotion()` → opacity only.

## Routes (Google Maps)
- Map: `react-native-maps` with `provider={PROVIDER_GOOGLE}` and `customMapStyle={require('./assets/checkfuel-map-style.json')}` (muted brand palette, POIs/transit off). Keep the Google logo/attribution visible (SDK default) — do not cover it with the sheet; use `mapPadding={{ bottom: sheetHeight }}`.
- Request alternatives in the **same** call (Directions `alternatives=true`, or Routes API `computeAlternativeRoutes: true`) — up to 3 routes, no extra request. Each route: decode polyline, take `distance` + `duration`; toll flag from route warnings / `travelAdvisory.tollInfo` when available.
- Fuel cost per route = `calcTrip({ km: route.distanceKm, ... })` using the existing hook — this is the feature: **compare routes by fuel cost**, cheapest gets a "הכי זול" badge.
- **Result screen order (final):** top bar → 3 route cards → dark total card → split & share → navigate → ad. **No map and no route-shape card on the Result screen.**
- **Route shape lives on the Home screen** (`Main.dc.html`, dark route card): a 72×112 box on the left of the "מאיפה / לאן" fields, drawing ONE route (the default/cheapest) from Google's polyline with react-native-svg — no map. Origin: ink circle with green #40D63C ring (top). Destination: white rounded square (bottom). Line: white, width 3.5, round caps/joins. Before a destination is chosen: a dim dashed placeholder curve (#2A3A31) and the destination square at 25% opacity. When a destination arrives: the line draws in (strokeDashoffset → 0, 900ms, bezier(.65,0,.35,1)), destination square fades in, and the km appears under the shape. The small marker dots that used to sit to the right of the fields are removed. Projection: decode polyline → equirectangular (cos(midLat) on lng) → fit into the box with ~10px padding, simplify to ~40 points. CTA becomes "חשב עלות · 352 ק״מ" once a destination is set.
- Verify Google Maps Platform terms for showing Routes data without a Google basemap; if required, show Google attribution in the card or use the Google map for the full-screen view only.
- Route cards (grid 3): road name + green dot on the cheapest, time (+ "· אגרה"), ₪ cost. Selected = ink bg/white text.
- Selecting a route updates the total, liters, km, per-person (digit roll) and the label "עלות דלק · כביש 40 · הכי זול".
- Trip-type toggle lives inside the dark total card; passenger stepper lives inside the split card.
- Origin = white circle, green #22A321 ring; destination = ink rounded square, white stroke.
- Hidden when the distance was typed manually (no route exists).

## Open items
- Fuel 98 price (₪8.55) and driving-mode factors are placeholders.
- AdMob 320×50 slot sits under result actions (quiet, no dashed frame).
