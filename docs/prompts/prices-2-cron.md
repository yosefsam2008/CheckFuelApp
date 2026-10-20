# Agent prompt 2 of 3: Prices computed from official open data

You are working in the repo `C:/Users/samoh/Documents/checkfuel-data` (GitHub `yosefsam2008/checkfuel-data`, Vercel project `yosefs-projects-c364cd14/checkfuel-data`, served at `https://checkfuel-data.vercel.app`). Create a branch. Do NOT push, deploy or open a PR. The user merges and deploys.

## What is there today (verified 2026-10-20)

- `public/prices.json` is the served file. The root `prices.json` (8.05 / 10.00 / 0.64) is an old leftover that nothing reads.
- `updatePrices.js` scrapes `doralon.co.il/fuels-price/` with a regex, and `.github/workflows/update.yml` runs it on the 1st of each month and commits. It has three problems:
  1. **The workflow is `disabled_inactivity`.** GitHub turned it off, so it did not run on 2026-10-01. That is why the live price is September's 8.25.
  2. **The Diesel regex matches `בנזין 98`, not `סולר`.** The "Diesel" 10.74 was really 98-octane gasoline.
  3. It runs monthly only, so it missed the mid-month excise changes on 2026-09-07 and 2026-10-05. It also scrapes a private company's site.
- `api/route.js` is the Google Routes proxy. Do not touch it.

**Replace all of this** with the stateless function below. Delete `updatePrices.js`, `.github/workflows/update.yml`, the root `prices.json` and `public/prices.json`. The static file must go, or Vercel serves it instead of the rewrite. Before you delete anything, check that `vercel.json` or the project setup does not depend on these files.

## Read first

`C:/Users/samoh/Documents/checkfuel/docs/prices-source.md`, the section "Computed gasoline price". It has the formula, the dataset ids and the 4-row proof table. That table is your test fixture.

## Three fields, three anchors

All three fields work the same way. Start from one verified anchor price, then move it by official open data: `price = anchor + Δ(official inputs)`.

| Field | Inputs | Formula | Anchor |
|---|---|---|---|
| Gasoline | data.gov.il gate `בנזין 95 אוקטן נטול עופרת בהזרמה` + excise `בלו בנזין (סעיף 1 לתוספת לצו)` | `A.price + ((gate−A.gate)+(excise−A.excise))/1000 × 1.18` | 7.77, 2026-10-05, gate 3110.44, excise 2809.06 |
| Diesel | same resources, rows `סולר לתחבורה בהזרמה` and `בלו סולר` | same formula | 11.71, 2026-10-20, gate 3879.94, excise 3503.33. This is a station board showing 11.97 at full service, minus the 0.26 full-service surcharge seen on 95 (8.03 − 7.77). Another chain lists 20.37, an outlier treated as a list price. |
| Electric | CBS CPI sub-index 120590 "חשמל לצריכה ביתית", `https://api.cbs.gov.il/index/data/price?id=120590&format=json&download=false&last=3` (field `month[0].date[0].currBase.value`) | `A.price × index / A.index` | 0.6352 at index 104.7 (tariff of 2026-07-01, index for 2026-07..09) |

Notes:
- **Diesel** is not price-controlled, so its result is an **estimate**: the station's own margin is assumed constant. Say so in `source`.
- **Electric** lags. CBS publishes around the 15th of the next month, so a tariff change shows up 2-6 weeks late. That is acceptable, because the tariff changes 1-2 times a year. The index uses the base of the latest CBS base period. If CBS rebases (the `base` field changes), the formula breaks. Detect this and fall back.
- Each field is computed and validated on its own. One field failing must not block the others.

## Goal

`https://checkfuel-data.vercel.app/prices.json` returns all three prices computed from official open data (data.gov.il and CBS). It updates itself when the gate price, the excise or the electricity index changes, including mid-month, and never publishes a bad number.

## Design: stateless, no cron, no storage

The anchor fixes the margin, so the price is a pure function of the two latest data.gov.il rows. No database, Blob or secret is needed.

- **`api/prices.js`** (same style as `api/route.js`: plain `export function GET`, `Response.json`, CORS `*`):
  1. Constants at the top:
     - `FALLBACK = { Gasoline: '7.77', Diesel: '11.71', Electric: '0.64' }`
     - `ANCHORS` per the table above (gate and excise in ₪/kL).
     - `VAT = 1.18`.
     - One comment on how to re-anchor.
  2. Fetch all inputs in parallel (both data.gov.il resources, plus CBS) with an 8s timeout each. Use `datastore_search` with `q` = the exact row name, `sort=_id desc`, and `limit=20`. Then filter by exact `מוצר` match (q is full-text, so it also returns other rows) and take the latest row with `תאריך` ≤ now:
     - gate: resource `aaa40832-ac82-4c86-bac6-0d05c83f576f`, row `בנזין 95 אוקטן נטול עופרת בהזרמה`
     - excise: resource `bdce45e7-9fe9-473e-bd51-cef1d787a951`, row `בלו בנזין (סעיף 1 לתוספת לצו)`
  3. Compute `price = ANCHOR.price + ((gate − ANCHOR.gate) + (excise − ANCHOR.excise)) / 1000 × VAT`, rounded to 2 decimals.
  4. Sanity, per field: the result must be in the app's range (`lib/prices.ts:38-41`: Gasoline and Diesel 1-20, Electric 0.2-3) and within 15% of its anchor. On any failure (fetch error, missing row, bad number, sanity failure), that field returns its `FALLBACK` value with status 200 and log the reason with `console.error`, so the app never breaks.
  5. The response keeps the existing string fields exactly (`Gasoline`, `Diesel`, `Electric`), because shipped apps parse them. Add only:
     - `effectiveFrom`: the gasoline row date.
     - `computed`: `{ Gasoline, Diesel, Electric }` booleans.
     - `source`: `"data.gov.il, משרד האנרגיה"`.
  6. Headers: `Cache-Control: public, s-maxage=21600, stale-while-revalidate=86400`. The CDN then hits data.gov.il about 4 times a day per region, and a data.gov.il outage serves the last good copy.
- **`vercel.json`:** add a rewrite `/prices.json` → `/api/prices`, so the URL the apps use does not change. Check how the project serves `public/` today (output directory setting) so the rewrite actually takes over.
- **Formula location:** put the pure formula (rows in → price or error out) in its own exported function, so the test can call it without the network.

## Test

Add `api/prices.test.mjs`, run with `node --test`. Use no network. Cases:
- The 4 rows of the proof table produce 8.25, 7.75, 8.27 and 7.77.
- A row dated in the future is ignored.
- A missing row returns FALLBACK.
- A gate price giving a result above 15% from the anchor returns FALLBACK.
- A non-numeric `מחיר` returns FALLBACK.
- Electric: index 104.7 gives 0.64, a CBS rebase or missing value returns FALLBACK for Electric only, and the other fields stay computed.
- Diesel at the anchor inputs returns 11.71.

Then run the real function once against live data.gov.il and CBS (locally, for example `node -e` importing the handler). Report the values. Gasoline must be 7.77 today. Cross-check it against `https://www.doralon.co.il/fuels-price/` by eye in a browser (95 self-service: 7.77). Do not scrape it.

## Done when

- The tests pass. Paste the output.
- The live local run returns 7.77.
- Write deploy steps for the user at the top of `api/prices.js` or in your final message, in this order:
  1. Merge the branch and push. Vercel deploys from Git; confirm this in the project settings.
  2. Deploy.
  4. `curl https://checkfuel-data.vercel.app/prices.json` shows `computed.Gasoline: true` and `computed.Electric: true`.
- Remind the user how to re-anchor. Gasoline: when the ministry's monthly price differs from the computed one (the margin or VAT changed). Diesel: about twice a year, against a real station price. Electric: when CBS rebases.
