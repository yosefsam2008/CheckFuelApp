# Agent prompt: Vehicles screen and Add Vehicle screen redesign

You are working in `C:\Users\samoh\Documents\checkfuel`. It is an Expo SDK 54 / React Native app in Hebrew (RTL) that calculates the fuel cost of a trip. The current branch is `feat/history-redesign`. Create a new branch `feat/vehicles-redesign` from it and work there. Do NOT push and do NOT open a PR.

## Goal

Rebuild two screens in the design language of the finished calculator and history screens:

1. `app/(tabs)/vehicles.tsx`: the vehicle list.
2. A single new add-vehicle screen, `app/addVehicle.tsx`, that replaces both `app/addVehicleByPlate.tsx` and the current `app/addVehicle.tsx`. It has plate lookup and manual entry behind one segmented control.

The approved designs are interactive previews. Open them in a browser and use them as the spec for layout, copy and motion:
- `docs/redesign/vehicles-preview.html`
- `docs/redesign/add-vehicle.html`

Where this prompt and a preview disagree, this prompt wins.

## Read first

1. `docs/HANDOFF.md`: the design rules. `constants/theme.ts` is the source of truth for color, radius, spacing, shadow and font (Heebo only).
2. Both previews above. The "תנועה" table at the bottom of each lists every animation and its duration.
3. The finished history screen is the closest model to copy from. It shows the hero, the overlapping card, rows that expand in place, the single inline delete confirmation and the undo toast: `app/(tabs)/history.tsx` and `components/history/TripRow.tsx`.
4. The calculator design language: `components/calculator/HeroHeader.tsx`, `components/calculator/PressableScale.tsx`, `components/calculator/SlidingSegment.tsx`, `components/calculator/CalculateButton.tsx` (gradient CTA), `constants/motion.ts`, `constants/rtl.ts`, `components/history/LtrText.tsx`.

## Verified facts (file:line)

**Storage and vehicle model**
- Vehicles are stored in AsyncStorage under the key `vehicles` as a JSON array of `Vehicle` (`lib/data/vehiclesData.ts:2-27`). Do not change this format.
- `avgConsumption` holds km/L for Gasoline and Diesel. It holds **kWh per km** for Electric and PHEV, for example `0.17`. The UI shows and accepts kWh per 100 km, so multiply by 100 to display and divide by 100 to save.

**Default vehicle**
- The calculator reads `lastVehicleId` from AsyncStorage at `app/(tabs)/calculator.tsx:74` and writes it at line 81.
- If the stored id is no longer in the list, the calculator falls back to `vehicles[0]` (`calculator.tsx:71-77`). That means deleting the default vehicle needs no extra handling in the calculator.
- `lib/calc/defaultVehicle.ts` has the same fallback rule, plus a match on the most recent trip.

**Current vehicles screen** (`app/(tabs)/vehicles.tsx`, 1,292 lines)
- It has a details/edit `Modal` (lines 395-564) and a separate delete-confirm `Modal` (lines 567-611). Both go away.
- It lets the user change the fuel type (lines 481-508). The new screen does not, because the fuel type comes from the registry.
- The add button pushes `/addVehicleByPlate` (line 382).
- Hardcoded `#009688` and `writingDirection` are used throughout. None of these survive.

**Tab and stack layout**
- `app/(tabs)/_layout.tsx:129` sets `headerShown: true` for all tabs. Lines 150 and 158 turn it off for the calculator and history, because their heroes have their own brand row. The `vehicles` entry at line 164 needs the same.
- In `app/_layout.tsx:66-68` the stack registers `addVehicleByPlate` and `addVehicle`, with `headerShown: false`. Remove the `addVehicleByPlate` entry when you delete that file.
- The only caller of `/addVehicleByPlate` outside the file itself is `vehicles.tsx:382`. `components/ButtonStyleGuide.tsx:177` mentions the name only in a description string, so leave it alone.

**HeroHeader**
- `components/calculator/HeroHeader.tsx:11-19` takes `onInfo`, `title` and `subtitle`. It always draws the info halo.
- The add screen needs a back button in that spot instead. Add an optional `onBack` prop. When it is set, draw a 44x44 round button with a chevron, `accessibilityLabel="חזרה"`, in place of the halo, on the side the previous screen sits.
- The info button opens the info menu through `useOpenInfoMenu()`, as `history.tsx:56` does.

**Plate lookup** (`app/addVehicleByPlate.tsx`)
- `fetchRecordByPlate` is at lines 134-156. It queries 3 data.gov.il resources (`VEHICLE_APIS`, lines 59-63) and **swallows every error into `null`**. As a result, "no network" and "not found" look the same today.
- It has no timeout.
- The rest of the lookup runs inline in the press handler, lines 503-686: a duplicate-plate check, `parseRelevantFields`, the weight and CC fallbacks, the WLTP check, the EV and ICE consumption estimates, and building the `Vehicle` object. It then saves immediately (line 658) and calls `router.back()`. There is no review step.
- `fetchRecordByPlate`, `parseRelevantFields` and `extractEngineCC` are exported. The `Root` and `index` screens may import them, so grep for them before you move anything: `grep -rn "addVehicleByPlate" app components lib tools`.

**Manual entry** (current `app/addVehicle.tsx`)
- The manufacturer list is at lines 35-40, and the autocomplete filters it with `startsWith` at line 67.
- Validation is at lines 89-110. It uses `isNaN(Number(...))`, so `"6,5"` is rejected. That is the known comma-decimal bug.
- The save at line 128 uses `parseFloat`. For Electric it saves the raw value with no /100, while its placeholder asks for kWh/km.

**Motion, tokens and copy**
- `constants/motion.ts:30-36` `useEnter(delay)` already respects `useReducedMotion()`. `haptic` is at lines 39-44. `dur` is at line 22 and `ease` at line 24.
- The root layout sets `<ReducedMotionConfig mode={ReduceMotion.Never} />` (`app/_layout.tsx:60`). Reanimated therefore skips nothing by itself, so every new animation must check `useReducedMotion()`.
- Theme tokens: `colors` at `constants/theme.ts:62`, `radius` at 102, `space` at 104, `shadow` at 106, `Heebo` at 112.
- The CTA gradient is `colors.ctaGradient` (see `CalculateButton.tsx:55`).
- Destructive text uses `colors.error`. The selected state uses `selectedFill`, `selectedBorder` and `selectedText`.
- The toast with undo is copied from `history.tsx` (lines 221-236 and the `toast` styles).
- The error string for a failed write is `LEGAL_UI_STRINGS.errors.apiError`.

**Tests**
- There is no test runner. Checks are `node:assert` scripts, run with `npx ts-node --compiler-options {\"module\":\"commonjs\"} <file>`. See `lib/tripCost.check.ts` for the pattern.

## Screen 1: Vehicles (`app/(tabs)/vehicles.tsx`)

The screen is one `ScrollView` on `colors.bg`.

1. **Hero:** `HeroHeader`, title "הרכבים שלי", subtitle "הרכב במסגרת הירוקה נפתח במחשבון".

2. **Vehicle cards:** one card per vehicle, `radius.card`, `shadow.card`, 12 apart. The first card overlaps the hero by 44.
   - **Default vehicle:** the card whose id equals `lastVehicleId` has a 1.5 `colors.selectedBorder` border. If no id is stored, the first vehicle is the default. There is no badge or tag, only the border.
   - **Collapsed card,** padding 18/20, one row from start to end:
     - A 48x48 tile, radius 14, with the vehicle icon (lucide `Car`, `Bike` or `Truck` by `type`). The tile has a soft tint by fuel type:
       - Gasoline: fill `#FFF1DB`, icon `#B86A00`
       - Diesel: fill `#E6EDF6`, icon `#34557D`
       - Electric and PHEV: fill `colors.guideFill`, icon `colors.guideText`

       Add these four new values to `constants/tokens.ts`. Run `npm run check:contrast` if the script exists, and make sure the icon colors pass 3:1 on their fill.
     - The name: 17, `Heebo.extra`, LTR, one line with an ellipsis.
     - Under the name: "דיזל · 2021" (14, muted, year in LTR).
     - At the end: the consumption as a large number (20, `Heebo.extra`, LTR, 1 decimal) with the unit under it (11, muted). The unit is "ק״מ לליטר", or "קוט״ש ל־100 ק״מ" for electric. If the value is missing, show "—".
     - Then a chevron that rotates 180° when the card is open.
   - **Expanded card:** tapping the card expands it in place, the same way as `TripRow`. Only one card is open at a time.
     - A `colors.bg` block with label/value lines: מספר רישוי (LTR, "—" if empty), דגם, מנוע, שנת ייצור, סוג דלק (בנזין / דיזל / חשמלי / פלאג־אין), צריכה.
     - If the card is not the default, a full-width `selectedFill` pill "קבע כברירת מחדל". It writes `lastVehicleId`, fires `haptic.select()`, moves the green border, and shows the toast "<name> נקבע כברירת מחדל".
     - An actions row with "מחק רכב" (error text, trash icon) at the start and "ערוך" (ghost pill) at the end.
   - **Edit,** in place: two fields, "שם הרכב" and "צריכה ממוצעת (<unit>)", with [ביטול] and [שמור].
     - Accept a comma or a dot as the decimal separator.
     - Reject values ≤ 0 or non-numbers by keeping the old value.
     - For electric, convert from per 100 km back to per km.
     - Save writes `vehicles`, then shows the toast "השינויים נשמרו".
   - **Delete:** "מחק רכב" swaps in place to "למחוק את הרכב?" with [ביטול] and [מחק]. That is the only confirmation.
     - After a delete, the card collapses out, and a toast "הרכב נמחק" with a "ביטול" action shows for 4 seconds.
     - Undo puts the vehicle back at its old index. If it was the default, undo restores `lastVehicleId` too.
     - If you delete the default vehicle, write `lastVehicleId` as the next vehicle's id, or remove the key when the list is empty.
   - All writes are optimistic. If the write fails, revert the state and show the error toast, as `history.tsx` `remove()` does.

3. **Add card,** after the last vehicle card: a dashed 1.5 `#C7C7CC` border, `radius.card`, no fill, minimum height 72. It has a `selectedFill` tile with a plus icon, "הוספת רכב" (bold, `selectedText`) and "לפי מספר רישוי או ידנית" (muted). It pushes `/addVehicle`.

4. **Banner ad** below, as `history.tsx` does.

5. **Empty state:** a single card with the car tile, "עוד אין רכבים", and "מקלידים מספר רישוי ואנחנו מביאים את הדגם, סוג הדלק והצריכה ממשרד הרישוי. אפשר גם להוסיף ידנית." Under it, a full-width `ctaGradient` button "הוספת רכב" with a plus icon. It is the only gradient on this screen.

6. Reload on focus with `useFocusEffect`, so a vehicle added on the add screen shows up immediately.

## Screen 2: Add Vehicle (`app/addVehicle.tsx`, replaces both files)

1. **Hero:** `HeroHeader` with `onBack={router.back}`, title "הוספת רכב", subtitle "מספר רישוי ממלא הכל לבד. אין? מוסיפים ידנית."

2. **One card** overlapping the hero, padding 16/20, containing:
   - `SlidingSegment` with "לפי מספר רישוי" (the default) and "ידנית", height 52.

3. **Plate tab:**
   - Title "מה מספר הרישוי?" with the sub "נביא את הדגם, סוג הדלק והצריכה ממאגר משרד התחבורה."
   - **Plate field:** 64 high, centered, 28 `Heebo.extra`, LTR, numeric keyboard, `maxLength` 10.
     - It is plain, with no yellow.
     - It formats while typing: 7 digits as `12-345-67`, 8 digits as `123-45-678`.
   - **"חפש" button:** a full-width `ctaGradient` button. It is disabled under 7 digits. While searching it shows a small spinner and "מחפש…". There is no loading screen and no ad before or during the search.
   - **Duplicate plate:** "הרכב הזה כבר שמור אצלך" as a message, not a toast.
   - **Found:** a `colors.bg` block that enters with `useEnter`.
     - It shows the tile, the name (LTR), and "2022 · בנזין · 1.8 Hybrid".
     - Two editable fields: "שם הרכב", and "צריכה ממוצעת" with the unit shown inside the field at its end.
     - The hint "הערכה לפי משקל ומנוע. אם אתם יודעים את הצריכה האמיתית, עדיף לתקן."
     - Then "שמור רכב" (gradient). The "חפש" button is hidden in this state.
     - Editing the plate returns the screen to idle.
   - **Not found:** a message block with a search icon, "לא מצאנו רכב עם המספר הזה", and "כדאי לבדוק את המספר. רכבים חדשים מאוד, אופנועים ורכבים מיובאים לא תמיד מופיעים במאגר." Under it, a link "הוספה ידנית עם המספר הזה". The link switches to the manual tab with the plate prefilled and "פרטים נוספים" open.
   - **Offline:** a message block with a wifi-off icon, "אין חיבור לאינטרנט", and "החיפוש צריך רשת. אפשר לנסות שוב, או להוסיף ידנית." Under it, a link "נסה שוב".

4. **Manual tab:**
   - Title "פרטי הרכב" with the sub "שלושה שדות חובה, וזהו."
   - **Required fields:**
     - יצרן, with autocomplete from the existing manufacturer list: up to 4 suggestions under the field, each row 44 high.
     - סוג דלק: three equal buttons, בנזין / דיזל / חשמלי, using the selected-state tokens.
     - צריכה ממוצעת. The unit changes with the fuel: ק״מ לליטר, or קוט״ש ל־100 ק״מ.
   - **"פרטים נוספים · לא חובה":** a collapsible section, closed by default, with דגם, מספר רישוי, and מנוע and שנת ייצור side by side.
   - **"שמור רכב":** a gradient button, disabled until the required fields are valid. A comma decimal is accepted.
   - **Saved vehicle:** `type: 'car'`, `id: Date.now().toString()`. For electric, `avgConsumption` is value/100. Empty optional strings are saved as `""`, and the year defaults to the current year, as today.

5. **On save, both tabs:**
   - Append to `vehicles` and set `lastVehicleId` to the new id.
   - Fire `haptic.success()`, then `router.back()`.
   - The vehicles screen shows the toast "הרכב נשמר ונבחר כברירת מחדל". Pass it with a route param or a simple flag read on focus, whichever is smaller.
   - If the write fails, show an error message and stay on the screen.

## Required refactor for the lookup

Move the lookup logic out of the component into `lib/vehicles/plateLookup.ts`. Move it, do not rewrite it, and keep every fallback and estimate exactly as it is. The module exports:

```ts
export type LookupResult =
  | { status: 'found'; vehicle: Vehicle }
  | { status: 'notfound' }
  | { status: 'offline' };
export async function lookupPlate(plate: string, opts?: { timeoutMs?: number; fetchImpl?: typeof fetch }): Promise<LookupResult>;
```

- **Normalize** the plate to digits only before querying.
- **Timeout:** 8 seconds for the whole lookup, through one `AbortController` shared by all three requests.
- **offline vs. notfound:** if every one of the three data.gov.il requests throws (a network error or an abort), the result is `offline`. If at least one returned HTTP OK with no record and none found the plate, the result is `notfound`. Change `fetchRecordByPlate` so it can report this. Keep its exported name working for any other caller you find with grep.
- **No saving:** `lookupPlate` does not save. Saving happens in the screen, after the user reviews the result.
- **`__DEV__` logs:** keep them, or drop the box-drawing banners. Do not add new ones.

Add `lib/vehicles/plateLookup.check.ts`, a `node:assert` script with a stubbed `fetchImpl`, covering:
1. Plate formatting and normalization: `"12-345-67"` and `"1234567"` give the same query.
2. All three requests reject: the result is `offline`.
3. One returns an empty `records` array and the others reject: the result is `notfound`.
4. A request never resolves: the result is `offline` once the timeout passes. Use `timeoutMs: 50` in the test.

Put the pure consumption-input helpers in a small `lib/vehicles/consumption.ts` and cover them in the same check file or a sibling one:
- `parseDecimal("6,5") === 6.5`
- `toStored(17, 'Electric') === 0.17`
- `toDisplay(0.17, 'Electric') === 17`
- `toStored(15.5, 'Gasoline') === 15.5`
- `parseDecimal("abc")` is `null`
- `parseDecimal("0")` is rejected by the validation

## Motion (all ≤700ms; under Reduce Motion everything is instant)

| Moment | What moves | Duration |
|---|---|---|
| Vehicles screen focus | Hero title and subtitle, then the cards one after another with `useEnter`: delays 0, 60, then 160 + 70·i, capped at 450. The add card comes last. On the first show only, like `history.tsx` `Enter`. | 400ms |
| Consumption number | Counts up from 0 to its value on the first show, ease-out cubic, 250ms delay | 600ms |
| Open or close a card | Height expands, the chevron rotates, the detail lines follow 30ms apart (copy `TripRow`) | 300ms |
| Edit or confirm swap | Fade in place | 200ms |
| Set as default | The border color moves to the new card, `haptic.select()` | 200ms |
| Delete | The card collapses out, then the toast with undo | 300ms |
| Add screen tab switch | `SlidingSegment` indicator, the content fades | 300ms |
| Lookup result | The result block enters with `useEnter` | 400ms |
| Press | `PressableScale` on every tappable card and button | 150ms |

## Do NOT

- Do not change the `vehicles` storage format or the meaning of `avgConsumption`.
- Do not change any consumption estimate, fallback or the data.gov.il resource ids.
- Do not show an ad before or during the plate lookup. Do not add a rewarded gate.
- No `row-reverse`, no `writingDirection`, and no `left`/`right` margins or padding. Use `start`/`end`, and wrap numbers, ₪ and plates in LTR with `LtrText`.
- No gradients other than the hero and the gradient CTA buttons named above. No colored stripes. No emoji.
- Do not add dependencies.
- Do not touch the calculator, the history screen, the info menu, `LegalScreen` or `FirstLaunchModal`.
- Do not delete `components/ButtonStyleGuide.tsx` or any other dead code that is not listed here. That is a separate PR.
- Do not push and do not open a PR.

## Steps, one commit each

1. `refactor(vehicles): extract plate lookup with timeout and offline/notfound` adds `lib/vehicles/plateLookup.ts`, `lib/vehicles/consumption.ts` and the check scripts. The old screen still works, calling `lookupPlate` and then saving as before.
2. `feat(ui): HeroHeader back button and fuel tint tokens`.
3. `feat(vehicles): rebuild vehicles screen with cards, inline details and default`, which includes the `_layout.tsx` `headerShown: false` change.
4. `feat(vehicles): single add-vehicle screen with plate lookup and manual entry` deletes `app/addVehicleByPlate.tsx`, removes its stack entry and points every link at `/addVehicle`.

## Done when

- [ ] `npx tsc --noEmit` shows no new errors. Two known errors exist in old dead code. List them in your report.
- [ ] `npx expo lint` shows no new warnings in the files you touched.
- [ ] Both check scripts pass with `npx ts-node --compiler-options {\"module\":\"commonjs\"} <file>`.
- [ ] `grep -rn "addVehicleByPlate" app components lib hooks` returns only `ButtonStyleGuide.tsx`.
- [ ] `grep -n "writingDirection\|row-reverse\|#009688\|Modal" "app/(tabs)/vehicles.tsx" app/addVehicle.tsx` returns nothing.
- [ ] `app/(tabs)/vehicles.tsx` is under 350 lines.
- [ ] On web (`npx expo start --web`), the following all work:
  - add a vehicle by plate, both found and not found
  - add a vehicle manually with "6,5"
  - set a default and see the calculator open with it
  - edit, delete and undo
  - the empty state
- [ ] Every tappable element is at least 44pt and every icon-only button has a Hebrew `accessibilityLabel`.

## Report back

For each step, give the commit hash. Then list:
- the files changed
- the `tsc` and lint output
- the check script output
- anything in this prompt you could not do or chose to do differently, and why
- which callers of `fetchRecordByPlate` and `parseRelevantFields` you found and how you kept them working
