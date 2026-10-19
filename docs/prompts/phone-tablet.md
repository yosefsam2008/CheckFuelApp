# Agent prompt: phone and tablet sizing

Work on the branch `feat/history-redesign`, on top of commit `27d2958`. Do one commit per step and STOP after each step to report back.

## Goal

The calculator and History screens must look right on:
- small phones (320×568)
- regular phones (375–430 wide)
- tablets in portrait (768–1024 wide)

`app.json` sets `"supportsTablet": true` and `"orientation": "portrait"`. Today every card stretches edge to edge, so on an iPad the rows are 700pt wide and the chart bars float far apart.

The rule is the iOS readable-width approach:
- Backgrounds stay full width: the hero gradient, the screen background and the tab bar.
- The content column stops at a maximum width and is centered.
- Sizes do NOT scale up with the screen. Type, buttons and the 44pt targets stay the same on a tablet. A tablet simply shows more air around the column.

## Verified facts

- Card side gutters use `space.gutter` (16), defined at `constants/theme.ts:104`. The calculator cards are at `app/(tabs)/calculator.tsx:387`, and the route card at `components/calculator/RouteCard.tsx:257` uses `marginHorizontal: space.gutter`.
- The calculator CTA bar is at `calculator.tsx:391` and the toast at `calculator.tsx:392`. Both use `left`/`right`/`paddingHorizontal` and span the full width.
- The hero content (logo row, title, subtitle) sits in `components/calculator/HeroHeader.tsx` with `paddingHorizontal: 20`. The info halo is placed from the physical left edge (`HeroHeader.tsx`, the `left: 46 - 44` view).
- The bottom sheets come from `@gorhom/bottom-sheet`:
  - `components/calculator/InputSheet.tsx`
  - `components/calculator/VehicleSheet.tsx`
  - `components/calculator/ResultSheet.tsx`

  All three are full width today.
- No file in `app/(tabs)/calculator.tsx`, `app/(tabs)/history.tsx`, `components/calculator/*` or `components/history/*` uses `useWindowDimensions` or `maxWidth` for layout. `vehicles.tsx` and `addVehicleByPlate.tsx` have their own web-only `MAX_WIDTH`. Leave those two files alone: they get redesigned later.

## Steps

1. **Token.**
   - Add `maxContent: 600` to `space` in `constants/theme.ts:104`.
   - Add `components/layout/Column.tsx`, a `View` with `{ width: '100%', maxWidth: space.maxContent, alignSelf: 'center' }` that passes through `style` and `children`.
   - Nothing else changes in this step.
2. **Calculator.**
   - Wrap the cards column, the CTA bar's inner body and the toast in `Column`. The toast becomes centered with the column's width, not `left: 16, right: 16` on the whole screen.
   - In `HeroHeader`, keep the gradient full-bleed but put its inner content (logo row, title, subtitle, info halo) in a `Column`, so on a tablet the title lines up with the cards below it. The halo's position must follow the column's start edge, not the screen's left edge.
   - For the three bottom sheets, use `useWindowDimensions()`. When the width is above `space.maxContent + 2 * space.gutter`, set the sheet's `style` to `{ marginHorizontal: (width - space.maxContent) / 2 }` so the sheet sits over the column.
3. **History.** Apply the same treatment to `app/(tabs)/history.tsx`: the hero content, the cards, the toast and the banner all go in a `Column`. Check that `MonthChart` columns stay at least 44 wide at 320 and do not stretch beyond the column on a tablet.
4. **Small-phone pass at 320 wide.**
   - Read every row in the calculator and History screens that puts text next to a fixed-width element: the route card distance box (104 wide), the vehicle card's "החלף" pill, the trip row cost, and the summary's amount plus delta chip.
   - Make sure the text side has `flex: 1` and `minWidth: 0` together with `numberOfLines`, so long Hebrew strings truncate instead of pushing the fixed element off screen.
   - Let the summary's amount row wrap: the delta chip may drop below the amount when there is no room.

## Do NOT

- Do NOT scale fonts, icons, paddings or touch targets by screen width. No `PixelRatio` or percentage font sizes.
- Do NOT turn off `allowFontScaling`.
- Do NOT add a tablet-only layout: no two columns, no side-by-side calculator and result. One centered column.
- Do NOT change `orientation` or `supportsTablet` in `app.json`.
- Do NOT add dependencies, and do NOT touch `vehicles.tsx`, `addVehicle*.tsx`, `LegalScreen.tsx` or `UserGuideScreen.tsx`.
- Do NOT use `left`/`right`/`marginLeft`/`marginRight` for new layout. Use `start`/`end` and `marginStart`/`marginEnd`. The halo is the one exception: it is already physical-left by design inside an LTR zone, so keep it that way.
- Do NOT push, and do NOT open a PR.

## Done when

- `npx tsc --noEmit` exits 0.
- `npx eslint` on the touched files shows no errors or warnings.
- `grep -rn "maxWidth" "app/(tabs)/calculator.tsx" "app/(tabs)/history.tsx" components/calculator components/history` returns only `space.maxContent` usages, or nothing, because `Column` holds the rule.
- Every touched file is listed in the report with one line on what changed.

You can't render, so skip screenshots. I will check the result on web at 320×568, 375×812, 768×1024 and 1024×1366.
