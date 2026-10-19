You are working in the Expo SDK 54 / React Native app at C:\Users\samoh\Documents\checkfuel (Hebrew, RTL).
Task: Phase 2 of docs/phase3-plan.md, "Core flow: one-screen calculator". Read docs/phase3-plan.md sections 2.1-2.8 first.

Visual + motion reference (approved by the owner): docs/redesign/phase3-preview.html. Open it in a browser and use the
first phone ("המחשבון"), its state switcher (רגיל / אין רכב / אין אינטרנט / טקסט גדול), the reduced-motion toggle and the
"תנועה" table at the bottom. Match layout, hierarchy, colors, spacing and motion. The from/to route fields, share card,
monthly history and home-screen widget in that preview are LATER phases: do not build them. In place of from/to use a
km input + saved-destination chips + round-trip chip.

OWNER DECISIONS THAT OVERRIDE THE PLAN:
- There IS a "חשב" button. The result is computed when it is pressed, never live (plan §2.2 said live; ignore that part).
- No colored gradient line anywhere in the UI. The gradient exists only inside the logo image.
- One UI accent: brand green. Teal (#009688/#00796B) and blue (#007AFF) are not used in this screen or the tab bar.
- The signature moment is a fuel-pump odometer: on "חשב" every digit of the cost rolls from 0 to its value.

Branch: `feat/p2-one-screen-calculator` from `feat/p2-tokens` (it contains constants/tokens.ts, which you must use).

## Facts already verified (do not re-investigate)
- app/(tabs)/calculator.tsx is ~3,360 lines: a 5-step wizard (`STEPS`, ~line 191), local COLORS (~197),
  live price fetch from https://checkfuel-data.vercel.app/prices.json (~653-677, no cache, no timeout),
  handleCalculate (~854-958) which calls calculateAdjustedConsumption (keep using it as-is),
  every-2nd-calculation interstitial (~938-946), PremiumUnlockAd blur gate (~975, unlocks without a reward),
  saveCalculationToHistory (~990) writing TripRecord (types/trip.ts) to AsyncStorage key `tripHistory`.
- BUG: for Electric vehicles the cost reads `electricityPrice` (~907) but the price editor writes `fuelPrice`, so the
  user's edited EV price is ignored. Fix it in the new pure function.
- Tokens: constants/tokens.ts exports color/type/space/radius; import via constants/theme. Use ONLY tokens in new code.
- Installed and usable: react-native-reanimated ~4.1, expo-haptics, lucide-react-native, react-native-svg.
- Tab bar (app/(tabs)/_layout.tsx) stays. AdMob is consent-gated: ad components already no-op until allowed.
- No test runner. ts-node is available; checks are scripts with node:assert run via
  `npx ts-node --compiler-options {\"module\":\"commonjs\"} <file>`. Pure lib files must not import react-native.
- components/calculator/* is dead web code (deleted in a later PR). Put new UI in components/calc/.

## Build, in this order (one commit per step)
0. Palette (single accent). In constants/tokens.ts add `accentTint: '#E6F4EA'` (selected chips, price pill background;
   brandGreenStrong on it = 4.7:1) and add that pair to scripts/contrast-check.ts. In app/(tabs)/_layout.tsx set
   tabBarActiveTintColor to color.brandGreenStrong and the info icon to color.textSecondary. Keep the brandTeal/brandBlue
   tokens (other screens still use teal until their redesign) but use neither in anything this task touches.
   Run `npm run check:contrast`.
1. lib/calc/tripCost.ts — pure `computeTrip({distanceKm, roundTrip, vehicle, prices, prefs})` returning
   `{totalCost, energy, costPerKm, distance, breakdown}` or `{error}`; algorithm and validation as plan §2.2
   (d = roundTrip ? 2x : x; 0 < d <= 10000; Electric uses prices.electric — the bug fix).
   Also `splitCost(total, n)` = Math.ceil(total*100/n)/100, n clamped 1..8.
   lib/calc/__check__/tripCost.ts: 100km @20km/L @7 = 35; round trip doubles; editing EV price changes cost;
   0km -> error; splitCost(100,3)=33.34, splitCost(10,4)=2.5.
2. lib/prices.ts — `getPrices()` per plan §2.4: AsyncStorage `pricesCache` {prices, fetchedAt}, 12h TTL with background
   refresh, AbortController 5s timeout, range validation, returns {prices, previous?, source:'live'|'cache'|'cache-stale'|
   'default', fetchedAt}. `previous` = the last cached price set whose values differ from the current one (store it when
   a fetch returns new values); it drives the pill's change indicator. Keep network/storage behind two injected functions
   so the check script runs in node. lib/__check__/prices.ts: live, stale cache, invalid payload, offline+no cache,
   previous kept only when values change.
3. lib/ads/policy.ts — `shouldShowInterstitial(state, now)` per plan §2.8 (>=3 calcs since last, >=180s, <=2/session,
   only on leaving the screen or a new calculation AFTER a result was seen, NEVER between "חשב" and the result).
   Persist in AsyncStorage `adState`. Add a 4s load timeout to components/InterstitialAd.tsx (on timeout: complete, no ad).
   Check script with time cases.
4. Default vehicle: `defaultVehicle(vehicles, trips, lastVehicleId)` per plan §2.3 in lib/calc/. Write `lastVehicleId`
   whenever the user picks a vehicle. Read legacy `calculatorProgress` once to restore distance, then remove the key.
5. Motion primitives (components/calc/motion/, Reanimated only, all on the UI thread):
   a. `Odometer` — props `{value: string, fromZero?: boolean, duration?: number, stagger?: number, style}`.
      One column per digit: a clipped View of height = lineHeight containing a vertical strip "0".."9";
      translateY = -digit * lineHeight via withTiming(duration, Easing.bezier(0.2, 0.8, 0.2, 1)) with
      withDelay(index * stagger). Non-digits ("." "," "₪") render as static Text. Re-mount columns when the string length
      changes. fromZero: reset to 0 then animate. Text uses fontVariant ['tabular-nums']. accessibilityLabel = value,
      columns hidden from accessibility. Defaults: duration 650, stagger 40.
   b. `useReducedMotion()` from Reanimated: when true, every Odometer jumps to its value (duration 0, no delay) and every
      entrance/press animation below is skipped.
   c. `PressableScale` — Pressable that scales to 0.97 on pressIn (withTiming 100ms) and back on pressOut. Use it for
      buttons, chips, stepper buttons and the vehicle row. Keep 44x44 minimum hit area.
   Motion spec (exactly this, nothing more):
   | moment | duration | behaviour |
   | press "חשב" | 650ms + 40ms stagger | cost Odometer fromZero; liters Odometer fromZero in parallel; at the end
     Haptics.impactAsync(Light) |
   | result card first appears / re-calculates | 220ms | opacity 0->1 + translateY 8->0, ease-out (Reanimated entering) |
   | button / chip press | 100ms | scale 0.97 |
   | chip selection | 150ms | background to accentTint; Haptics.selectionAsync() |
   | split N change | 180ms, 15ms stagger | only the per-person Odometer rolls from its previous value |
   | inputs changed after a result | 200ms | card opacity to 0.45 |
   | reduced motion | 0ms | final values instantly, no translate, haptics still fire |
   Do NOT add: screen-load animations, confetti/celebration, bounces/springs with overshoot, background motion, anything
   longer than 700ms.
6. New screen. Rewrite app/(tabs)/calculator.tsx as one ScrollView (target < 600 lines; pieces in components/calc/),
   top to bottom exactly like the preview:
   a. Vehicle row (opens the existing picker sheet).
   b. Price row = components/calc/PricePill.tsx. Start side: fuel name ("בנזין 95"/"סולר"/"חשמל") and a 12pt caption with a
      7pt dot + "מחיר חי · עודכן <dd.MM>" (dot color.brandGreen). End side: the pill — accentTint background, radius.s,
      padding 6x12, text brandGreenStrong, value "₪7.29" in Rubik 500 22pt tabular-nums, then a small filled SVG triangle
      (up / down, not a text glyph) + the absolute change "0.12" in Rubik 500 13pt. Hide the change when there is no
      `previous`. Pill content is LTR: wrap in ltr(). Hebrew accessibilityLabel, e.g.
      "מחיר 7.29 שקלים לליטר, עלה ב-12 אגורות מהחודש הקודם". Tapping the row opens "מתקדם" with the price field focused.
   c. Distance: km input + chips (saved destinations from AsyncStorage `savedRoutes` {id,label,km}[] max 10, long-press
      to delete, "שמור יעד" when the km is not saved yet) + round-trip chip. Selected chip = accentTint bg, strong text,
      semibold.
   d. Primary button "חשב": full width, min height 54, brandGreenStrong fill, white 17pt semibold. Disabled (opacity .4,
      accessibilityState disabled) until distance and vehicle are valid. On press: computeTrip, show/refresh the result
      card with the motion above, scroll it into view.
   e. Result card (only after the first "חשב"): label "עלות הנסיעה"; the cost = the ONLY large number on screen
      (Odometer, Rubik 600 56pt, "₪" 28pt textSecondary before it, letterSpacing -1); meta line (liters Odometer ·
      ₪/km); split row with stepper (persist `lastSplitN`; N changes only the per-person amount, no recompute); actions:
      "שתף" (textPrimary fill, surface text; keep the existing text Share for now) + secondary "שמור".
      If any input changes after a calculation: dim to 0.45 and show "הנתונים השתנו. לחצו חשב לעדכון" under the button.
      Never auto-recompute.
   f. Collapsible "מתקדם" (driving style, trip type, A/C, editable price) and collapsible "השוואה" (taxi, bus as today).
   g. One AdBanner below everything with reserved minHeight.
   Save: "שמור" + toast with "בטל" for 4s; dedupe per plan §2.5; Haptics.notificationAsync(Success) on save.
   TripRecord shape unchanged.
7. States (each must be designed, as in the preview's state switcher):
   - No vehicle: replace the vehicle row with a card: title "עוד אין רכב שמור", 13pt hint "מקלידים מספר רישוי, ואנחנו
     ממלאים את השאר מהמאגר הממשלתי.", button "הוסף רכב לפי מספר רישוי" (accentTint bg, strong text) -> /addVehicleByPlate.
     "חשב" disabled, no result card.
   - Offline / stale price (source 'cache' or 'cache-stale'): caption "אין חיבור · מחיר מ-<dd.MM>" (or "מחיר מ-<dd.MM>"
     when online but stale), dot textSecondary, pill background app chip grey, text textPrimary, no change indicator.
   - Default price (source 'default'): caption "מחיר משוער" in warningText, no dot, grey pill.
   - Invalid input: "חשב" disabled, no alerts or toasts.
   - Largest Dynamic Type: nothing clipped or overlapping; long vehicle names truncate with ellipsis (numberOfLines 1);
     chips wrap; allowFontScaling stays on (maxFontSizeMultiplier only on the 56pt cost, 1.3).
8. Fonts: add @expo-google-fonts/rubik and @expo-google-fonts/assistant (only Rubik_500/600 and Assistant_400/600),
   load them in app/_layout.tsx with useFonts and keep the splash until loaded (fallback to system on error).
   Rubik for numbers and titles, Assistant for body. These are the only new dependencies allowed.
9. Delete from the calculator: STEPS + step dots, calculatorProgress, celebration overlay, LinearGradient header and any
   gradient strip, BlurView over content, the old AnimatedNumber, PremiumUnlockAd usage and the blur gate (all numbers
   visible), CO2 card, fuel tank gauge, yearly projection. Do NOT delete component files (PR 5 handles dead code)
   unless nothing imports them AND tsc stays clean.

## RTL and accessibility (this screen only)
- No writingDirection, no row-reverse, no marginLeft/Right (use marginStart/End), textAlign unset or 'left'.
- Wrap numbers, ₪ and km in `ltr()` from lib/text.ts: `export const ltr = (s: string) => '\u2066' + s + '\u2069';`
  The Odometer row itself is forced LTR (flexDirection 'row' inside a View with direction: 'ltr').
- Every touchable >= 44x44 (hitSlop if visually smaller), accessibilityRole + Hebrew accessibilityLabel on icon-only
  controls, result card has accessibilityLiveRegion="polite" and announces the final cost once (not every digit).
- Icons: lucide-react-native only, no emoji. Text sizes only from tokens.type (plus the 56pt cost); Hebrew never below 13
  except the 12pt price caption and tab labels.

## Do NOT
- Build from/to routing, the image share card, monthly history, EV comparison, the widget, or remove-ads (later phases).
- Change `vehicles` / `tripHistory` storage shapes, other screens, or the AdMob consent code.
- Use teal, blue or any gradient in this screen. Add dependencies beyond the two font packages.

## Done when
- All __check__ scripts pass; `npx tsc --noEmit` has no NEW errors (2 known ones in components/calculator/ResultsStep.tsx);
  `npm run lint` 0 errors; `npm run check:contrast` passes.
- grep in app/(tabs)/calculator.tsx and components/calc/: no "STEPS", "row-reverse", "writingDirection",
  "PremiumUnlockAd", "LinearGradient", "BlurView", "#009688", "#007AFF", "#8E8E93", "#999".
- Returning user flow = open app -> type km or tap a chip -> "חשב" -> cost visible: 2-3 interactions, no ad before result.
- Odometer runs at 60fps on a mid-range Android device (no JS-thread animation), and with Reduce Motion on shows the
  final value instantly.
- Screenshots (iOS + Android if available) in docs/screenshots/phase2/: normal (light only; app.json has dark
  mode off), no vehicle, offline, largest Dynamic Type. A short screen recording of pressing "חשב" if possible.
  If you cannot run a device/emulator, say so explicitly. Do not claim visual verification you did not do.

## Report back
Files changed, calculator.tsx line count before/after, check-script output, anything not verified, any deviation from the
preview and why. Commit per step with conventional messages. Do not push or open a PR.
