// components/AdBanner.tsx
import React from 'react';
import { View, Platform } from 'react-native';
import { BannerAd, BannerAdSize, TestIds } from 'react-native-google-mobile-ads';

// בחירה אוטומטית בין מזהה הטסט למזהה האמיתי (Production)
const AD_UNIT_ID = __DEV__ 
  ? TestIds.BANNER 
  : 'ca-app-pub-6526080198496101/4914580281';

export default function AdBanner() {
  // דילוג אלגנטי בסביבת Web למניעת קריסות
  if (Platform.OS === 'web') {
    return null; // אפשר גם להחזיר <View style={{ height: 50 }} /> אם אתה רוצה לשמור על המרווח
  }

  return (
    <View style={{ alignItems: 'center', width: '100%', marginVertical: 10 }}>
      <BannerAd
        unitId={AD_UNIT_ID}
        size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
        requestOptions={{
          requestNonPersonalizedAdsOnly: true, // שומר על פרטיות המשתמשים
        }}
        onAdFailedToLoad={(error) => console.log('❌ Banner Ad error: ', error)}
      />
    </View>
  );
}