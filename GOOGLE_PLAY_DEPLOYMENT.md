# 📤 מדריך העלאה ל-Google Play Store

## דרישות מקדימות

### 1. צור חשבון Google Play Console
1. היכנס ל-[Google Play Console](https://play.google.com/console)
2. שלם דמי רישום חד-פעמיים של $25
3. השלם את פרטי החשבון והפרטים המשפטיים

### 2. התקן EAS CLI
```bash
npm install -g eas-cli
```

### 3. התחבר ל-Expo
```bash
eas login
```

---

## שלב 1: בניית האפליקציה

### בנייה ראשונה (לבדיקה)
```bash
# בנה APK לבדיקה על הטלפון שלך
eas build --platform android --profile preview
```

לאחר הבנייה, תקבל קישור להורדת ה-APK. התקן אותו על הטלפון ובדוק שהכל עובד.

### בנייה לייצור (Google Play)
```bash
# בנה AAB (Android App Bundle) לייצור
eas build --platform android --profile production
```

---

## שלב 2: הכן חומרים ל-Google Play

### תמונות נדרשות:
1. **אייקון** - 512x512 פיקסלים (PNG)
2. **צילומי מסך** - לפחות 2, עד 8:
   - פלאפונים: 1080x1920 או 1080x2340 פיקסלים
3. **Feature Graphic** - 1024x500 פיקסלים
4. **תמונת כותרת** (אופציונלי) - 16:9 יחס

### טקסטים נדרשים:
1. **שם האפליקציה**: "CheckFuel - מחשבון דלק"
2. **תיאור קצר** (80 תווים):
   ```
   מחשבון עלות נסיעה - חישוב דלק, ניהול רכבים והשוואת מחירים
   ```

3. **תיאור מלא** (4000 תווים):
   ```
   CheckFuel - המחשבון החכם לעלות נסיעות ⛽

   💰 חשב בדיוק את עלות הנסיעה שלך
   • חישוב מדויק של צריכת דלק לפי המרחק
   • תמיכה ברכבים חשמליים, בנזין וסולר
   • חישוב עלות לק"מ
   • מעקב אחר אחוז צריכה מהמיכל

   🚗 ניהול רכבים קל ונוח
   • שמירת מספר רכבים במערכת
   • זיהוי אוטומטי לפי לוחית רישוי
   • מעקב אחר צריכת דלק ממוצעת
   • היסטוריית נסיעות

   📊 השוואות מתקדמות
   • השוואת עלויות מול מונית
   • השוואת עלויות מול תחבורה ציבורית
   • תחזית עלות חודשית
   • חישוב פליטות CO₂

   ✨ תכונות מתקדמות
   • ממשק בעברית מלא
   • עיצוב מודרני ואינטואיטיבי
   • תמיכה בטלפונים וטאבלטים
   • שמירה אוטומטית של היסטוריה

   המחירים מעודכנים לפי שוק הדלק בישראל (אפריל 2025)

   הורד עכשיו וחסוך בעלויות הנסיעה שלך! 🎯
   ```

4. **קטגוריה**: Auto & Vehicles
5. **דירוג תוכן**: Everyone (3+)

---

## שלב 3: יצירת אפליקציה ב-Google Play Console

### 3.1 צור אפליקציה חדשה
1. היכנס ל-[Google Play Console](https://play.google.com/console)
2. לחץ על "Create app"
3. מלא את הפרטים:
   - **App name**: CheckFuel - מחשבון דלק
   - **Default language**: עברית (Hebrew)
   - **App or game**: App
   - **Free or paid**: Free
4. קבל את התנאים ולחץ "Create app"

### 3.2 הגדר את Store Listing
1. נווט ל-"Store presence" > "Main store listing"
2. מלא את כל השדות:
   - App name
   - Short description
   - Full description
   - App icon
   - Feature graphic
   - Screenshots (לפחות 2)
3. שמור

### 3.3 הגדר דירוג תוכן
1. נווט ל-"Policy" > "App content"
2. לחץ על "Start questionnaire"
3. ענה על השאלות (לרוב "No" לכל)
4. שמור

### 3.4 הגדר מדיניות פרטיות
1. נווט ל-"Policy" > "App content" > "Privacy policy"
2. הוסף קישור למדיניות פרטיות (אם אין, צור דף פשוט)
3. דוגמה בסיסית:
   ```
   מדיניות פרטיות של CheckFuel

   אנו מכבדים את פרטיותך. האפליקציה:
   - אינה אוספת מידע אישי
   - שומרת נתונים מקומית בלבד במכשיר
   - משתמשת בפרסומות Google AdMob
   - אינה משתפת מידע עם צדדים שלישיים

   לשאלות: [email protected]
   ```

### 3.5 הגדר קהל יעד
1. נווט ל-"Policy" > "Target audience"
2. בחר גילאים: 13+ (או Everyone)
3. שמור

---

## שלב 4: העלאת ה-AAB

### 4.1 צור גרסה חדשה
1. נווט ל-"Release" > "Production"
2. לחץ על "Create new release"

### 4.2 העלה את ה-AAB
1. לחץ על "Upload"
2. בחר את קובץ ה-AAB שנבנה ב-EAS
   - הקובץ נמצא בקישור שקיבלת מ-EAS
   - הורד אותו ולאחר מכן העלה
3. מלא Release notes (בעברית):
   ```
   גרסה 1.0.0 - שחרור ראשוני

   ✨ תכונות:
   • מחשבון עלות נסיעה מדויק
   • ניהול רכבים
   • זיהוי אוטומטי לפי לוחית רישוי
   • השוואות מחירים (מונית, אוטובוס)
   • היסטוריית נסיעות
   • תמיכה ברכבים חשמליים
   ```

### 4.3 סקור ושלח
1. סקור את כל הפרטים
2. לחץ "Review release"
3. לחץ "Start rollout to Production"

---

## שלב 5: המתנה לאישור

⏳ **תהליך האישור:**
- Google בודקת את האפליקציה
- זמן המתנה: 1-7 ימים (בדרך כלל 1-2 ימים)
- תקבל מייל כשהאפליקציה אושרה או נדחתה

---

## שלב 6: עדכונים עתידיים

### עדכן את מספר הגרסה
ב-`app.json`:
```json
{
  "expo": {
    "version": "1.1.0",
    "android": {
      "versionCode": 2
    }
  }
}
```

### בנה גרסה חדשה
```bash
eas build --platform android --profile production
```

### העלה גרסה חדשה
1. נווט ל-"Release" > "Production"
2. לחץ "Create new release"
3. העלה את ה-AAB החדש
4. שלח לסקירה

---

## פקודות שימושיות

```bash
# בדוק את סטטוס הבנייה
eas build:list

# בנה ל-Android בלבד
eas build --platform android

# בנה APK לבדיקה מקומית
eas build --platform android --profile preview

# בנה AAB לייצור
eas build --platform android --profile production

# בדוק תצורת EAS
eas build:configure
```

---

## טיפים חשובים

✅ **בדוק את האפליקציה היטב לפני העלאה**
- התקן את ה-APK ובדוק כל תכונה
- וודא שאין קריסות
- בדוק על מכשירים שונים אם אפשרי

✅ **הכן צילומי מסך איכוטיים**
- השתמש בתכונות המרכזיות
- וודא שהטקסט קריא
- השתמש בצבעים בהירים ומושכים

✅ **כתוב תיאור ברור ומפורט**
- הדגש את התכונות העיקריות
- השתמש ב-Emoji למשיכת תשומת לב
- הסבר את היתרונות למשתמש

✅ **בדוק את מדיניות Google Play**
- אין תוכן אסור
- מדיניות פרטיות תקינה
- דירוג תוכן מדויק

---

## פתרון בעיות נפוצות

### הבנייה נכשלה
```bash
# נקה את הקאש
eas build:clear-cache

# בנה שוב
eas build --platform android --profile production
```

### שגיאת חתימה
- EAS מטפל בחתימה אוטומטית
- אל תדאג לגבי keystore ידני

### האפליקציה נדחתה
- קרא את המייל מ-Google בעיון
- תקן את הבעיות שצוינו
- שלח שוב לאישור

---

## קישורים שימושיים

📚 [Google Play Console](https://play.google.com/console)
📚 [EAS Build Documentation](https://docs.expo.dev/build/introduction/)
📚 [Google Play Policies](https://play.google.com/about/developer-content-policy/)
📚 [App Bundle Format](https://developer.android.com/guide/app-bundle)

---

**בהצלחה! 🚀**
