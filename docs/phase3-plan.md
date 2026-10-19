# CheckFuel – תוכנית עבודה שלב 3: עיצוב מחדש ופיצ'רי צמיחה

מבוסס על: `docs/ui-audit-phase1.md`, `docs/screen-audit.md`, האודיט החזותי (מותג נעול) וקריאת הקוד בענף `feat/bottom-tab-bar`.

**החלטות שכבר התקבלו ולא נפתחות מחדש:**
- סרגל טאבים תחתון עם 3 טאבים (מחשבון, היסטוריה, רכבים) וכפתור מידע במקום תפריט המבורגר (commit `1bdd16c`). התוכנית הזו לא מבטלת את הסרגל, בניגוד להמלצה ב־`screen-audit.md` §6.1.
- צבעי המותג (ירוק, טורקיז וכחול מהלוגו) נשארים. מוסיפים רק גוונים כהים יותר במקומות שבהם יש טקסט על הצבע.
- מבנה הנתונים ב־AsyncStorage (`vehicles`, `tripHistory`) לא משתנה. מותר להוסיף מפתחות חדשים, אסור לשבור מפתחות קיימים.

**עובדות מהקוד שמשנות את התוכנית:**
- מחיר דלק חי **כבר קיים**: `calculator.tsx:659` מושך את `checkfuel-data.vercel.app/prices.json`. מה שחסר הוא שמירה במטמון (cache), timeout, ועדכון אוטומטי של הקובץ בצד השרת. בנוסף, המחיר מוצג כרגע כשלב נפרד באשף.
- חישוב הצריכה (`calculateAdjustedConsumption`) תקין, ומשתמשים בו כמו שהוא.
- יש באג ברכב חשמלי: המחיר שהמשתמש עורך לא משפיע על התוצאה (`calculator.tsx:907` קורא את `electricityPrice`, אבל ממשק העריכה כותב ל־`fuelPrice`).
- `TripRecord.date` נשמר כמחרוזת מקומית (`he-IL`). לכל חישוב לפי תאריך משתמשים רק ב־`timestamp`.
- אין test runner. יש `ts-node` ב־devDependencies, אז הבדיקות יהיו סקריפטים עם `assert`.

---

## 0. תהליך עבודה וסקילים

### כללי עבודה
- **PR אחד לכל שלב משנה (למשל 1.2).** ענף בשם `feat/p<שלב>-<שם>`, ו־merge ל־`main` רק אחרי בדיקה על מכשיר.
- **לוגיקה טהורה עוברת ל־`lib/`.** כל אלגוריתם בתוכנית הוא פונקציה טהורה ב־`lib/`, ולצדה סקריפט בדיקה `lib/**/__check__/*.ts` שרץ עם `npx ts-node`. הקומפוננטה רק קוראת לפונקציה.
- **צילומי לפני/אחרי לכל מסך שמשתנה:** RTL, טקסט גדול (Dynamic Type) ומצב כהה אם הופעל. נשמרים ב־`docs/screenshots/<שלב>/`.
- **הגדרה של "גמור":** `npx tsc --noEmit` עובר, `npm run lint` עובר, סקריפטי ה־check עוברים, וצילום מסך נבדק על iOS ועל Android.

### סקילים לפי שלב

| מתי | סקיל / כלי | למה |
|---|---|---|
| לפני כל מסך חדש | `app-design-master` | עיצוב לפי HIG, ‏RTL ונגישות. מריצים אותו על המסך לפני הקוד ואחריו |
| אופציונלי, לפני שלב 2 | `figma:figma-generate-design` + `figma:figma-use` | מוקאפ של מסך המחשבון החדש ב־Figma לפני שכותבים קוד, כדי לחסוך סבבים |
| אחרי שלב 1.1 | `figma:figma-generate-library` | רק אם רוצים שה־tokens יחיו גם ב־Figma. אחרת לדלג |
| בכל PR | `ponytail-review` או `/code-review medium` | סקירת נכונות לפני merge |
| אחרי PR גדול | `/simplify` | ניקוי כפילויות |
| לפני שחרור (שלבים 1.6, 3.2, 4.3) | `/security-review` | מפתחות API בפרוקסי, הסכמת פרטיות ונתונים שנשלחים החוצה |
| בדיקה ויזואלית | `run` | הרצה וצילום מסך של האפליקציה |
| סוף כל שלב | `ponytail-debt` | רשימת קיצורי הדרך (`shortcut:`) שנדחו |
| ניקוי קוד מת | `ponytail-audit` | אימות שאין importers לפני מחיקה |

---

## שלב 1: יסודות (מותג, נגישות, ציות)
**מטרה:** האפליקציה עוברת App Review ואת דרישות הנגישות בלי שינוי בפריסה.

### 1.1 קובץ tokens אחד: `constants/theme.ts`
הקובץ הקיים לא בשימוש, ולכן מחליפים את התוכן שלו.

```ts
export const color = {
  brandGreen: '#34C759',   onBrandGreenText: '#1E7B34',  // white on #1E7B34 = 5.33:1
  brandTeal:  '#009688',   onBrandTealText:  '#00796B',  // 5.32:1
  brandBlue:  '#007AFF',   link:             '#0062CC',  // 5.80:1
  textPrimary: '#1C1C1E',  textSecondary: '#6E6E73',     // 5.07:1 on white
  warningFill: '#FF9500',  warningText: '#B25000',       // 5.20:1
  surface: '#FFFFFF', background: '#F2F2F7', separator: '#E5E5EA',
} as const;
export const type = { hero: 34, title: 22, body: 17, secondary: 15, caption: 13, tabLabel: 12 } as const;
export const space = { xs: 4, s: 8, m: 12, l: 16, xl: 24, xxl: 32 } as const;
export const radius = { s: 8, m: 14, l: 20, pill: 999 } as const;
```

**אלגוריתם בדיקת ניגודיות** (`scripts/contrast-check.ts`, לפי WCAG 2.x):
```
lin(c)    = c/255 ≤ 0.04045 ? (c/255)/12.92 : ((c/255+0.055)/1.055)^2.4
L(hex)    = 0.2126·lin(R) + 0.7152·lin(G) + 0.0722·lin(B)
ratio(a,b)= (max(La,Lb)+0.05) / (min(La,Lb)+0.05)
assert: ratio ≥ 4.5 for every text pair, ≥ 3.0 for large text / icons
```
הסקריפט עובר על רשימת זוגות (צבע טקסט ורקע) מתוך `theme.ts`, ונכשל אם זוג כלשהו יורד מתחת לסף. מריצים אותו בכל שינוי צבע.

**מעבר לקובץ:** מחליפים את `COLORS` ב־`calculator.tsx:197`, את הצבעים ב־`(tabs)/_layout.tsx` ואת הצבעים ב־`FirstLaunchModal.tsx` בייבוא מ־`theme.ts`. ב־PR הזה לא משנים שום ערך חוץ מטקסט על צבע ומטקסט משני.

**קבלה:** `grep -rn "#8E8E93\|#999\|#AEAEB2" app components` מחזיר 0 תוצאות.

### 1.2 נגישות: IconButton וגודל לחיצה
- מרחיבים את `components/ActionButton.tsx` (הוא בשימוש) ומוסיפים `IconButton` מבוסס `Pressable`, עם `accessibilityLabel: string` כ־prop **חובה** בטיפוס, `accessibilityRole="button"` ו־`hitSlop` מחושב.
- **אלגוריתם hitSlop:** `pad = max(0, (44 - size) / 2)`, ואז `hitSlop = {top: pad, bottom: pad, left: pad, right: pad}`. האייקון לא גדל.
- מחליפים כל ✕ ו־› שמשמשים ככפתור, את כפתור הסגירה של ה־toast (`calculator.tsx:548`) ואת כפתור הסגירה ב־`LegalScreen.tsx:632`.
- בחירת רכב: `accessibilityState={{ selected }}`.

**קבלה:** VoiceOver ו־TalkBack מקריאים כל כפתור בשמו, ואין כפתור שמוקרא סתם כ"כפתור".

### 1.3 מצב כהה: הצהרה כנה
`app.json` מוגדר כ־`"userInterfaceStyle": "automatic"`, אבל הצבעים קבועים לבהיר. משנים ל־`"light"` (שורה אחת). מצב כהה אמיתי נדחה לשלב 5.

### 1.4 טאב בר: ניקוי
ב־`(tabs)/_layout.tsx:110-119`:
- מוחקים את `height` הקבוע ואת `tabBarItemStyle.width: 80`.
- צבע טאב פעיל `#00796B` עם אייקון מלא, צבע טאב לא פעיל `#6E6E73`.
- תווית הטאב: `maxFontSizeMultiplier: 1.3`.

**קבלה:** הסרגל לא נחתך באייפד ולא כשגודל הטקסט מוגדר ל־XXL.

### 1.5 מחיקת קוד מת
`components/ui/*`, `components/trip/*`, `components/calculator/*`, `ButtonStyleGuide.tsx`, `haptic-tab.tsx`, `themed-*`, `app/Toast.tsx` (נוצר ממנו route בטעות), סגנונות שלא בשימוש ב־`_layout.tsx:164-167`, ו־`hooks/useAdTracking.ts`.
- **נוהל:** לכל קובץ מריצים `grep -rn "from.*<name>" app components lib hooks`. רק אם יש 0 תוצאות, מוחקים. אחרי זה `tsc` (שתי השגיאות הקיימות אמורות להיעלם).
- תלויות: `firebase`, `@radix-ui/*`, `vaul`, `embla-carousel-react`, `lucide-react` (גרסת ה־web), `react-day-picker`, `class-variance-authority` ו־`tailwind-merge`. מסירים רק אחרי grep. אם משתמשים ב־firebase לאנליטיקה בשלב 4.4, משאירים אותו.

### 1.6 ציות: פרטיות והסכמה (חוסם שחרור)
1. **טקסט פרטיות:** לתקן את `LegalScreen.tsx:82-89` ואת `FirstLaunchModal.tsx:155-157`. הטקסט צריך להזכיר את AdMob ואת `checkfuel-data.vercel.app`, ולהסיר את הטענה ש"אין שיתוף עם צד שלישי". מארחים את המדיניות ב־URL ציבורי (למשל עמוד סטטי ב־Vercel) ומזינים אותו ב־App Store Connect וב־Play Console.
2. **UMP (הסכמת GDPR):** `react-native-google-mobile-ads` כבר מותקן, ויש בו `AdsConsent`. אלגוריתם בהפעלה:
   ```
   info = await AdsConsent.requestInfoUpdate()
   if info.isConsentFormAvailable && info.status === REQUIRED:
       await AdsConsent.loadAndShowConsentFormIfRequired()
   if (await AdsConsent.getConsentInfo()).canRequestAds:
       mobileAds().initialize()        // רק כאן, פעם אחת (היום מאותחל פעמיים: _layout.tsx:25, index.tsx:13)
   ```
3. **ATT:** נדרש רק אם מבקשים פרסומות מותאמות אישית. היום הקוד משתמש ב־`requestNonPersonalizedAdsOnly`. **לאמת** בהנחיות App Review העדכניות. אם נדרש, מוסיפים `userTrackingUsageDescription` לפלאגין של AdMob ב־`app.json`.
4. **"מחק את הנתונים שלי"** בכפתור המידע: `AsyncStorage.multiRemove` על כל המפתחות של האפליקציה, ואחרי זה חזרה למסך הפתיחה.

**סקיל:** `/security-review` לפני merge.

---

## שלב 2: זרימת הליבה – מחשבון במסך אחד
**מטרה:** משתמש חוזר מגיע לתוצאה ב־1–2 לחיצות במקום 7. זה הפיצ'ר עם ההשפעה הגדולה ביותר.

**סקילים:** `app-design-master` על המוקאפ לפני הקוד. אופציונלי: מוקאפ ב־Figma.

### 2.1 פריסת המסך
```
┌ כותרת: לוגו + "CheckFuel"                    ⓘ ┐
│ [שבב רכב: מאזדה 3 · 15.2 ק"מ/ל'  ▾]            │
│ [מאיפה → לאן]  או  [___ ק"מ]  [הלוך-חזור ⇄]     │
│ קיצורים: 10 · 25 · 50 · 100 · מסלולים שמורים    │
│                                                │
│          ₪ 47.30        ← 34pt, המספר היחיד בגודל הזה │
│     3.1 ל' · ₪1.89 לק"מ · מחיר: ₪7.29 (חי ●)     │
│ [ שתף ]  [ חלק ל־N ]  [ שמור ]                  │
│ ▸ מתקדם: סגנון נהיגה · סוג דרך · מזגן · מחיר     │
│ ▸ השוואה: מונית · אוטובוס · רכב חשמלי            │
│ ─ באנר (המקום שלו שמור מראש) ─                   │
└────────────────────────────────────────────────┘
```

### 2.2 אלגוריתם: חישוב חי
מוציאים את `handleCalculate` (`calculator.tsx:854-958`) לפונקציה טהורה `lib/calc/tripCost.ts`:
```
computeTrip(input: {distanceKm, roundTrip, vehicle, price, prefs}) -> Result | {error}
  d = roundTrip ? distanceKm*2 : distanceKm
  validate: 0 < d ≤ 10000, vehicle.avgConsumption > 0, 0 < price ≤ 100
  adj = calculateAdjustedConsumption(base(vehicle), {...prefs, climate:'hot', vehicleCondition:'good'})
  if Electric: energy = d/100 * adj;  cost = energy * price.electric     // תיקון הבאג: אותו price שמוצג
  else:        energy = d / max(adj, 0.1); cost = energy * price.fuel[vehicle.fueltype]
  return {totalCost: cost, energy, costPerKm: cost/d, distance: d, breakdown}
```
- בקומפוננטה: `const result = useMemo(() => computeTrip(...), [deps])`. החישוב סינכרוני וזול, אז אין צורך ב־debounce.
- כשהקלט לא תקין לא מציגים toast. ה־hero מציג "—" עם שורת הסבר קצרה.
- **אנימציית המספר:** אינטרפולציה של 250ms מהערך הקודם לחדש. אם `AccessibilityInfo.isReduceMotionEnabled()` מחזיר true, קופצים ישר לערך הסופי. המספר מוצג עם `fontVariant: ['tabular-nums']`.
- **בדיקה:** `lib/calc/__check__/tripCost.ts`: ‏100 ק"מ ב־20 ק"מ/ל' ומחיר 7 נותנים ₪35. הלוך־חזור מכפיל ב־2. ברכב חשמלי, שינוי המחיר משנה את התוצאה. 0 ק"מ מחזיר שגיאה.

### 2.3 אלגוריתם: בחירת רכב ברירת מחדל
```
defaultVehicle(vehicles, trips, lastVehicleId):
  if vehicles empty -> null  (המסך מציג CTA "הוסף רכב לפי מספר רישוי")
  if lastVehicleId ∈ vehicles -> it
  t = trips.maxBy(timestamp); if t && match(vehicles, t.vehicleName+t.vehicleModel) -> it
  return vehicles[0]
```
מפתח חדש: `lastVehicleId`, שנכתב בכל פעם שהמשתמש בוחר רכב. המפתח `calculatorProgress` כבר לא נדרש: קוראים אותו פעם אחת כדי לשחזר את המרחק, ואז מוחקים.

### 2.4 אלגוריתם: מקור המחיר (חי, ואז מטמון, ואז ברירת מחדל)
מוציאים ל־`lib/prices.ts`:
```
getPrices():
  cached = AsyncStorage['pricesCache'] -> {prices, fetchedAt}
  if cached && now - fetchedAt < 12h: return {prices: cached, source:'cache'}   // ובמקביל מרעננים ברקע
  try fetch(PRICES_URL, AbortController timeout 5s)
      validate: every value is a finite number in [1, 20] (fuel) / [0.2, 3] (kWh)
      save cache; return {source:'live'}
  catch: return cached ? {source:'cache-stale'} : {DEFAULT_FUEL_PRICES, source:'default'}
```
- בממשק: נקודה ירוקה ליד "מחיר חי". במצב cache-stale מוצג "מחיר מ־<תאריך>". במצב default מוצג "מחיר משוער" בצבע `warningText`.
- עריכה ידנית של המחיר מתבצעת בתוך "מתקדם" בלבד. שלושת ממשקי המחיר הקיימים מתאחדים לשבב אחד.

### 2.5 שמירה להיסטוריה
היום הנסיעה נשמרת רק בלחיצה על "שמור וחשב מחדש". במצב החדש:
- כפתור "שמור" מפורש, ו־toast עם "בטל" ל־4 שניות.
- **אלגוריתם מניעת כפילויות:** אם הרשומה האחרונה זהה ב־(רכב, מרחק, עלות מעוגלת לשקל) ונשמרה לפני פחות מ־10 דקות, לא שומרים שוב.
- הסכמה (schema) של `TripRecord` לא משתנה. מוסיפים שדה אופציונלי `route?: {from, to}`.

### 2.6 מחיקות במסגרת השלב
- האשף על כל 5 השלבים (`STEPS`), נקודות ההתקדמות, `calculatorProgress` ושכבת החגיגה.
- **מנעול ה־premium** (טשטוש של נתונים משניים מאחורי פרסומת מתגמלת). הוא נפתח גם בלי שהמשתמש קיבל את התגמול, וזו בעיה גם מול App Review. כל הנתונים גלויים.
- כרטיס CO₂ ומד המכל. השנתי והחודשי עוברים למסך ההיסטוריה (שלב 3.4).

### 2.7 RTL במסך הזה בלבד
המסך נבנה מחדש, ולכן נכתב ישר נכון:
- `flexDirection: 'row'` בלי `row-reverse`.
- `marginStart/End` במקום `marginLeft/Right`.
- אין `writingDirection`.
- `textAlign` לא מוגדר, או `'left'` (שמתהפך ל־start ב־RTL).
- מספרים, ₪ ולוחיות רישוי עטופים ב־`ltr()`:
  ```ts
  export const ltr = (s: string) => `⁦${s}⁩`; // LRI…PDI: digits/₪ stay in order inside RTL text
  ```
- **אחרי השלב:** מריצים `app-design-master` במצב audit על המסך.

### 2.8 פרסומות מחוץ לנתיב הערך
**אלגוריתם הגבלת interstitial** (`lib/ads/policy.ts`):
```
shouldShowInterstitial(state, now):
  trigger only on "חישוב חדש"/מעבר טאב — לעולם לא לפני הצגת תוצאה
  return state.calcsSinceLast ≥ 3 && now - state.lastShownAt ≥ 180s && state.sessionShown < 2
load timeout: 4s → אם לא נטען, מוותרים (היום אין timeout ומשתמש נתקע ב"מכין תוצאות")
```
- באנר אחד, מתחת לפירוט, עם `minHeight` שמור מראש כדי שהפריסה לא תקפוץ.
- פרסומת מתגמלת: נשארת רק אם יש לה ערך אמיתי (שלב 4.3). הפתיחה מותנית ב־`EARNED_REWARD` בלבד.
- **בדיקה:** `__check__/adPolicy.ts` עם תרחישי זמן.

**קבלה לשלב 2:** משתמש חוזר: פותח את האפליקציה, מקליד מרחק, ורואה מחיר. לכל היותר 2 אינטראקציות, ואין פרסומת לפני התוצאה.

---

## שלב 3: פיצ'רי צמיחה

### 3.1 חלוקה בין נוסעים
```
split(totalCost, n):           // n ∈ [2, 8]
  perPerson = ceil(totalCost * 100 / n) / 100      // מעגלים כלפי מעלה לאגורה, כדי שהנהג לא יפסיד
  display  = n ≥ 2 ? `₪${perPerson} לכל אחד (${n})` : ''
```
- הממשק: stepper של ‎− n +‎ בכרטיס התוצאה. נשמר כ־`lastSplitN`.
- בדיקה: 100 חלקי 3 נותן 33.34, ו־10 חלקי 4 נותן 2.50.

### 3.2 כרטיס שיתוף כתמונה (מנוע הצמיחה)
- **תלויות חדשות:** `react-native-view-shot` ו־`expo-sharing`. אין ספרייה מותקנת שיודעת לצלם View. ‏view-shot דורש dev build, וזה כבר המצב (`expo-dev-client`).
- **אלגוריתם:**
  1. מרנדרים `<ShareCard>` מחוץ למסך (`position:absolute; opacity:0`) בגודל 1080×1350.
  2. `captureRef(ref, {format:'png', quality:0.9})`.
  3. `Sharing.shareAsync(uri)`.
  4. אם אחד מהשלבים נכשל, נופלים חזרה ל־`Share.share({message})` הקיים.
- **תוכן הכרטיס:** פס גרדיאנט עם הלוגו, מאיפה ← לאן, עלות כוללת בגודל ענק, "₪X לכל אחד" אם הוגדרה חלוקה, ובתחתית "חושב ב־CheckFuel" עם קישור להורדה (deep link או לינק לחנות).
- **אירוע אנליטיקה** `share_card` (שלב 4.4).

### 3.3 מוצא ויעד במקום ק"מ
**ארכיטקטורה:** האפליקציה פונה לפונקציית Vercel (באותו פרויקט של `checkfuel-data`), והפונקציה פונה לספק מפות. מפתח ה־API לעולם לא נמצא באפליקציה.

**ספק:** המלצה ראשונה היא OpenRouteService (שכבה חינמית, גאוקודינג וניתוב). חלופה בתשלום: Google Places ו־Routes. **לאמת** מכסות ותנאי שימוש לפני שמתחילים.

**אלגוריתם השלמה אוטומטית:**
```
onType(q):
  if q.length < 2 → clear
  debounce 300ms; cancel previous request (AbortController)
  key = normalize(q)  (trim, lowercase, collapse spaces)
  if memCache[key] → show
  GET /api/geocode?q=…&country=IL&lang=he  → top 5 → memCache[key]
```
**אלגוריתם מרחק:**
```
routeKm(from, to):
  key = round(lat,3),round(lon,3) for both   // ~100m, מספיק למטמון
  if AsyncStorage routeCache[key] && age < 30d → return
  try /api/route (timeout 6s) → km
  catch → haversine(from,to) * 1.3, flagged estimate=true   // shortcut: מקדם דרך קבוע, להחליף אם נשתמש בזה יותר מנדיר
haversine(a,b) = 2R·asin(√(sin²(Δφ/2) + cosφa·cosφb·sin²(Δλ/2))), R = 6371
```
- **בפונקציית השרת:** rate limit לכל IP (למשל 30 בקשות לדקה), ו־cache-control של יום אחד על תשובות הגאוקוד.
- **בממשק:** כשהתוצאה היא הערכה מוצג "מרחק משוער". שדה הק"מ הידני נשאר כחלופה, בטאב קטן "ק"מ".
- **מסלולים שמורים:** `savedRoutes: {id, label, from, to, km}[]`, לכל היותר 10, ובלחיצה ארוכה עורכים או מוחקים. אחרי שמירה הם מוצגים כקיצורים.
- **Waze ו־Apple Maps:** כשיש יעד, הכפתור פותח ניווט אמיתי: `https://waze.com/ul?ll=<lat>,<lon>&navigate=yes`, ו־`maps://?daddr=<lat>,<lon>` ב־iOS. היום הכפתור פותח רק את דף הבית של האפליקציה (`calculator.tsx:1099`). ב־iOS חובה להשאיר את Apple Maps (רקע: דחייה קודמת ב־App Review).

### 3.4 סיכום חודשי במסך ההיסטוריה
```
monthKey(ts) = `${y}-${m}` from new Date(ts)        // רק timestamp, אף פעם לא record.date
legacy: if !ts → ts = Number(record.id) (id נשמר כ-Date.now())
summary(trips, now):
  cur = trips where monthKey==monthKey(now); prev = previous month
  total = Σcost; km = Σdistance; count
  deltaPct = prev.total > 0 ? (cur.total - prev.total)/prev.total*100 : null
  projection = dayOfMonth ≥ 7 ? cur.total / dayOfMonth * daysInMonth : null   // לא מציגים תחזית על 2 ימים
```
- **בממשק:** בראש ההיסטוריה מוצג "החודש: ₪820 · 640 ק"מ · 23 נסיעות · ‎+12% מהחודש הקודם". מתחתיו גרף עמודות קטן של 6 חודשים עם `react-native-svg` (כבר מותקן). לפני כתיבת הגרף טוענים את הסקיל `dataviz`.
- **מודל פרטי נסיעה:** מתקפל לשורה שנפתחת במקום. אישור מחיקה פעם אחת בלבד (היום יש אישור כפול).
- **בדיקה:** מעבר בין חודשים, רשומות בלי `timestamp`, ושנה מעוברת.

---

## שלב 4: מונטיזציה ונתונים

### 4.1 עדכון מחירים אוטומטי (צד שרת)
היום `prices.json` מתעדכן (כנראה) ידנית. **אלגוריתם cron** ב־Vercel:
```
schedule: 1st–3rd of month, 00:30 + 06:00 IL time   // מחיר הדלק בישראל מפוקח ומתעדכן בתחילת החודש
fetch source (משרד האנרגיה / פרסום רשמי — לאמת מקור יציב ופורמט)
parse → {Gasoline, Diesel, Electric, effectiveFrom}
sanity: each in range; |new-old|/old ≤ 15%   else keep old + alert (email/log)
if changed: write prices.json with {…, updatedAt, source}
```
- **האפליקציה (2.4):** מציגה "עודכן ב־<effectiveFrom>".
- **סיכון:** אם אין מקור מכונה־קריא ויציב, נשארים בעדכון ידני עם תזכורת חודשית (`schedule`). לא בונים scraper שביר.

### 4.2 השוואה לרכב חשמלי
```
annualKm(trips, now):
  recent = trips in last 90 days
  if recent.length ≥ 5: return Σdistance(recent) * 365/90
  return 15000                                        // הנחה: ממוצע ישראלי, להציג כ"הערכה"
fuelYear = annualKm / vehicle.kmPerL * price.fuel
evYear   = annualKm * EV_REF_KWH_PER_100[segment] / 100 * price.electric
saving   = fuelYear - evYear
EV_REF_KWH_PER_100 = {small:14, family:16, suv:19}   // הנחות; לכייל מול lib/data/advancedEvConsumption.ts
```
- **בממשק:** שורה ב־"השוואה" בתוצאה ("עם רכב חשמלי: חיסכון של ~₪6,200 בשנה"), ומסך פירוט קטן.
- **לידים לליסינג:** **לא בונים** לפני החלטה עסקית וטקסט פרטיות מתאים, כי זה מידע אישי שנשלח לצד שלישי. בשלב הזה מציגים רק את המספר.

### 4.3 הסרת פרסומות
אחד מהשניים, לפי החלטה עסקית:
- **(א) רכישה חד־פעמית:** דרך `expo-iap` או RevenueCat. זה דורש מוצר בחנויות, ולכן **לאמת** את הספרייה מול SDK 54.
- **(ב) פרסומת מתגמלת:** צפייה אחת נותנת 24 שעות בלי באנרים, עם `adFreeUntil` ב־AsyncStorage והתניה ב־`EARNED_REWARD`.

**המלצה:** להתחיל ב־(ב), כי זה אפס תשתית חדשה. עוברים ל־(א) רק אם יש ביקוש.

### 4.4 אנליטיקה מינימלית (רק אחרי הסכמה)
בלי נתונים, כל החלטה עתידית היא ניחוש.
- **אירועים:** `calc_shown`, `vehicle_added{method}`, `share_card`, `split_used`, `route_used`, `trip_saved`, `ad_interstitial_shown`.
- **בלי מידע אישי:** אין לוחיות רישוי ואין קואורדינטות.
- **כלי:** Firebase Analytics. ה־SDK כבר מותקן, ולכן בשלב 1.5 לא מסירים אותו. החלופה היא PostHog.
- **כבוד להסכמה:** אם UMP מחזיר `canRequestAds=false`, לא שולחים אירועים.
- **מדיניות הפרטיות** מתעדכנת באותו PR.

---

## שלב 5: מעבר RTL לשאר המסכים, וליטוש
**סדר המסכים:** היסטוריה (הקטן ביותר), אחריו רכבים, `addVehicleByPlate`, ‏Legal ו־FirstLaunch.

**נוהל לכל מסך (PR נפרד):**
1. צילום לפני (iOS ו־Android).
2. מחיקה של כל `writingDirection: 'rtl'`.
3. `textAlign: 'right'` הופך ל־`'left'` או נמחק.
4. `row-reverse` הופך ל־`row`, ואחרי זה צילום מיד. זה השלב המסוכן ביותר.
5. `marginLeft/Right` הופך ל־`marginStart/End`, ו־`left/right` הופך ל־`start/end`.
6. מספרים, ₪ ולוחיות רישוי עוברים ב־`ltr()`.
7. צילום אחרי והשוואה מול הצילום מלפני.
8. `app-design-master` במצב audit.

**כשכל המסכים נקיים:** מעבירים את ה־RTL לזמן build במקום `forceRTL` והטעינה מחדש ב־`app/_layout.tsx:15-21`. **לאמת** את המפתחות (`supportsRTL` / `forcesRTL` דרך `expo-localization`) מול התיעוד של SDK 54.

**ליטוש:**
- **אייקונים:** כל האימוג'י (בערך 40) והגליפים ✓ ✕ › עוברים לאייקונים של `lucide-react-native`, שכבר משמש במחשבון. משפחת אייקונים אחת, ולא מוסיפים MaterialIcons למקומות חדשים.
- **Haptics:** `selectionAsync` בשינוי n של החלוקה, ו־`notificationAsync(Success)` בשמירה. רק שני המקומות האלה.
- **רדיוסים ומרווחים:** רק ערכים מ־`theme.ts`, ונבדק ב־grep שלא נשארו ערכים מספריים ישירים.
- **גרדיאנט:** אין טקסט על גרדיאנט. הטקסט עובר לפס אחיד בצבע `#1E7B34`. ‏`BlurView` שמעל תוכן (`calculator.tsx:569`) מוחלף במשטח אחיד.
- **מצב כהה (אופציונלי):** עמודה כהה ב־`theme.ts` (`#30D158` ו־`#4DB6AC` על `#1C1C1E`) עם `useColorScheme`, ואז מחזירים את `app.json` ל־`automatic`.

---

## לוח זמנים וסדר PRs

| # | PR | תלוי ב־ | סיכון | הערכה |
|---|---|---|---|---|
| 1 | 1.6 פרטיות ו־UMP | – | בינוני (חוסם חנות) | 1–2 ימים |
| 2 | 1.1 tokens ובדיקת ניגודיות | – | נמוך | יום |
| 3 | 1.2 IconButton ו־44pt | 2 | נמוך | יום |
| 4 | 1.3 + 1.4 מצב בהיר וטאב בר | 2 | נמוך | חצי יום |
| 5 | 1.5 קוד מת | – | נמוך | חצי יום |
| 6 | 2.2–2.4 לוגיקה טהורה ובדיקות | – | נמוך | יום |
| 7 | 2.1, 2.5–2.8 מסך מחשבון חדש | 2, 3, 6 | **גבוה** | 4–6 ימים |
| 8 | 3.1 + 3.2 חלוקה וכרטיס שיתוף | 7 | בינוני | 2–3 ימים |
| 9 | 3.4 סיכום חודשי | 2 | נמוך | 1–2 ימים |
| 10 | 3.3 מוצא ויעד ופרוקסי | 7 | בינוני (ספק חיצוני) | 3–4 ימים |
| 11 | 4.1 cron למחירים | – | בינוני (מקור נתונים) | 1–2 ימים |
| 12 | 4.2 השוואה לחשמלי | 7 | נמוך | יום |
| 13 | 4.4 אנליטיקה | 1 | בינוני (פרטיות) | יום |
| 14 | 4.3 הסרת פרסומות | 7 | נמוך (ב) / בינוני (א) | 1–3 ימים |
| 15+ | 5.x מעבר RTL, מסך אחד לכל PR | – | **גבוה** | חצי יום–יום למסך |

אפשר לעבוד במקביל על PRs 1, 2, 5, 6 ו־11. PR 7 הוא נקודת הצוואר.

## מדדי הצלחה (נמדדים אחרי 4.4)
- מספר האינטראקציות עד התוצאה הראשונה אצל משתמש חוזר: לכל היותר 2.
- שיעור השיתוף (`share_card` חלקי `calc_shown`): היעד הראשוני 5% ומעלה.
- חזרה אחרי 30 יום: מודדים baseline לפני שמציבים יעד.
- דחיות ב־App Review: 0.

## שאלות פתוחות לבעל המוצר
1. הסרת פרסומות: (א) רכישה, או (ב) פרסומת מתגמלת ל־24 שעות?
2. ספק מפות: OpenRouteService בחינם עם מכסה, או Google בתשלום?
3. האם יש היום מקור אוטומטי ל־`prices.json`, או שהוא מתעדכן ידנית?
4. האם ההפצה כוללת את האיחוד האירופי (זה קובע את דחיפות ה־UMP)?
5. לידים לליסינג: האם זה כיוון עסקי שרוצים לבדוק? אם כן, צריך לפני כן ייעוץ משפטי על העברת מידע.
