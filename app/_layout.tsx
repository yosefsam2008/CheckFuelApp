// app/_layout.tsx
import { Stack } from 'expo-router';
import { useEffect } from 'react';
import { StatusBar, Platform } from 'react-native';
import * as NavigationBar from 'expo-navigation-bar';
import mobileAds from 'react-native-google-mobile-ads'; // ייבוא של גוגל!
import { runAutoMigration } from '../lib/utils/evDataMigration';

export default function RootLayout() {
  useEffect(() => {
    // אתחול מערכת הפרסומות של גוגל (חובה!)
    mobileAds()
      .initialize()
      .then(adapterStatuses => {
        console.log('✅ Google Ads initialized successfully!', adapterStatuses);
      })
      .catch(error => {
        console.error('❌ Google Ads initialization failed:', error);
      });

    // הגדרות עיצוב אנדרואיד (נשאר כמו שהיה לך)
    if (Platform.OS === 'android') {
      StatusBar.setTranslucent(true);
      StatusBar.setBackgroundColor('transparent');
      NavigationBar.setVisibilityAsync('visible');
    }

    // הגירת נתונים (נשאר כמו שהיה לך)
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