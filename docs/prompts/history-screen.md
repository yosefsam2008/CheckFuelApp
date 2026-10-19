# Agent prompt: History screen redesign

You are working in `C:\Users\samoh\Documents\checkfuel`, an Expo SDK 54 / React Native app in Hebrew (RTL) that calculates the fuel cost of a trip. Branch: `restore/tab-bar-info`. Create a new branch `feat/history-redesign` from it and work there.

## Goal

Rebuild `app/(tabs)/history.tsx` in the design language of the finished calculator screen. The approved design is the interactive preview `docs/redesign/history-preview.html` (version 3). Open it in a browser and use it as the spec for layout, copy and motion. Where this prompt and the preview disagree, this prompt wins.

## Read first

1. `docs/HANDOFF.md`: design decisions. `constants/theme.ts` is the source of truth for color, radius, spacing, shadow and font (Heebo only).
2. `docs/redesign/history-preview.html`: the approved screen. The "תנועה" table at the bottom lists every animation and its duration.
3. `docs/phase3-plan.md` section 3.4: the monthly summary algorithm.
4. The calculator, which defines the design language: `app/(tabs)/calculator.tsx`, `components/calculator/HeroHeader.tsx`, `components/calculator/VehiclePriceCard.tsx` (card, title and sub styles), `components/calculator/SlidingDigits.tsx`, `components/calculator/PressableScale.tsx`, `constants/motion.ts`, `constants/rtl.ts`.

## Verified facts (file:line)

- Trips are stored in AsyncStorage under the key `tripHistory` as a JSON array of `TripRecord` (`types/trip.ts:1-17`). `history.tsx:86` reads it, `history.tsx:131` writes it after a delete, `history.tsx:144` removes it on "clear all".
- New trips are saved by the calculator at `app/(tabs)/calculator.tsx:247-275`, with `id: Date.now().toString()` and `timestamp: Date.now()`. Old records may lack `timestamp`. The fallback is `Number(id)`.
- `history.tsx:38-51` declares its own copy of `TripRecord`. Use the one in `types/trip.ts` instead.
- The current screen has a details `Modal`, a separate delete-confirm modal plus an `Alert.alert` (the double confirmation, `history.tsx:551-615`), and a clear-all modal (`history.tsx:618-660`). All of these go away.
- `lib/calc/history.ts` already has `loadTrips()` (line 37) and `removeTrip(id)` (line 32). `saveTrip()` (line 25) dedupes within 10 minutes, so do NOT use it to restore a trip on undo. Write `tripHistory` directly for undo and clear-all.
- `components/trip/*` (TripCard, TripDetailsModal, DeleteConfirmModal, EmptyState, Toast) is imported by nothing (`grep -rn "components/trip" app components hooks lib` returns no hits). Leave these files alone. They are removed in the dead-code PR.
- `app/(tabs)/_layout.tsx:135` sets `headerShown: true` for all tabs, and line 156 turns it off for the calculator because its hero has its own brand row and info button. History needs the same.
- `components/calculator/HeroHeader.tsx:11` takes only `onInfo`. The title and subtitle are hardcoded at lines 31-36. The info button opens the menu through `useOpenInfoMenu()` (`hooks/use-info-menu.ts:5`), as the calculator does at `calculator.tsx:41`.
- `constants/motion.ts:30-36` `useEnter(delay)` always animates. `components/calculator/SlidingDigits.tsx:11-16` always springs. Neither checks `useReducedMotion()`. `app/_layout.tsx` sets `<ReducedMotionConfig mode={ReduceMotion.Never} />`, so Reanimated does not skip anything by itself. `useLoop` (`constants/motion.ts:50-66`) shows the pattern to follow: read `useReducedMotion()` and set the final value directly.
- Theme tokens: `colors` at `constants/theme.ts:62`, `radius` at 102, `space` at 104, `shadow` at 106, `Heebo` at 112. Selected state uses `selectedFill`, `selectedBorder` and `selectedText`. Destructive text uses `colors.error`.
- The calculator toast (pill, dark, bottom) is at `calculator.tsx:340-349`, styled as `styles.toast`, with auto-hide at lines 277-281.
- `lib/format.ts:2` `formatAmount(n, decimals)` formats `1234.5` as `"1,234.50"`.
- Installed and allowed: `react-native-svg` 15.12.1, `react-native-reanimated` ~4.1.1, `lucide-react-native`. The banner ad is `components/BannerAd.tsx` and is web-guarded in `history.tsx:35`.
- Hebrew strings for errors: `LEGAL_UI_STRINGS.errors.apiError` (`legal/LEGAL_UI_STRINGS_HE.ts:93`).

## Screen spec (from the approved preview)

Top to bottom, inside one `ScrollView` with background `colors.bg`:

1. **Hero:** `HeroHeader` with title "כמה הוצאתי על דלק?" and subtitle "כל שקל על הכביש, במבט אחד". Same gradient, logo, info halo.
2. **Summary card:** overlaps the hero by 44 (same as `RouteCard`), radius `radius.card`, `shadow.card`, padding 24.
   - Eyebrow: "החודש · אוקטובר 2026" for the current month, otherwise "ספטמבר 2026". 13, `Heebo.medium`, `textMuted`.
   - Amount: `SlidingDigits` with prefix ₪, about 40pt, `Heebo.black`, LTR. Whole shekels.
   - Delta chip on the same row, end side: "+33% מספטמבר", neutral (`colors.bg` fill, `colors.text`). Not green, not red. Hidden when the previous month total is 0.
   - Stats: "753 ק״מ · 15 נסיעות", 15pt, numbers bold in `colors.text`, the rest `textMuted`.
   - Projection: "צפי לסוף החודש: ₪780", only for the current month and only from day 7 (rounded to 10).
   - Divider, then a 6-month bar chart drawn with `react-native-svg`. The newest month is at the LEFT end (time runs right to left). Bars 26 wide, top corners radius 4, `selectedFill`. The selected month's bar is `selectedText` and has its value above it. Month labels are 3 letters plus ׳ below. Tapping a bar selects that month. Each bar's hit area is the whole column, at least 44 wide.
3. **Trips card:** header "נסיעות באוקטובר" and "15 נסיעות" at the end. Then one row per trip of the selected month, newest first, with inset dividers (24 from each side). Not a card per trip.
   - Collapsed row, min height 84, padding 20/24: line 1 "היום · 10:01" / "אתמול · 08:40" / "12.10 · 18:22" (16, semi-bold), line 2 "39 ק״מ" (14, muted). Cost "₪3.98" at the end (18, extra-bold, LTR). Chevron after it.
   - Tapping a row expands it in place. Only one row is open at a time. Details sit in a `colors.bg` block with label/value lines: רכב (name + model, LTR), דלק שנצרך / חשמל שנצרך, צריכה (ק״מ לליטר, or קוט״ש ל־100 ק״מ for electric), עלות לק״מ, סוג אנרגיה (בנזין / סולר / חשמל).
   - Under the details: a "מחק נסיעה" text button (`colors.error`, trash icon). Tapping it swaps in place to "למחוק את הנסיעה?" with [ביטול] [מחק]. That single confirmation is the only one.
   - After a delete: the row slides out and collapses, the amount rolls to the new total, and a toast "הנסיעה נמחקה" with a "ביטול" action shows for 4 seconds. Undo writes the trip back.
   - At the bottom of the card: "מחק את כל ההיסטוריה", the same inline single confirmation ("למחוק את כל N הנסיעות?" [ביטול] [מחק הכל]), with the same undo toast.
4. **Banner ad** below the cards, as the calculator does.
5. **Empty state** (no trips): only the summary card, with the history icon in a tile, "עוד אין נסיעות שמורות", "אחרי חישוב, לוחצים "שמור" והנסיעה מופיעה כאן עם סיכום חודשי." and a "לחישוב ראשון" pill that navigates to the calculator tab.

## Motion (all ≤700ms; under Reduce Motion everything is instant)

| Moment | What moves | Duration |
|---|---|---|
| Screen focus | hero title and subtitle, summary card, trips card, the first rows: `useEnter` with staggered delays (0, 60, 120, 240, then 280 + 40·i, capped at 520) | 400ms |
| Amount | `SlidingDigits` rolls from 0 on first show, and from the old value on month change or delete | spring.digit |
| Chart | bars grow from the baseline, 40ms apart, starting at 200 | ≤650ms total |
| Month change | amount rolls, the selected bar scales to 1.06 and back, the list slides 24px in from the side of the newer or older month and fades in | 300ms |
| Row open | height animates, chevron rotates 180°, detail lines fade-rise 30ms apart | 300ms |
| Press | rows and buttons scale (PressableScale) | 150ms |
| Delete | row slides 30px and fades while its height goes to 0, then the toast rises in | 300ms |
| Info button | the existing halo | loop |

Haptics: `haptic.select` on bar tap, `haptic.press` on delete confirm. Nothing else.

## Steps (one commit per step)

1. **Pure logic with a check.** Create `lib/calc/monthly.ts` with no react-native imports:
   - `tripTime(t)`: `t.timestamp`, else `Number(t.id)`.
   - `monthKey(ts)`: `year * 12 + month`.
   - `monthSummary(trips, key, now)`: `{ trips, total, km, count, deltaPct, projection }`, exactly as in plan 3.4.
   - `lastMonths(trips, now, n = 6)`: `[{ key, total }]`.
   - `dayLabel(ts, now)`.

   Never read `record.date`. Add `lib/calc/check/monthly.ts` with `node:assert`, covering:
   - month boundaries (23:59 on the last day, 00:00 on the 1st)
   - the January to December year boundary for `deltaPct`
   - records without `timestamp`
   - Feb 29 2028
   - projection null on day 6 and set on day 7
   - `deltaPct` null when the previous month is 0

   Run it with `npx ts-node --compiler-options {\"module\":\"commonjs\"} lib/calc/check/monthly.ts`.
2. **Shared motion respects Reduce Motion.**
   - In `useEnter` (`constants/motion.ts:30`) and `Digit` in `SlidingDigits.tsx:11`, read `useReducedMotion()` and assign the final value directly when it is true.
   - Add optional `title` and `subtitle` props to `HeroHeader`, defaulting to the current calculator copy, so the calculator renders exactly as before.
3. **History components.** Create `components/history/MonthSummary.tsx`, `components/history/MonthChart.tsx` and `components/history/TripRow.tsx`. Build them from theme tokens only, with no new hex values, no numeric radii, and no fonts outside `Heebo`.
4. **Screen.**
   - Rewrite `app/(tabs)/history.tsx` with these components. Load on focus with `loadTrips()`, and wrap every storage call in try/catch with the `apiError` toast.
   - Set `headerShown: false` for the history tab in `app/(tabs)/_layout.tsx`, as line 156 does for the calculator.
   - Replace its MaterialIcons tab icon only if the calculator tab's icon was replaced. Otherwise leave it.

## Do NOT

- Do NOT change the `tripHistory` key, the `TripRecord` shape, or `calculator.tsx`.
- Do NOT use `Modal`, `Alert.alert` or any second confirmation step.
- Do NOT add dependencies.
- Do NOT use `row-reverse`, `writingDirection` (except inside the existing `SlidingDigits`), `marginLeft`/`marginRight`, `left`/`right` for layout, or `textAlign: 'right'`. Use `marginStart`/`marginEnd`. Wrap numbers, ₪ and vehicle names in `LTR` from `constants/rtl.ts`.
- Do NOT add a gradient anywhere except the hero. No colored stripes, no emoji, no card per trip, no centered body text.
- Do NOT add confetti, bounces, loading spinners or any animation over 700ms.
- Do NOT change `ReducedMotionConfig` in `app/_layout.tsx`. That is a separate decision.
- Do NOT delete `components/trip/*` or other dead code.
- Do NOT push, and do NOT open a PR.

## Done when (each is checkable)

- `npx tsc --noEmit` exits 0.
- `npm run lint` shows 0 errors and no new warnings in the files you touched.
- All check scripts pass:
  - `lib/calc/check/monthly.ts`
  - `lib/tripCost.check.ts`
  - `lib/check/prices.ts`
  - `lib/ads/check/policy.ts`
  - `lib/calc/check/defaultVehicle.ts`
  - `lib/calc/check/history.ts`
- `npm run check:contrast` passes.
- `grep -nE "Modal|Alert\.|\.date\b|row-reverse|writingDirection|marginLeft|marginRight|textAlign: 'right'" "app/(tabs)/history.tsx" components/history/*.tsx` returns nothing.
- `grep -nE "#[0-9A-Fa-f]{3,6}" "app/(tabs)/history.tsx" components/history/*.tsx` returns nothing.
- Every pressable in the new files is at least 44pt tall, or has `hitSlop` that reaches 44. Every icon-only control has a Hebrew `accessibilityLabel`. Chart bars have `accessibilityRole="button"` and a label like "אוקטובר: ₪481".
- `git diff --stat` touches only:
  - `app/(tabs)/history.tsx`, `app/(tabs)/_layout.tsx`
  - `components/history/*`, `components/calculator/HeroHeader.tsx`, `components/calculator/SlidingDigits.tsx`
  - `constants/motion.ts`
  - `lib/calc/monthly.ts`, `lib/calc/check/monthly.ts`
- `npx expo start --web` renders the screen. Include screenshots in your report of:
  - the current month
  - a past month selected
  - a row open
  - the delete confirmation
  - the empty state

## Report back

- The list of commits.
- The output of every command under "Done when".
- Any place where you departed from the preview, and why.
- Anything you could not verify, such as on-device behavior, haptics, or Reduce Motion on a real phone.
