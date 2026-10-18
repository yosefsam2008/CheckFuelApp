import { Stack } from 'expo-router';
import { useEffect } from 'react';
import { StatusBar, Platform, I18nManager } from 'react-native';
import * as NavigationBar from 'expo-navigation-bar';
import { initAds } from '../lib/ads/initAds';
import { runAutoMigration } from '../lib/utils/evDataMigration';
import * as Updates from 'expo-updates';

export default function RootLayout() {

  useEffect(() => {
    const initializeApp = async () => {
      try {
        // 1. טיפול ב-RTL
        if (!I18nManager.isRTL) {
          I18nManager.allowRTL(true);
          I18nManager.forceRTL(true);
          if (!__DEV__) {
            Updates.reloadAsync();
          }
        }

        // 2. פרסומות: הסכמה (UMP) ואז אתחול יחיד
        await initAds();

        // 3. הגדרות עיצוב לאנדרואיד
        if (Platform.OS === 'android') {
          StatusBar.setTranslucent(true);
          StatusBar.setBackgroundColor('transparent');
          NavigationBar.setVisibilityAsync('visible');
        }

        // 4. הגירת נתונים
        await runAutoMigration();
      } catch (error) {
        console.error('❌ App initialization failed:', error);
      }
    };

    initializeApp();
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