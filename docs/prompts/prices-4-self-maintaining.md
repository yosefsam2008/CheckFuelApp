# Agent prompt 4: Make prices.json self-maintaining (no Claude, no scraping)

You are working in the repo `C:/Users/samoh/Documents/checkfuel-data` (GitHub `yosefsam2008/checkfuel-data`, Vercel project `yosefs-projects-c364cd14/checkfuel-data`, live at `https://checkfuel-data.vercel.app/prices.json`). Do NOT push or deploy. The user approves the push.

## Why

The owner is cancelling Claude next month, so nothing may depend on Claude: no scheduled agent, no routine and no reminder that needs an agent to act. `https://www.doralon.co.il/fuels-price/` now serves a Radware bot captcha, so it cannot be a source or a cross-check. Do not try to get past it. After this change the function must keep working for years without anyone touching it. When a human does need to fix something, they must be able to do it by editing two values in the GitHub web editor.

## Cancel the previous plan first

An earlier prompt asked for a monthly agent that re-anchors prices by itself. Drop it.
- Run `git branch -a` and `git log --oneline -5 <branch>` for `feat/auto-reanchor` and `feat/self-maintaining`. Commit `4be723f` on `feat/self-maintaining` only made `ANCHORS`/`FALLBACK` exported and parametrized for tests. It is superseded.
- Do not delete them. Tell the user they can be deleted.
- If you or an earlier session created a scheduled task or routine for prices (check with the `schedule` skill or scheduled-tasks tools), list it and ask the user before you delete it.
- Base your work on `fix/source-cbs` (commit `db45684`). It is `main` plus the CBS credit in `source`. Create branch `feat/self-maintaining-v2` from it.

## Current behavior (`api/prices.js` on `fix/source-cbs`)

- Fuel: `price = anchor.price + ((gate − anchor.gate) + (excise − anchor.excise)) / 1000 × 1.18`. The latest data.gov.il rows dated on or before today are used. The anchors hardcode `gate` and `excise`.
- Electric: `0.6352 × index / 104.7` from CBS series 120590. It **falls back forever** once CBS rebases (`baseDesc` changes).
- Sanity: a range check, plus **max 15% drift from the anchor**. If prices drift more than 15% over the years, the field freezes at its fallback and nobody fixes it. That is not acceptable without upkeep.
- Each field falls back on its own, and `computed[field]` says which ones did.

## Changes

1. **Anchors hold only a price and a date.**
   ```js
   Gasoline: { price: 7.77, date: '2026-10-05' }
   Diesel:   { price: 11.71, date: '2026-10-20' }
   Electric: { price: 0.6352, period: '2026-07' }
   ```
   The function looks up the gate and excise rows in effect on `anchor.date`, meaning the latest row dated on or before it, using the same rule as for today. It no longer hardcodes them. Raise the datastore `limit` from 20 to 300 so the history reaches back years. Today's values must not change: Gasoline 7.77, Diesel 11.71.
2. **Electric chains monthly % changes.** Fetch `https://api.cbs.gov.il/index/data/price?id=120590&format=json&download=false&last=120`. Each month in `month[0].date[]` has `year`, `month` and `percent` (the change from the previous month, which does not depend on the base). Price = `anchor.price × Π(1 + percent/100)` over the months after `anchor.period`. Throw (fall back) if `anchor.period` is not in the window. Today's result must be 0.64.
3. **Sanity on the result only.** Drop the 15% drift check. Use fixed ranges wide enough for years of normal drift but not for unit errors: Gasoline 4-15, Diesel 4-20, Electric 0.3-1.5. Keep exact product-name matching and `num()`.
4. **Header comment:** how to re-anchor. Change `price` and `date` (or `period`) only, and set `FALLBACK` to the same price.

Keep everything else exactly as it is: the response shape, `source`, headers, CORS, the rewrite, and the per-field fallback.

## Tests (`test/prices.test.mjs`, `node --test test/`, no network)

Update the fixtures so the anchor-date rows exist. Cover:
- The proof table: 8.25 on 2026-09-01, 7.75 on 2026-09-07, 8.27 on 2026-10-01 and 7.77 on 2026-10-05, using the real anchor.
- Diesel gives 11.71 at its anchor.
- A future-dated row is ignored.
- A missing anchor-date row falls back.
- A non-numeric price falls back.
- A fetch error falls back for that field only.
- A unit error (gate × 10) falls back.
- A legitimate +20% drift is **not** a fallback.
- Electric gives 0.64 for July −0.8%, Aug 0 and Sep 0. A later +2.0% month gives 0.6352 × 1.02.
- A CBS response whose `currBase.baseDesc` changed mid-window still computes.
- An anchor period missing from the window falls back.

## Live check

Import `GET` locally (`node -e`) against live data.gov.il and CBS. It must return `7.77 / 11.71 / 0.64` with all `computed` true. Paste the output.

## MAINTENANCE.md (Hebrew, in the repo root, short)

- **How to check health:** open `https://checkfuel-data.vercel.app/prices.json`. Any `computed.X: false` means that field is stuck on its fallback. Vercel → Logs shows `prices: X fallback: <reason>`.
- **When to re-anchor:**
  - Gasoline: the ministry's monthly price differs from ours (the marketing margin or VAT changed).
  - Diesel: about once a year, against real pump prices.
  - Electric: only if the tariff on the IEC bill differs by more than a couple of agorot.
- **How, in the GitHub web editor:** open `api/prices.js`, edit `price` and `date` in `ANCHORS` and the matching `FALLBACK` value, then commit to `main`. Vercel deploys in about a minute.
- **If a data.gov.il resource id or product name changes** (the field stays `computed: false`): where to find the new id at data.gov.il (`orl-prices`, `excise`) and which constant to edit.
- A plain calendar reminder (Google Calendar, twice a year) is enough. No AI needed.

## Done when

- `node --test test/` passes. Paste the summary.
- The live local run returns 7.77 / 11.71 / 0.64, all computed.
- Commit on `feat/self-maintaining-v2` with explicit paths.
- Report to the user:
  - The diff summary.
  - The branches they can delete.
  - Any scheduled routine found.
  - The exact push commands: `git checkout main`, `git merge feat/self-maintaining-v2`, `git push`, then `curl.exe https://checkfuel-data.vercel.app/prices.json`.
