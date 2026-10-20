# Fuel price sources (decision for prices.json)

Live since 2026-10-20 from checkfuel-data/api/prices.js

Researched 2026-10-20. Input for `docs/prompts/prices-2-cron.md`.

## Bottom line

| Field | Decision | Why |
|---|---|---|
| Gasoline | **Go: computed from two data.gov.il datasets** (see "Computed gasoline price" below) | Gate price (`orl-prices`) and excise (`excise`) are both in the open datastore API. Anchored on one verified price, the formula reproduces every known pump price to the agora. |
| Diesel | **Go as an estimate**: gate `סולר לתחבורה בהזרמה` + excise `בלו סולר` from the same datasets, anchored on one real station price | Not controlled, so the station margin is assumed constant. Needs one real price from the owner. Cost basis on 1.10: (3.880 + 3.503) × 1.18 = 8.71 before the station margin. |
| Electric | **Go**: CBS CPI sub-index 120590 "חשמל לצריכה ביתית" (open API) | The index tracks the regulated home tariff. It moved −0.8% in 2026-07, matching the 1.7 tariff change, and +1.2% in 2026-01. Anchor 0.6352 at 104.7. It lags 2-6 weeks. |

Diesel and Electric follow the rule in `docs/phase3-plan.md:294`: no stable machine-readable source means manual, not a scraper.

## Computed gasoline price (added 2026-10-20, supersedes the Gasoline "manual" detail below)

Excise **is** on data.gov.il: dataset `excise` ("מיסי הדלק (בלו)"), resource `bdce45e7-9fe9-473e-bd51-cef1d787a951`, row `בלו בנזין (סעיף 1 לתוספת לצו)`, ₪ per kiloliter, license Other (Open). It has a row per change date, including mid-month (2026-09-07, 2026-10-05).

```
pump = (gate + excise + M) × 1.18        gate = orl-prices row "בנזין 95 אוקטן נטול עופרת בהזרמה" / 1000
M = 7.77 / 1.18 − (3.11044 + 2.80906)     anchor: 2026-10-05, verified → M ≈ 0.6651
```

M is the marketing margin plus transport, which the datasets do not carry. Fixing it from one verified anchor is the same as the "delta" method: every later change in gate or excise moves the price by (Δgate + Δexcise) × 1.18.

| Date | gate (בהזרמה) | excise | computed | known |
|---|---|---|---|---|
| 2026-09-01 | 2.67131 | 3.65652 | 8.25 | 8.25 (old prices.json) |
| 2026-09-07 | 2.67131 | 3.23279 | 7.75 | (excise cut; explains the "+52 ag" in October) |
| 2026-10-01 | 3.11044 | 3.23279 | 8.27 | 8.27 (ministry PDF) |
| 2026-10-05 | 3.11044 | 2.80906 | 7.77 | 7.77 (anchor) |

Use the latest row of each dataset whose date ≤ today. Known gaps: a change in M itself (regulated, rare; it may be CPI-linked, not verified) or in VAT is not caught. Re-anchor when the ministry's monthly price differs from the computed one.

## Current official values

| Field | Value | Effective | Source |
|---|---|---|---|
| Gasoline 95 self-service, max incl. VAT | **7.77 ₪/L** | 2026-10-05 (8.27 on 1–4.10) | Excise cut of 42 ag + VAT = 0.50 ₪, announced 2026-10-04 by the PM and Finance Minister ([Mako](https://www.mako.co.il/news-money/2026_q4/Article-bf116184f0701a1027.htm), [News1](https://www.news1.co.il/Archive/001-D-524552-00.html)). The ministry's 5.10 notice could not be fetched (gov.il returns 403). The cut is set to expire at the end of October, so November will likely rise again. |
| Gasoline 95, monthly announcement | 8.27 ₪/L (7.01 before VAT), +52 ag | 2026-10-01 | [fuel-october-2026.pdf](https://www.gov.il/BlobFolder/news/fuel-october-2026/he/fuel-october-2026.pdf) |
| Diesel | not regulated | — | The live 10.74 has no recorded source. Check it by hand. |
| Electric (IEC home tariff) | 0.6352 ₪/kWh incl. VAT (0.5383 before VAT) | 2026-07-01 | Secondary source: [TheMarker guide](https://www.supermarker.themarker.com/bills/guides/electricity-tariff-2026). Not verified at the Electricity Authority (gov.il 403). |

**The live `prices.json` (`"Gasoline":"8.25"`) is stale.** It is September's price. The correct value today is **7.77**.

## Per-field detail

### Gasoline

- **Official pump price:** the monthly ministry announcement PDF `https://www.gov.il/BlobFolder/news/fuel-<month>-<yyyy>/he/fuel-<month>-<yyyy>.pdf`, plus the XLS page `https://www.gov.il/he/Departments/General/fuel_prices_xls`. Units: ₪ per liter, VAT (18%) included. It changes on the 1st of each month, and mid-month when the government changes excise (as on 2026-10-05).
  - The PDF downloaded with curl (200), but the XLS page and gov.il HTML pages return **403 (bot protection)**. The PDF filename is a guess pattern, and a mid-month change gets a separate notice under another name. pdftotext also loses the Hebrew text (font encoding), so only the numbers survive. This is not a stable feed.
- **data.gov.il CKAN `orl-prices`** (resource `aaa40832-ac82-4c86-bac6-0d05c83f576f`):
  - Format: the XLSX download URL redirects to a Google sign-in page. **The datastore JSON API works:** `https://data.gov.il/api/3/action/datastore_search?resource_id=aaa40832-ac82-4c86-bac6-0d05c83f576f&sort=_id%20desc&limit=20`
  - Fields: `תאריך`, `מוצר`, `יחידת מידה`, `מחיר`. Row `בנזין 95 אוקטן נטול עופרת במכלית`, units ₪ per **kiloliter**, excluding VAT, excise and marketing margin. Monthly (1st), `how_update: Manual`.
  - License: `Other (Open)` (`license_id: other-open`). data.gov.il terms (per its FAQ) allow free use but require the service to name the site, the dataset and its update date. Attribution text: `מקור: data.gov.il, משרד האנרגיה – "מחירים מחושבים לפי צו פיקוח…" (עודכן <date>)`.
  - **Deriving the pump price is not worth it.** Pump = (gate + transport + excise + marketing margin) × 1.18. October breakdown from the PDF: product 3.13 + margin 0.65 + excise 3.23 + VAT 1.26 = 8.27. Excise and margin are not in the dataset, and excise is exactly what changed on 5.10. Hardcoding them would publish wrong prices without any warning.
  - **Useful only as a change signal:** the dataset's `metadata_modified` moved to 2026-10-05, the day of the cut. Prompt 2 could poll `package_show?id=orl-prices` and send a "check fuel price" alert when it changes, in addition to the monthly reminder.

### Diesel

Confirmed: only 95-octane gasoline has a regulated maximum pump price. Diesel at the pump is not controlled (self-service or full service); each station sets its own price ([Walla](https://finance.walla.co.il/item/3809255); also the Knesset research paper on removing diesel price control). The data.gov.il row `סולר לתחבורה במכלית` (3,854.33 ₪/kL on 1.10) is a gate price, not a station price. Decision: **manual**. Base the value on a check of major-chain station prices when gasoline is updated.

### Electric

The 0.60 ₪/kWh is an assumption (home charging). Decision: **keep it as a constant**. Its reference is the IEC unified home tariff (0.6352 incl. VAT since 2026-07-01). The tariff changes rarely (an update formula with at least 3 months between changes). Consider raising it to 0.64. Public fast charging costs more and is not regulated.

## Sample parse (reproducible)

Downloads went to the scratchpad only. Python ran with `-I`.

```sh
# Ministry PDF (cross-check)
curl -sL -A "Mozilla/5.0" -o oct.pdf https://www.gov.il/BlobFolder/news/fuel-october-2026/he/fuel-october-2026.pdf   # 200
pdftotext -layout oct.pdf oct.txt
#  -> "(01.10.2026) ... 95 ... 52 ... 8.27"; "7.01 ... 44" (pre-VAT); breakdown 3.13 / 0.65 / 3.23 / 1.26 = 8.27

# gov.il XLS page
curl -s -o /dev/null -w "%{http_code}" https://www.gov.il/he/Departments/General/fuel_prices_xls   # 403

# CKAN
curl -s "https://data.gov.il/api/3/action/resource_show?id=aaa40832-ac82-4c86-bac6-0d05c83f576f"
#  -> last_modified 2026-10-05T09:06:21, how_update Manual, Frequency Month, datastore_active true
curl -s "https://data.gov.il/api/3/action/datastore_search?resource_id=aaa40832-ac82-4c86-bac6-0d05c83f576f&limit=1000&sort=_id%20desc"
#  -> total 228; latest date 2026-10-01:
#     בנזין 95 אוקטן נטול עופרת במכלית   3085.55 ₪/kL  (= 3.09 ₪/L, gate, no tax)
#     סולר לתחבורה במכלית                3854.33 ₪/kL
```

Cross-check: 8.27 / 1.18 = 7.008 → 7.01, which matches the PDF. The 5.10 cut: (excise 3.23 − 0.42) gives 0.42 × 1.18 = 0.50, so 8.27 − 0.50 = 7.77, which matches the news reports.

## Open item

The project is `https://vercel.com/yosefs-projects-c364cd14/checkfuel-data` (per the owner). Neither the Vercel MCP nor the local Vercel CLI is authorized for that scope (403 / "scope does not exist"), so its files were not inspected. `prices.json` is served as a static file (ETag, `Content-Disposition: filename="prices.json"`). The live file shows `Last-Modified: 2026-10-20 11:18 GMT`, which is a redeploy, not a content change. The owner needs to say which account or repo hosts it.
