//components/BannerAd.tsx
import React from 'react';
import { View, Platform } from 'react-native';

// ייבוא חסין תקלות (עוקף את הבאג של השרת)
const admobModule = require('react-native-google-mobile-ads');
const { BannerAd, BannerAdSize, TestIds } = admobModule.default || admobModule;

export default function AdBanner() {
  // מזהי בדיקה רשמיים של גוגל למקרה ש-TestIds לא מזוהה
  const fallbackTestId = Platform.OS === 'ios' 
    ? 'ca-app-pub-3940256099942544/2934735716' 
    : 'ca-app-pub-3940256099942544/6300978111';

  // בודק אם אנחנו במצב פיתוח ושם מזהה בדיקה, אחרת (בחנות) ישים מזהה אמיתי
  const adUnitId = __DEV__ 
    ? (TestIds?.BANNER || fallbackTestId) 
        : 'ca-app-pub-6395480022343350/6667384343';
  // הגנה קריטית: אם הספרייה נכשלה לחלוטין, נחזיר שטח ריק במקום לקרוס
  if (!BannerAd) {
    return <View style={{ height: 50, width: '100%' }} />;
  }

  return (
    <View style={{ alignItems: 'center', width: '100%', marginVertical: 10 }}>
      <BannerAd
        unitId={adUnitId}
        size={BannerAdSize?.ANCHORED_ADAPTIVE_BANNER || 'ANCHORED_ADAPTIVE_BANNER'}
        requestOptions={{
          requestNonPersonalizedAdsOnly: true,
        }}
      />
    </View>
  );
}