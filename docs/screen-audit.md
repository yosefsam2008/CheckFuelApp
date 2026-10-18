# CheckFuel screen audit

Read-only product audit. No code was changed.

**Method:** static reading of the router, all screens and ad components. No emulator or simulator was available (`adb` and `emulator` are not on PATH), so there are no screenshots, light or dark.

**Triggering criticism:** the dashboard, and the number of "journeys" (trip-related views) in it, is excessive for a teenage audience. The brief was a general review of how to structure the app as efficiently as possible.

## 1. Executive summary
- **Core job:** tell a driver what a trip will cost in fuel, in seconds.
- **Problem 1, friction:** the calculator is a 5-step wizard. A returning user needs 7 interactions, and a new user about 12+ (`app/(tabs)/calculator.tsx:191`, `:1117-1795`). A saved vehicle is never auto-selected (`:1059`).
- **Problem 2, bloat:** the dashboard mostly duplicates the tab bar. The guide is stale. About 2,000+ lines of dead web/shadcn code sit in `components/`.
- **Problem 3, ads in the way of value:** a full-screen interstitial blocks the result on every 2nd calculation (`calculator.tsx:938-946`). A rewarded "unlock" blurs secondary numbers and unlocks even without a reward (`:975`, `PremiumUnlockAd.tsx:55-60`).
- **Problem 4, compliance:** the privacy text says no ad tracking or third-party sharing and never mentions AdMob (`LegalScreen.tsx:82-85`, `FirstLaunchModal.tsx:155-157`). There is no consent flow and no hosted policy URL.
- **Criticism confirmed by the code:** the dashboard has no job the other tabs don't already do. Its 4-button grid and "see all" links repeat the tab bar (`dashboard.tsx:447-515`), and its stats, last-3-trips list and greeting (`userName` is never written) serve a "tracking" mindset, not a "how much will this drive cost" mindset. History (1,228 lines) and Vehicles (1,481 lines) are management screens used rarely after setup (assumption, no data).
- **Headline changes:** 4 tabs to **no tab bar**. One home screen (Calculate) holds the whole happy path. Trips and Vehicles become secondary screens opened from the home header and the vehicle chip. The dashboard and guide are cut. The wizard becomes one screen with a 1-tap result. The two add-vehicle screens become one. The ad blocks move off the happy path.
- **Usage data:** none exists. No analytics are wired (see 2.4), so every frequency score below is an assumption.

## 2. Phase 1: Inventory

### 2.1 Navigation graph
- **Root stack** (`app/_layout.tsx:51-60`): `(tabs)`, `addVehicleByPlate`, `addVehicle`, `LegalScreen`, `UserGuideScreen`.
- **Tabs** (`app/(tabs)/_layout.tsx:69-107`): dashboard, calculator, history, vehicles.
- **Entry** (`app/index.tsx:35-41`): native with no vehicles goes to `/calculator`, otherwise `/dashboard`. Web always goes to `/dashboard` (`app/index.web.tsx`). The two entry points disagree.
- **Depth from launch:**
  - Calculator: 0 to 1 tap.
  - Vehicles, History: 1 tap.
  - Add vehicle (manual): 2 taps. Add vehicle (plate): 2 taps plus modal, ad and typing, about 5 steps (`vehicles.tsx:295-308`).
  - Legal, Guide: 2 taps (dashboard button grid, as modals).
- **Dead ends:** `LegalScreen` and `UserGuideScreen` are registered as routes but only ever rendered as modals from the dashboard (`dashboard.tsx:538-543`). As routes, their close handler is undefined (`LegalScreen.tsx:495`).
- **Stray route:** `app/Toast.tsx` is a component inside `app/`, so expo-router treats it as a route.
- **Modals and sheets:** FirstLaunchModal, vehicle picker sheet (`calculator.tsx:1304-1368`), the interstitial and rewarded takeovers (`:2044-2090`), the vehicle details/edit modal (`vehicles.tsx`), the trip details modal and delete confirm (`history.tsx:433-604`), and the pre-plate info modal.

### 2.2 Ads map
- **Banners:** dashboard (`:507`), history (every 3rd item `:405-409`, empty state `:392`), vehicles empty state (`:437`), addVehicleByPlate (`:833`), calculator (steps 0-3 and mid-results `:1904`, `:2123`).
- **Interstitial:** calculator, every 2nd calculation ever (`:938-946`). It has no load timeout, so a hung ad leaves the user on "preparing results" (`InterstitialAd.tsx`).
- **Rewarded-interstitial "premium unlock":** calculator results (`:975`). It unlocks on close, timeout or error, and never checks that a reward was earned. It resets on every new calculation (`:1064`).
- **Rewarded gate:** before the plate lookup (`vehicles.tsx:745`). It is a soft gate: close, error and load failure all pass through. Errors double-fire the navigation (`:748-751`).

### 2.3 Storage keys
- **Core:** `vehicles`, `tripHistory`.
- **State:** `app_launched`, `legal_accepted_date`, `calculationCount`, `calculatorProgress`.
- **Dead or unbounded:** `legal_acceptance`, `userName` (never written), `ad_impressions` (hook unused), `fallback_data_*` (no TTL), `qa_validation_log_<session>` (new key per session).

### 2.4 Analytics and usage data
None. A grep finds no analytics calls. `firebase` is in `package.json` but is never imported. `hooks/useAdTracking.ts` is unused. **No usage numbers are available, and none are invented here.**

### 2.5 Screenshots
Not captured. No emulator or simulator is available in this environment. Dark mode is declared (`app.json` `userInterfaceStyle: automatic`) but colors are hardcoded light (`app/_layout.tsx:53`, `(tabs)/_layout.tsx:60`), so dark mode is effectively unsupported (observation from code, not verified on device).

## 3. Phase 2: The core
- **Job-to-be-done:** "Tell me what this drive costs in fuel before I go."
- **Current happy path (returning user):** type distance, Continue, open vehicle picker, pick vehicle, Continue, Continue (preferences), "Calculate" = **7 interactions**, plus a possible blocking interstitial (`calculator.tsx`).
- **Features that serve the job (5):**
  1. Distance input.
  2. Vehicle with consumption (auto-selected last).
  3. Live fuel price, auto-filled (`calculator.tsx:770-793`).
  4. The cost result.
  5. Share and save (history).
- **Everything else** is secondary: driving preferences, taxi/bus comparison, carpool, monthly/yearly projection, CO₂, tank gauge, guide.

## 4. Phase 3 and 4: Screen inventory with verdicts
Scores are 1-5 (5 = best for the app; for Redundancy, 5 = high overlap with another screen). Frequency is an **assumption** (no data).

| Screen | Route / file | Purpose | Core value | Frequency | Redundancy | Verdict | Reason |
|---|---|---|---|---|---|---|---|
| Entry redirect | `app/index.tsx`, `index.web.tsx` | Route by vehicle count | 2 | every launch | 3 | REWORK | Web and native disagree. AdMob is initialised twice (`_layout.tsx:25`, `index.tsx:13`). One entry: always Calculator. |
| Calculator (wizard) | `app/(tabs)/calculator.tsx` (3,340 lines) | Distance, vehicle, prefs, price, result | 5 | daily/weekly | 2 (inline copies of price UI) | REWORK | The core, but 7 interactions. Collapse to one screen. |
| Step 2 Driving prefs | `calculator.tsx:1395-1642` | Style, trip type, A/C | 2 | rare (defaults rarely changed) | 1 | DEMOTE | Defaults are preselected. Move into an "Advanced" collapsible. |
| Step 3 Fuel price | `calculator.tsx:1647-1806` | Edit price, live prices | 3 | rare | 1 (three price UIs) | MERGE | Into the main screen as one editable price chip. EV price edit has no effect (`:899`, bug). |
| Vehicle picker sheet | `calculator.tsx:1304-1368` | Choose vehicle | 4 | per trip | 2 | REWORK | Auto-select the last used vehicle. Sheet only to change. |
| Results | `calculator.tsx:1811-2037` | Cost, metrics, comparisons | 5 | every calc | 2 | REWORK | Keep hero cost, metrics, share, split. Cut or collapse the rest (see 5). |
| Interstitial takeover | `calculator.tsx:2058-2090`, `InterstitialAd.tsx` | Ad before result | 0 | every 2nd calc | n/a | REWORK | Blocks the value. Move to after-result or on "new calculation", with a time cap and a load timeout. |
| Premium unlock | `calculator.tsx:975`, `PremiumUnlockAd.tsx` | Rewarded ad unlocks blurred numbers | 1 | every calc | n/a | CUT (as gate) | Hides taxi, bus, carpool, yearly, CO₂. Unlocks without a reward (`:55-60`). Blank screen on web (`:70`, `:2044`). Revenue trade-off in section 7. |
| Dashboard | `app/(tabs)/dashboard.tsx` (905 lines) | Greeting, monthly stats, shortcuts, last 3 trips | 1 | weekly | 5 (tab bar duplicates; trips duplicate History) | CUT | Shortcut grid is pure duplication (`:447-515`). Greeting reads a key nothing writes (`userName`). Monthly total survives as one line in Trips. Legal/guide buttons move to About (`:497-498`, the author already says so). |
| History | `app/(tabs)/history.tsx` (1,228 lines) | Trip list, details, delete | 2 | rare/occasional | 3 | DEMOTE | Out of primary nav, opened from a home header icon. Add one "this month ₪X" line (from the dashboard). Fix double delete confirm (`:570-596`), fix `TripCard` defined inside the component (`:220`). Close call: for teens, history is a log, not a goal. Keep, but never on the happy path. |
| Trip details modal | `history.tsx:433-537` | One trip's detail | 2 | rare | 1 | MERGE | Fold into the list row (expand in place). List, modal, delete confirm and a second confirm is the "journeys" bloat. |
| Vehicles | `app/(tabs)/vehicles.tsx` (1,481 lines) | List, edit, delete, add | 3 | rare after setup | 3 | DEMOTE | Out of primary nav. Opened from the home vehicle chip ("manage") or the About sheet. Remove the plate rewarded gate. |
| Add vehicle (manual) | `app/addVehicle.tsx` | Manual form | 3 | once | 5 (overlaps plate flow) | MERGE | Into the plate screen as a "manual" fallback. Fix comma decimals (`:102`). |
| Add vehicle (plate) | `app/addVehicleByPlate.tsx` (1,066 lines) | Plate lookup, auto-fill | 4 | once | 5 | REWORK | 5 steps plus an ad becomes 2 inputs. No timeout (`:139`), all errors read as "not found" (`:541`), dashed plates miss the filter (`:136`). Stray `import 'expo-router/entry'` (`:4`). |
| Legal screen | `app/LegalScreen.tsx` | Privacy, terms, about | 0 | once | 5 (4 copies of the legal text) | DEMOTE | Required (compliance). Move behind an About sheet in the header. Needs a hosted URL. Text must be corrected (section 7). |
| User guide | `app/UserGuideScreen.tsx` (647 lines) | 4-tab guide | 1 | once | 3 | CUT | Stale: says plate flow needs manual consumption (`:188`) and the EV hint is wrong (`:211`). Replace with an inline hint on first use. |
| First-launch modal | `components/modals/FirstLaunchModal.tsx` | Blocking terms accept | 0 | once | 5 (duplicates Legal) | REWORK | Keep a minimal consent step. Keep the ad consent in it. Match the app palette (iOS green now, `:16-34`). |
| Toast (route) | `app/Toast.tsx` | Toast | 1 | n/a | 5 (5+ copies) | MERGE | Move to `components/`, one toast. |
| Dead web components | `components/calculator/*`, `components/trip/*`, `ButtonStyleGuide.tsx`, `ActionButton.tsx` | None | 0 | never | n/a | CUT | No importers; DOM/Tailwind code that cannot render in RN. Confirm with a repo-wide grep before deleting (`components/ui/*` not checked). |
| Unused deps and files | `firebase`, `useAdTracking.ts`, `server/`, `legal/*.md` planning docs | None | 0 | n/a | n/a | CUT | Unused in the app. `server/` is an unused mock (`server/README.md`). |

## 5. Detailed notes for non-KEEP verdicts

**Calculator wizard to one screen (REWORK + MERGE steps 2-3)**
- Content moves: distance field with presets, a vehicle chip (last used, auto-selected), a price chip (auto-filled, editable), and a live cost that updates as the distance changes. Prefs move into "Advanced".
- Risk: the wizard guides first-time users; a single screen with defaults could confuse them. Mitigation: pre-fill sensible defaults and show the result immediately.
- Draft progress (`calculatorProgress`) becomes unnecessary and can be dropped.
- Save-to-history today happens only when the user taps "שמור וחשב מחדש" (`:1046`). Leaving without it loses the result. The new flow should save on result.

**Results**
- KEEP: hero cost, distance, fuel/kWh, cost per km, share, split-by-N (carpool math already exists at `:1933-1963`).
- COLLAPSE into one "More" row: taxi/bus comparison (hardcoded fares, `:177-186`), monthly figure.
- CUT: yearly figure, CO₂ card, fuel-tank gauge, celebration overlay. All sit behind the paywall mainly to feed the rewarded ad.
- Risk: loses the only use of the rewarded ad (see ad revenue).

**Dashboard (CUT) and History (DEMOTE), the response to the criticism**
- Dashboard content: the monthly total becomes one line at the top of Trips. The "last 3 trips" list is dropped (History is one tap away). The shortcut grid, greeting, and unused `totalTrips` are dropped. Legal and Guide buttons move to the About sheet (`dashboard.tsx:497-498`).
- Optional, only if you want a retention hook: a single "repeat last trip" chip on the home screen, reusing the latest `tripHistory` entry. That replaces the whole dashboard for one line of UI. Medium impact, low effort. Not required.
- History keeps its data and delete function, but loses its tab. The trip details modal is folded into an expandable row, which removes one modal layer.
- Risk: users who open the app to look at their stats lose a landing page. Assumption: few teens do (no data). The banner on the dashboard (`:507`) goes away; History keeps its banner (`:394-409`).
- Risk: removing the tab bar removes discoverability for History and Vehicles. Fallback if the owner objects: a 2-tab bar (Calculate, Trips) with Vehicles reached from the vehicle chip.

**Vehicles (DEMOTE)**
- Setup-once data. It stays reachable in two taps from home (the vehicle chip, then "manage"). Add vehicle stays a stack screen.

**Add-vehicle flows (MERGE)**
- One screen: plate field first, "enter manually" link below. Remove the info pre-modal and the rewarded gate (it is a soft gate and a 15-30 s wait; it also double-navigates on error).
- Fix: timeout on the registry call, separate "no network" from "not found", normalise plates, flag estimated weight/CC as estimates before saving (`addVehicleByPlate.tsx:555-621`).
- Risk: losing the rewarded gate loses a rewarded impression per vehicle add (rare event, low volume, assumption).

**Legal / consent (DEMOTE)**
- Needs: a hosted privacy policy URL, corrected text, AdMob disclosure, UMP consent. See section 7.

**User guide (CUT)**
- Content is stale in two verified places. Replace with a one-time inline hint. Risk: low.

**Interstitial and premium-unlock**
- See section 7: they stay as revenue, but off the happy path.

## 6. Phase 5: Proposed structure

### 6.1 Navigation tree (no tab bar, one primary destination)
```
Home: חישוב (Calculate)        <- default on launch for everyone
├── Vehicle chip -> picker sheet -> "manage" -> Vehicles (stack screen)
│                                                └── Add vehicle (plate first, manual fallback)
├── Advanced (collapsible: style, trip type, A/C, fuel price)
├── Result (inline): share card, split by N, "More" (taxi/bus)
├── Header icon: נסיעות -> Trips (stack screen; "this month ₪X" line, expandable rows)
└── Header icon: ⓘ -> About sheet: Privacy URL, Terms, ad consent, delete my data
```
Total screens: 4 (Home, Trips, Vehicles, Add vehicle) plus 2 sheets (vehicle picker, About), down from 4 tabs + 4 stack screens + 7 modals/takeovers.

Trade-off: a tab bar is more discoverable and is the default iOS pattern. Without it, History and Vehicles depend on header icons. Fallback: 2 tabs (Calculate, Trips) with Vehicles behind the chip. Recommendation: no tab bar, because 2 of the 4 current tabs are rarely used after setup (assumption). Apple's native-feel concern is met by standard stack navigation with the back gesture; a single-screen utility with real functionality is not a minimum-functionality problem (assumption).

### 6.2 New happy path
- Returning user: open the app, type distance or tap a preset, see the cost live = **1-2 taps** (from 7).
- New user: open, add vehicle by plate (type plate, confirm), return to Calculate, type distance = about **4 steps** (from 12+ plus an ad).
- Navigation to a destination (Apple Maps / Waze) stays available; see section 7.

### 6.3 Capabilities worth adding (impact vs effort)
| Capability | Impact | Effort | Note |
|---|---|---|---|
| Shareable result card (image, not text) | High | Medium | Today sharing is plain text (`calculator.tsx:1021-1041`). The viral loop for 16-25. |
| Split cost by N friends in one tap | High | Low | The math exists (carpool section). Promote it. |
| Round-trip toggle (assumption: not present) | High | Low | The trip-type preference is road type, not round trip. Verify before building. |
| Saved routes / favourites ("home to campus") | Medium | Medium | Cuts distance typing to one tap. |
| Delete-my-data action | Medium | Low | Compliance as well as UX. |
| Dark mode | Medium | Medium | Colors are hardcoded light. Expected by this audience. |

## 7. Risks

**App Store / Google Play**
- **Highest:** the privacy text says no advertising use and no third-party sharing, and omits AdMob and the price fetch from `checkfuel-data.vercel.app` (`LegalScreen.tsx:82-89`, `FirstLaunchModal.tsx:155-157`; the policy also names a "Fuel Economy API" not found in the code). Store review and users can both flag this. Fix before shipping any redesign.
- No AdMob consent (UMP) and no ATT prompt anywhere (`app.json` has no `NSUserTrackingUsageDescription`; ads use `requestNonPersonalizedAdsOnly`, which is not a substitute for EEA consent). Whether ATT is required depends on whether any tracking occurs (assumption: non-personalized ads only, so likely not).
- Privacy policy is in-app only. The stores need a reachable URL; whether one is in the store listing is unknown (open question).
- **Apple Guideline 4 history:** keep Apple Maps as a native option. Current buttons open the app home only, not a route (`calculator.tsx:1099-1105`), and Apple Maps shows on Android too. Keep both on iOS. Do not remove them in the cleanup. Android: Waze plus Google Maps (assumption, to confirm).
- Rewarded ads that unlock content must reward the user; today the unlock does not depend on `EARNED_REWARD`. Removing the gate removes that exposure.

**Ad revenue**
- No impression or revenue data exists. I can't quantify. What changes: fewer blocking full-screen ads, no per-calculation rewarded unlock, no rewarded plate gate, dashboard banner lost.
- Mitigations: keep banners on Trips and Calculate, keep a capped interstitial after results (for example on "new calculation", at most once per N minutes), and offer an optional rewarded "unlock extra insights" instead of blurring.
- Because the audience has low patience, fewer but better-placed ads likely retain more users. **Assumption, not measured.**

**User-facing regressions**
- First-time users lose the step-by-step wizard.
- Anyone relying on the monthly/yearly view loses the yearly number.
- Draft recovery (`calculatorProgress`) disappears.
- Existing `tripHistory` and `vehicles` data must keep working. Don't change storage shapes.
- The cleanup deletes about 2,000 lines of dead code. Grep every symbol first (the exploration noted a truncated search for the unused rewarded ad variants).

## 8. Prioritized action plan (impact vs effort, each a separate task)
1. **Fix the privacy text and add a hosted policy URL** (high impact, low effort). Mention AdMob and the price source. Ship before anything else.
2. **Add UMP consent (and ATT only if needed)** (high, medium).
3. **Delete dead code**: `components/calculator/*`, `components/trip/*`, `ButtonStyleGuide`, `ActionButton`, `firebase`, `useAdTracking`, unused styles/icons (medium, low).
4. **Auto-select last-used vehicle** and set the entry to Calculator for all platforms (high, low).
5. **Collapse the wizard** to one screen with a live result; prefs and price into Advanced (high, high).
6. **Move ads off the happy path:** drop the blocking interstitial before the result, add a cap, add a load timeout, remove the blur gate (high, medium).
7. **Merge add-vehicle flows**, remove the rewarded gate, add timeout/error states/plate normalisation (high, medium).
8. **Cut the dashboard, remove the tab bar**, add header icons for Trips and About, move the monthly total into Trips, fold the trip detail modal into an expandable row (medium, medium). This is the direct answer to the criticism and can be done early, since it mostly deletes code.
9. **Demote Legal/About**, delete the guide, merge FirstLaunch with consent (medium, low).
10. **Fix known bugs:** EV price edit (`calculator.tsx:899`), comma decimals (`addVehicle.tsx:102`), double delete confirm, web blank screen on unlock (`:2044`), double navigation on ad error (`vehicles.tsx:748`) (medium, low).
11. **Add shareable image card and one-tap split** (high, medium).
12. **Add minimal, consented analytics** so future cuts use data (medium, medium).

## 9. Open questions for the product owner
1. Was the criticism only about the dashboard and trip views, or also about other screens (calculator steps, vehicles)? The audit assumes the former.
2. Is there any AdMob or store analytics (eCPM, impressions per screen, retention)? If so, share it before the ad changes.
3. Is a privacy policy URL already set in App Store Connect and Play Console?
4. Are you willing to drop the "premium unlock" blur model in exchange for fewer, better-placed ads?
5. Are the Waze/Apple Maps buttons important to you beyond satisfying Apple's earlier rejection? Should Android show Google Maps?
6. Is EU/EEA distribution intended (drives UMP priority)?
7. Is removing the tab bar acceptable, or do you prefer the 2-tab fallback (Calculate, Trips)? Is a "repeat last trip" chip wanted as a retention hook?
8. Are the ~20 trips/month and fixed taxi/bus fares (`calculator.tsx:177-186`) figures you stand behind, or can they go?
