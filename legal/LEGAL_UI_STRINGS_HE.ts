// UI Text Strings - Hebrew
// Copy and paste these strings into your app for in-app legal disclosures
//app/legal/LEGAL_UI_STRINGS_HE.ts
export const LEGAL_UI_STRINGS = {
  // Calculator Screen Disclaimer
  calculator: {
    disclaimer: 'התוצאות הן הערכות בלבד',
    disclaimerFull: 'התוצאות המוצגות בחישוב הן הערכות משוערות בלבד. אל תסתמוך עליהן כמקור יחידה.',
  },

  // Data Attribution
  attribution: {
    footer: 'נתוני רכב מתוך המאגר הממשלתי הפתוח • צריכה משוערת מנתונים חיצוניים',
    dataGovAttribution: 'נתוני רכב: data.gov.il (המאגר הממשלתי הפתוח של ישראל)',
    consumptionAttribution: 'נתוני צריכה: Fuel Economy Database',
  },

  // Settings Menu Items
  settings: {
    legal: '⚖️ תנאים משפטיים',
    privacyPolicy: '🔒 מדיניות פרטיות',
    termsOfService: '📋 תנאי השירות',
    about: 'אודות האפליקציה',
    dataAttribution: 'מקורות נתונים',
    contact: '📧 צור קשר',
  },

  // First Launch Dialog
  firstLaunch: {
    title: 'ברוכים הבאים!',
    message: 'לפני שתתחיל, אנא קרא את תנאי השימוש ומדיניות הפרטיות.',
    buttonAccept: 'אני מסכים',
    buttonReject: 'ביטול',
    checkboxLabel: 'אני מבין את התנאים והמדיניות',
  },

  // Data Notices (inline)
  notices: {
    estimateOnly: '💡 שימו לב: זה הערכה בלבד',
    verify: 'בדוק בתחנת דלק בפועל',
    consumption: 'צריכה זו הערכה משוערת',
    disclaimer: 'למידע נוסף, בדקו את תנאי השירות',
  },

  // Delete Confirmation
  confirmations: {
    deleteVehicle: 'אתה בטוח שברצונך למחוק רכב זה?\nפעולה זו לא ניתן לשנות.',
    deleteHistory: 'אתה בטוח שברצונך למחוק רישום זה?\nפעולה זו לא ניתן לשנות.',
    clearAllData: 'זה ימחק את כל הרכבים וההיסטוריה!\nפעולה זו לא ניתן לשנות.',
  },

  // Toast Messages
  toasts: {
    dataSaved: '✅ הנתונים נשמרו בהתקן שלך בלבד',
    dataDeleted: '🗑️ הנתונים נמחקו',
    acceptedTerms: '✓ תודה שקבלת את התנאים',
  },

  // Headers
  headers: {
    calculator: '📊 מחשבון עלויות נסיעה',
    vehicles: '🚗 הרכבים שלי',
    history: '📈 היסטוריה',
    settings: '⚙️ הגדרות',
  },

  // Legal Page Navigation
  legal: {
    privacyTab: 'פרטיות',
    termsTab: 'תנאים',
    aboutTab: 'אודות',
    agreeCheckbox: 'אני מסכים לתנאים',
    acceptButton: 'אשר',
    closeButton: 'סגור',
    languageToggle: '🇬🇧 English',
  },

  // Empty States
  empty: {
    noVehicles: 'אין רכבים שמורים',
    noHistory: 'אין היסטוריה',
    addFirst: 'הוסף רכב כדי להתחיל',
  },

  // Error Messages
  errors: {
    invalidConsumption: 'הצריכה חייבת להיות מעל 0',
    invalidPrice: 'המחיר חייב להיות מעל 0',
    invalidDistance: 'המרחק חייב להיות בין 0 ל-5000 ק״מ',
    networkError: 'שגיאת רשת. בדוק את החיבור שלך.',
    apiError: 'שגיאה בשליפת נתונים. אנא נסה שוב.',
  },
};

// Quick copy-paste examples for integration:

/*
// Example 1: Calculator Screen Disclaimer
<View style={styles.disclaimerBanner}>
  <Text style={styles.disclaimerIcon}>⚠️</Text>
  <Text style={styles.disclaimerText}>
    {LEGAL_UI_STRINGS.calculator.disclaimer}
  </Text>
</View>

// Example 2: Settings Menu Item
<TouchableOpacity onPress={() => navigation.navigate('Legal')}>
  <Text>{LEGAL_UI_STRINGS.settings.legal}</Text>
</TouchableOpacity>

// Example 3: First Launch Check
import AsyncStorage from '@react-native-async-storage/async-storage';

useEffect(() => {
  const checkFirstLaunch = async () => {
    const hasLaunched = await AsyncStorage.getItem('app_launched');
    if (!hasLaunched) {
      // Show legal acceptance screen
      showLegalAcceptance();
      await AsyncStorage.setItem('app_launched', 'true');
    }
  };
  checkFirstLaunch();
}, []);

// Example 4: Data Attribution Footer
<Text style={styles.footer}>
  {LEGAL_UI_STRINGS.attribution.footer}
</Text>

// Example 5: Delete Confirmation
Alert.alert(
  'מחק רכב',
  LEGAL_UI_STRINGS.confirmations.deleteVehicle,
  [
    { text: 'ביטול', onPress: () => {} },
    { 
      text: 'מחק', 
      onPress: () => deleteVehicle(),
      style: 'destructive'
    }
  ]
);
*/
