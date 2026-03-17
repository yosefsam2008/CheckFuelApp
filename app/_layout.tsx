// app/_layout.tsx
import { Stack } from 'expo-router';
import { useEffect } from 'react';
import { StatusBar, Platform } from 'react-native';
import * as NavigationBar from 'expo-navigation-bar';
import mobileAds, { RequestConfiguration } from 'react-native-google-mobile-ads';
import { runAutoMigration } from '../lib/utils/evDataMigration';
import { I18nManager } from 'react-native';

export default function RootLayout() {

I18nManager.allowRTL(true);
I18nManager.forceRTL(true);

  useEffect(() => {
    // 1. הגדרת סביבת בדיקות (Test Devices) לפני האתחול
    // זה עוזר לגוגל להבין שמדובר בפיתוח ולתת עדיפות לפרסומות בדיקה
    mobileAds()
      .setRequestConfiguration({
        // רשימת מזהי מכשירים לבדיקה. 'EMULATOR' מכסה אימולטורים סטנדרטיים.
        // אם תרצה בעתיד להוסיף את המזהה הספציפי של המכשיר שלך, תוכל להוסיף אותו למערך הזה.
        testDeviceIdentifiers: ['EMULATOR'], 
      })
      .then(() => {
        // 2. אתחול מערכת הפרסומות של גוגל רק אחרי שהגדרנו את הקונפיגורציה
        return mobileAds().initialize();
      })
      .then(adapterStatuses => {
        console.log('✅ Google Ads initialized successfully!', adapterStatuses);
      })
      .catch(error => {
        console.error('❌ Google Ads initialization failed:', error);
      });

    // הגדרות עיצוב למכשירי אנדרואיד
    if (Platform.OS === 'android') {
      StatusBar.setTranslucent(true);
      StatusBar.setBackgroundColor('transparent');
      NavigationBar.setVisibilityAsync('visible');
    }

    // הגירת נתונים (הלוגיקה הפנימית שלך)
    runAutoMigration();
  }, []);

  return (
    <Stack screenOptions={{
      headerShown: false,
      contentStyle: { backgroundColor: '#f5f7fa' }
    }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="addVehicleByPlate" />
      <Stack.Screen name="addVehicle" />
      <Stack.Screen name="LegalScreen" />
      <Stack.Screen name="UserGuideScreen" />
    </Stack>
  );
}