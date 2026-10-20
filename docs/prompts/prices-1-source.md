# Agent prompt 1 of 3: Fuel price source (research, no app code)

You are working in `C:\Users\samoh\Documents\checkfuel`, an Expo app in Hebrew that calculates the fuel cost of a trip. Do NOT push and do NOT open a PR. Do not change app code in this step.

## Goal

Pick one official, machine-readable source for each price in `prices.json` and write the decision down. Prompt 2 builds the automatic update on top of this decision, so it must be specific: URL, format, field, units, and how often the source changes.

## What exists today (verified)

- The app reads `https://checkfuel-data.vercel.app/prices.json`, which returns `{"Gasoline":"8.25","Diesel":"10.74","Electric":"0.60"}` (strings, ILS per liter or per kWh). `lib/prices.ts:38-41` (`parsePrices`) rejects values outside these ranges: Gasoline and Diesel 1-20, Electric 0.2-3.
- Nobody updates this file automatically. It is uploaded by hand. `server/checkfuel-data/` holds only `api/route.js` (Google Routes proxy). The real `checkfuel-data` Vercel project may be a separate repo. Find out where `prices.json` lives there (Vercel MCP `list_projects` / `list_deployment_files`, or ask the user).
- `docs/phase3-plan.md:284-294` holds the original plan. Its rule: if no stable machine-readable source exists, stay manual with a monthly reminder. Do not build a fragile scraper.

## Leads to check (unverified)

1. data.gov.il CKAN dataset `orl-prices`: "מחירים מחושבים לפי צו פיקוח... מחירים מרביים למוצרי נפט בשער בית זיקוק". It is an XLSX file, resource `aaa40832-ac82-4c86-bac6-0d05c83f576f`, license "Other (Open)", last modified 2026-10-05. These are **refinery-gate** prices, not the price at the pump. Check whether the station price can be derived from it and whether that is worth the effort.
2. gov.il `https://www.gov.il/he/Departments/General/fuel_prices_xls`: the price formula and monthly prices as XLS.
3. The monthly ministry announcement PDF, for example `https://www.gov.il/BlobFolder/news/fuel-october-2026/he/fuel-october-2026.pdf`. It is reliable but PDF, so use it only as a cross-check.
4. Diesel: as far as I know, only 95-octane self-service is price-controlled at the pump in Israel. Confirm this. If diesel is not controlled, there is no official station price. Decide between an official proxy and keeping it manual, and say which.
5. Electric (0.60 ILS/kWh) is an assumption, not a regulated price. Decide whether it stays a constant (likely) and where its number comes from (for example the IEC home tariff).

## Check right away

A news report says the October 2026 price rose by about 52 agorot over September's 8.25. If that is true, the live `prices.json` (8.25) is stale today. Confirm the current official 95 price from the ministry. If it differs, tell the user the exact number and its source so they can upload it by hand now. Do not upload it yourself.

## Deliverable

`docs/prices-source.md`, short, with:
- For each of Gasoline, Diesel and Electric: source URL, format, the exact cell/field, units, VAT included or not, update cadence, license and attribution text, or "manual" with the reason.
- The current official values and their effective date.
- A sample parse: the commands you ran and the values you got. They must match the ministry announcement.
- A clear go / no-go for automation per field.

## Rules

- Download data files only into the scratchpad, never into the repo. Run any Python with `-I`.
- Read each source's terms of use. Quote the license name and the required attribution.
- If no source is stable and machine-readable, say so plainly. "Manual with a reminder" is a valid result.
