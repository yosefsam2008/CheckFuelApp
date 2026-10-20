# Agent prompt 3 of 3: Price date, source and estimate label in the app, plus upkeep

You are working in `C:/Users/samoh/Documents/checkfuel`, an Expo SDK 54 app in Hebrew (RTL). **Precondition:** `git status` must show no modified tracked files. Untracked `docs/` is fine. If tracked files are modified, stop and ask the user to commit their own work first. Two of the files you edit, `FuelPriceDisplay.tsx` and `LegalScreen.tsx`, may be among them. Then create branch `feat/price-source` from the current branch. Commit with explicit paths, never `-a` or `git add .`. Do NOT push and do NOT open a PR.

## Live today (verified 2026-10-20)

`https://checkfuel-data.vercel.app/prices.json` returns:
```json
{"Gasoline":"7.77","Diesel":"11.71","Electric":"0.64","effectiveFrom":"2026-10-05",
 "computed":{"Gasoline":true,"Diesel":true,"Electric":true},"source":"data.gov.il, משרד האנרגיה"}
```
- The server is `C:/Users/samoh/Documents/checkfuel-data/api/prices.js`, deployed from that repo's `main`.
- How each price is made: `docs/prices-source.md`.
  - Gasoline: the regulated maximum, exact.
  - Diesel: an **estimate**. It is not price-controlled and is anchored on one station board.
  - Electric: tracks the CBS home-electricity index and lags 2-6 weeks.
- Old servers and old caches send only the three string fields. Every new field is optional.

## Tasks

1. **`lib/prices.ts`:**
   - Read `effectiveFrom`, `source` and `computed` when present. Pass them through `PriceResult` and the cache.
   - `computed` is an object `{ Gasoline, Diesel, Electric }` of booleans.
   - Leave the `parsePrices` ranges, the 12h cache and the fallback order exactly as they are.
   - Cached entries without the new fields must still load.
   - Extend `lib/check/prices.ts` with one case that has the new fields and one that does not. Run it.

2. **Price caption:** it is drawn in `components/calculator/FuelPriceDisplay.tsx` and `PriceStatus`. Check with grep for other places.
   - When `effectiveFrom` is present, show "מחיר מ-<dd.MM>".
   - **Diesel:** always add "· הערכה" to the caption, because there is no official diesel price.
   - **Any field with `computed[field] === false`:** the server fell back to a fixed value, so show it like the existing "מחיר משוער" state.
   - Keep the existing default and offline states (`docs/redesign/phase2-agent-prompt.md:109-111`).
   - Follow `docs/HANDOFF.md` and `constants/theme.ts`. Use no new colors and no new components.

3. **Attribution and legal:** `app/LegalScreen.tsx`. Also check the `legal/` folder and wherever else the text actually lives.
   - Name the sources:
     - Fuel: data.gov.il, משרד האנרגיה (gate prices and excise).
     - Electricity: הלמ"ס, the home-electricity price index.
   - State that:
     - Prices are an estimate.
     - Gasoline is the regulated self-service maximum.
     - Diesel is an estimate, and the price at the pump may differ.
   - `docs/screen-audit.md:179` flags this as missing.

4. **Server `source` string** (other repo, `C:/Users/samoh/Documents/checkfuel-data`):
   - Create branch `fix/source-cbs` from `main`.
   - In `api/prices.js`, change `source` to `'data.gov.il, משרד האנרגיה; הלמ"ס'`.
   - Run `node --test test/` and commit. Do not push.
   - Tell the user it needs a merge and push, and that the app does not depend on the exact text.

5. **Cleanup:**
   - Delete `server/checkfuel-data/` from this repo. It is a stale copy. The real project is `C:/Users/samoh/Documents/checkfuel-data`.
   - Grep for references to that path first, and fix any you find. One known reference is `docs/prompts/prices-2-cron.md`; leave that historical prompt as is.

6. **Docs:** commit `docs/prices-source.md` and `docs/prompts/prices-*.md`. They are untracked today.
   - At the top of `prices-source.md`, add one line: "Live since 2026-10-20 from `checkfuel-data/api/prices.js`".

7. **Monthly check:** ask the user whether to create a reminder with the `schedule` skill. Do not create it without a yes. The reminder:
   - Runs on the 2nd of each month at 09:00.
   - Fetches the live `prices.json`.
   - Asks the user to compare Gasoline with the ministry's monthly announcement (or doralon.co.il, 95 self-service), and Diesel with any station.
   - If either differs, re-anchor that field in `checkfuel-data/api/prices.js` (see the comment at its top). November is the first real test, if the October excise cut ends.

## Done when

- `lib/check/prices.ts` passes, and so does `node --test test/` in checkfuel-data.
- The calculator shows "מחיר מ-05.10". Diesel shows "הערכה". It looks unchanged with the old 3-field JSON.
- The legal text names both sources and the estimate wording.
- Report:
  - The commits on `feat/price-source` and on `checkfuel-data` `fix/source-cbs`.
  - The answer to the reminder question.
