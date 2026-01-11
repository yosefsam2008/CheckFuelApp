// app/LegalScreen.tsx
/**
 * ============================================================================
 * Legal Compliance Screen Component
 * ============================================================================
 * A complete, production-ready React Native component for legal disclosures.
 * 
 * Features:
 * - Privacy Policy (Hebrew + English)
 * - Terms of Service (Hebrew + English)
 * - About & Attributions
 * - First-launch acceptance flow
 * - Professional design with teal theme
 * - Full Hebrew RTL support
 * - No external dependencies (React Native core only)
 * - AsyncStorage for acceptance tracking
 * 
 * Installation: 
 *   1. Copy this file to app/LegalScreen.tsx
 *   2. Import in your app's initialization
 *   3. Show on first launch, then on demand from settings
 * 
 * ============================================================================
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useEffect, useRef, useState } from 'react';
import {
    Animated,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';

interface LegalScreenProps {
  onAccept?: () => void;
  onClose?: () => void;
  requireAcceptance?: boolean; // If true, show accept/decline buttons
  showCloseButton?: boolean;
}

type TabType = 'privacy' | 'terms' | 'about';

const COLORS = {
  primary: '#009688',
  primaryDark: '#00796b',
  primaryLight: '#e0f2f1',
  background: '#f5f5f5',
  card: '#ffffff',
  text: '#212121',
  textSecondary: '#666666',
  textLight: '#999999',
  border: '#e0e0e0',
  success: '#4caf50',
  error: '#f44336',
};

const PRIVACY_POLICY_HE = `
מדיניות פרטיות

1. הקדמה
ברוכים הבאים לאפליקציית מחשבון עלויות נסיעה. אנו מחויבים להגן על פרטיותך.

2. אילו נתונים אנחנו אוספים?
• מספר לוחית רכב - לשליפת נתוני רכב
• פרטי רכב - שם יצרן, דגם, שנה, סוג דלק, צריכה
• מחיר דלק/חשמל - המחיר הנוכחי
• מרחק נסיעה - לצורך חישוב עלויות
• היסטוריית חישובים - מרחק, עלות, צריכה

שימו לב: אנחנו לא אוספים שם, טלפון, דוא"ל, או מיקום.

3. איך אנחנו שומרים את הנתונים?
כל הנתונים נשמרים רק בהתקן שלך - לא בשום שרת.
• נשתמש AsyncStorage (מסד נתונים מקומי)
• אתה בעל הנתונים בלבד
• כאשר אתה מוחק את האפליקציה, כל הנתונים נמחקים

4. איך אנחנו משתמשים בנתונים?
• חישוב עלויות נסיעה
• שמירת היסטוריה
• שיפור חוויית המשתמש

אנחנו לא:
• מוכרים, משתפים, או משדרים נתונים
• משתמשים בנתונים למטרות פרסום או עקיבה
• מחלקים נתונים עם צד שלישי

5. API חיצוניים
• data.gov.il: למביא נתוני רכבים (מאגר ממשלתי)
• Fuel Economy API: לנתוני צריכה

אנחנו שולחים רק מספר לוחית או פרטי רכב - אין זיהוי אישי.

6. זכויות שלך
• זכות להיגע לנתונים שלך בכל עת
• זכות למחוק רכב או חישוב בודד
• זכות למחוק את כל הנתונים בהסרת האפליקציה

7. אבטחה
אנחנו משתמשים במנגנוני האבטחה של מערכת ההפעלה:
• AsyncStorage מוצפן על ידי iOS/Android
• אנחנו לא משדרים נתונים ללא הצפנה

8. שינויים
אנחנו עשוים לעדכן מדיניות זו. אם יש שינויים משמעותיים, אתה תקבל הודעה.

9. ציות לחוק
אנחנו שומרים על דרישות:
• חוק הגנת הפרטיות (1981)
• חוק הגנת הצרכן
• מדיניות Google Play

10. צור קשר
שאלות? בדוק את ההגדרות של האפליקציה או צור קשר דרך Google Play.
`;

const PRIVACY_POLICY_EN = `
Privacy Policy

1. Introduction
Welcome to the Fuel Cost Calculator App. We are committed to protecting your privacy.

2. What Data Do We Collect?
• Vehicle license plate - to retrieve vehicle data
• Vehicle details - manufacturer, model, year, fuel type, consumption
• Fuel/electricity price - current price
• Trip distance - for cost calculation
• Calculation history - distance, cost, consumption

Note: We do not collect name, phone, email, or location.

3. How Do We Store Your Data?
All your data is stored only on your device - not on any server.
• We use AsyncStorage (local database)
• You own the data exclusively
• When you uninstall the App, all data is deleted

4. How Do We Use Your Data?
• Calculate trip costs
• Maintain history
• Improve user experience

We do NOT:
• Sell, share, or transmit data
• Use data for advertising or tracking
• Share data with third parties

5. External APIs
• data.gov.il: provides vehicle data (Israeli government database)
• Fuel Economy API: provides consumption data

We send only license plate or vehicle details - no personal identification.

6. Your Rights
• Right to access your data anytime
• Right to delete a single vehicle or calculation
• Right to delete all data when uninstalling the App

7. Security
We use operating system security mechanisms:
• AsyncStorage is encrypted by iOS/Android
• We do not transmit data without encryption

8. Changes
We may update this policy. If there are significant changes, you will be notified.

9. Legal Compliance
We comply with:
• Israeli Privacy Protection Law (1981)
• Consumer Protection Law
• Google Play Store Policies

10. Contact Us
Questions? Check the App's settings or contact us via Google Play.
`;

const TERMS_OF_SERVICE_HE = `
תנאי השירות

1. סיוג חשוב - תוצאות הערכה בלבד

כל התוצאות של האפליקציה הן הערכות משוערות, לא מדויקות:
• צריכת דלק משתנה בהתאם לנהיגה
• עלויות דלק משתנות יומי בשוק
• נתוני צריכה עלולים להיות ישנים או אינם מדויקים
• אנחנו לא מביאים בחשבון בלאי או שינויים בתנאים

אל תסתמוך על הנתונים בלבד לקבלת החלטות פיננסיות גדולות.

2. אתה אחראי לאימות
• בדוק את מחיר הדלק בתחנות בפועל
• בדוק את צריכת הרכב שלך מחשבוניות בנזיקה
• השתמש בנתונים כעזר בלבד

3. הדחה מלאה של אחריות

אנחנו לא אחראים ל:
• הפסדים כספיים מחישובים שגויים
• החלטות שעשית על בסיס הנתונים
• נזק לרכב שלך
• טעויות בחישובים

4. שם יצרנים
• כל שמות יצרנים הם סימנים מסחריים של החברות שלהם
• אנחנו משתמשים בשמות אלה רק לצורך הזמנה
• אנחנו לא קשורים לאף יצרן

5. נתונים מממשלתיים
• נתוני רכב מגיעים מהמאגר הממשלתי
• אנחנו לא אחראים לשגיאות בנתוני המממשלה
• יתכן שנתונים אלה ישנים או אינם מדויקים

6. זכויות שלנו
• אנחנו יכולים לעדכן את האפליקציה בכל עת
• אנחנו יכולים להוסיף או להסיר תכונות
• אנחנו יכולים להפסיק את השירות עם הודעה מקדימה

7. דין וישפט
• תנאים אלה נשלטים על ידי חוקי ישראל
• בתי משפט בישראל יהיו בעלות שיפוט

8. אישור
בשימוש בנוסח:
• אתה מסכים לכל התנאים
• אתה מבין שהחישובים הם הערכות בלבד
• אתה אחראי לאימות הנתונים
`;

const TERMS_OF_SERVICE_EN = `
Terms of Service

1. Important Disclaimer - Results Are Estimates Only

All App results are approximations, not exact:
• Fuel consumption varies based on driving conditions
• Fuel prices change daily
• Consumption data may be outdated or inaccurate
• We do not account for wear or environmental changes

Do not rely solely on this data for major financial decisions.

2. You Are Responsible for Verification
• Check actual fuel prices at gas stations
• Check your vehicle's consumption from fuel receipts
• Use this as a tool only

3. Complete Disclaimer of Warranties

We are not responsible for:
• Financial losses from incorrect calculations
• Decisions based on the App's data
• Damage to your vehicle
• Calculation errors

4. Manufacturer Names
• All manufacturer names are trademarks of their companies
• We use them only for identification
• We are not affiliated with any manufacturer

5. Government Data
• Vehicle data comes from the government database
• We are not responsible for government data errors
• This data may be outdated or inaccurate

6. Our Rights
• We can update the App anytime
• We can add or remove features
• We can discontinue service with notice

7. Governing Law
• These terms are governed by Israeli law
• Israeli courts have jurisdiction

8. Acknowledgment
By using the App:
• You agree to all terms
• You understand calculations are estimates only
• You are responsible for data verification
`;

const ABOUT_CONTENT_HE = `
אודות ופיקוח

1. מקורות נתונים

אנחנו משתמשים בנתונים מהמקורות הבאים:

📊 data.gov.il
מאגר נתונים פתוח של ממשלת ישראל
• טבלת רכבים (סוגים שונים)
• עדכון תקופתי
• גישה חינם לציבור

🔧 Fuel Economy APIs
מקורות נתונים צד שלישי לצריכת דלק
• הערכות יצרן
• נתונים ממשלתיים מחו"ל

⛽ מחירי דלק וחשמל
מחירים אחרונים מהשוק בישראל

2. אנא שימו לב

✓ הנתונים משתמשים בהסכמתם של מקורות אלה
✓ כל השימוש עומד בתנאי המקורות
✓ אנחנו עומדים בדרישות data.gov.il

3. טיב נתונים

כל נתון שנדפיס בנוסח הוא הערכה בלבד.
אנחנו עושים כל מה שביכולתנו לשמור על דיוק, אך:
• נתונים עלולים להיות ישנים
• נתונים עלולים להיות אינם מדויקים
• זה לא חלופי לאימות חיצוני

4. משוב ובעיות

אם מצאת שגיאה בנתונים:
• דווח דרך חנות Google Play
• תן לנו לדעת איזה רכב או נתונים שגויים
• אנחנו נבדוק ונתקן בעדכון הבא

5. תודות

תודה שאתה משתמש באפליקציה!
• אנחנו עובדים בתמידות לשפר את הנתונים
• הערות שלך עוזרות לנו להתפתח
• התמדתך מעודדת אותנו
`;

const ABOUT_CONTENT_EN = `
About & Credits

1. Data Sources

We use data from the following sources:

📊 data.gov.il
Israel's open government database
• Vehicle registry (various types)
• Regular updates
• Free public access

🔧 Fuel Economy APIs
Third-party data sources for fuel consumption
• Manufacturer estimates
• International government data

⛽ Fuel and Electricity Prices
Current market prices in Israel

2. Please Note

✓ Data is used with permission from these sources
✓ All usage complies with source terms
✓ We comply with data.gov.il requirements

3. Data Quality

Every data point in this App is an estimate only.
We do our best to maintain accuracy, but:
• Data may be outdated
• Data may be inaccurate
• This is not a substitute for external verification

4. Feedback and Issues

If you found an error in the data:
• Report via Google Play Store
• Tell us which vehicle or data is wrong
• We will check and fix it in the next update

5. Thank You

Thank you for using the App!
• We work continuously to improve data
• Your feedback helps us grow
• Your support encourages us
`;

export default function LegalScreen({
  onAccept,
  onClose,
  requireAcceptance = false,
  showCloseButton = true,
}: LegalScreenProps) {
  const [activeTab, setActiveTab] = useState<TabType>('privacy');
  const [isHebrewMode, setIsHebrewMode] = useState(true);
  const [hasAccepted, setHasAccepted] = useState(false);
  const [showAcceptCheckbox, setShowAcceptCheckbox] = useState(requireAcceptance);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Check if user has accepted before
    if (requireAcceptance) {
      AsyncStorage.getItem('legal_acceptance').then((value) => {
        if (value === 'true') {
          setHasAccepted(true);
          setShowAcceptCheckbox(false);
        }
      });
    }

    // Fade in animation
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleAccept = async () => {
    if (!requireAcceptance || hasAccepted) {
      if (onClose) onClose();
      return;
    }

    if (!hasAccepted) {
      alert('אנא אשר את תנאי השימוש\nPlease accept the terms');
      return;
    }

    try {
      await AsyncStorage.setItem('legal_acceptance', 'true');
      setShowAcceptCheckbox(false);
      if (onAccept) onAccept();
    } catch (error) {
      console.error('Error saving acceptance:', error);
    }
  };

  const renderContent = () => {
    let content = '';

    if (activeTab === 'privacy') {
      content = isHebrewMode ? PRIVACY_POLICY_HE : PRIVACY_POLICY_EN;
    } else if (activeTab === 'terms') {
      content = isHebrewMode ? TERMS_OF_SERVICE_HE : TERMS_OF_SERVICE_EN;
    } else {
      content = isHebrewMode ? ABOUT_CONTENT_HE : ABOUT_CONTENT_EN;
    }

    return content;
  };

  const getTabLabel = (tab: TabType): string => {
    if (isHebrewMode) {
      switch (tab) {
        case 'privacy':
          return 'פרטיות';
        case 'terms':
          return 'תנאים';
        case 'about':
          return 'אודות';
      }
    } else {
      switch (tab) {
        case 'privacy':
          return 'Privacy';
        case 'terms':
          return 'Terms';
        case 'about':
          return 'About';
      }
    }
  };

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>
            {isHebrewMode ? '⚖️ תנאים משפטיים' : '⚖️ Legal'}
          </Text>
          {showCloseButton && (
            <TouchableOpacity
              style={styles.closeButton}
              onPress={onClose}
            >
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Tab Navigation */}
        <View style={[styles.tabContainer, isHebrewMode && { flexDirection: 'row-reverse' }]}>
          {(['privacy', 'terms', 'about'] as TabType[]).map((tab) => (
            <TouchableOpacity
              key={tab}
              style={[
                styles.tab,
                activeTab === tab && styles.tabActive,
              ]}
              onPress={() => setActiveTab(tab)}
            >
              <Text
                style={[
                  styles.tabLabel,
                  activeTab === tab && styles.tabLabelActive,
                ]}
              >
                {getTabLabel(tab)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Language Toggle */}
        <TouchableOpacity
          style={styles.languageToggle}
          onPress={() => setIsHebrewMode(!isHebrewMode)}
        >
          <Text style={styles.languageToggleText}>
            {isHebrewMode ? '🇬🇧 EN' : '🇮🇱 עברית'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Content Scroll View */}
      <ScrollView
        style={styles.contentScroll}
        contentContainerStyle={[
          styles.contentContainer,
          isHebrewMode && { alignItems: 'flex-end' },
        ]}
      >
        <Text
          style={[
            styles.contentText,
            isHebrewMode && { textAlign: 'right' },
          ]}
        >
          {renderContent()}
        </Text>
      </ScrollView>

      {/* Footer with Accept Button */}
      <View style={styles.footer}>
        {showAcceptCheckbox && (
          <TouchableOpacity
            style={[styles.checkboxContainer, isHebrewMode && { flexDirection: 'row-reverse' }]}
            onPress={() => setHasAccepted(!hasAccepted)}
          >
            <View
              style={[
                styles.checkbox,
                hasAccepted && styles.checkboxChecked,
              ]}
            >
              {hasAccepted && (
                <Text style={styles.checkboxCheck}>✓</Text>
              )}
            </View>
            <Text
              style={[
                styles.checkboxLabel,
                isHebrewMode && { textAlign: 'right',writingDirection: 'rtl', },
              ]}
            >
              {isHebrewMode
                ? 'אני מסכים לתנאים'
                : 'I agree to the terms'}
            </Text>
          </TouchableOpacity>
        )}

        <View style={[styles.buttonContainer, isHebrewMode && { flexDirection: 'row-reverse' }]}>
          {showAcceptCheckbox && (
            <TouchableOpacity
              style={[
                styles.button,
                styles.secondaryButton,
              ]}
              onPress={onClose}
            >
              <Text style={styles.secondaryButtonText}>
                {isHebrewMode ? 'ביטול' : 'Cancel'}
              </Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={[
              styles.button,
              styles.primaryButton,
              !hasAccepted && showAcceptCheckbox && styles.primaryButtonDisabled,
            ]}
            onPress={showAcceptCheckbox ? handleAccept : onClose}
            disabled={!hasAccepted && showAcceptCheckbox}
          >
            <Text style={styles.primaryButtonText}>
              {showAcceptCheckbox
                ? (isHebrewMode ? 'אשר' : 'Accept')
                : (isHebrewMode ? 'הבנתי' : 'Got it')}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    backgroundColor: COLORS.primary,
    paddingTop: Platform.OS === 'ios' ? 50 : 30,
    paddingHorizontal: 16,
    paddingBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 20,
    color: '#fff',
    fontWeight: '600',
  },
  tabContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
  },
  tabActive: {
    backgroundColor: '#fff',
  },
  tabLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.7)',
  },
  tabLabelActive: {
    color: COLORS.primary,
  },
  languageToggle: {
    alignSelf: 'flex-start',
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 6,
  },
  languageToggleText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
  },
  contentScroll: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
  },
  contentText: {
    fontSize: 14,
    lineHeight: 22,
    color: COLORS.text,
  },
  footer: {
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 16,
    paddingBottom: Platform.OS === 'ios' ? 32 : 16,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 3,
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 10,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: COLORS.primary,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: COLORS.primary,
  },
  checkboxCheck: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  checkboxLabel: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.text,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 10,
  },
  button: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButton: {
    backgroundColor: COLORS.primary,
  },
  primaryButtonDisabled: {
    opacity: 0.5,
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  secondaryButton: {
    backgroundColor: COLORS.background,
    borderWidth: 1.5,
    borderColor: COLORS.border,
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
});
