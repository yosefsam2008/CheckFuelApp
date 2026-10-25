import {
  Heebo_400Regular,
  Heebo_500Medium,
  Heebo_600SemiBold,
  Heebo_700Bold,
  Heebo_800ExtraBold,
  Heebo_900Black,
  useFonts,
} from '@expo-google-fonts/heebo';
import { Nunito_800ExtraBold } from '@expo-google-fonts/nunito';
import { Rubik_400Regular, Rubik_500Medium, Rubik_600SemiBold, Rubik_700Bold, Rubik_800ExtraBold } from '@expo-google-fonts/rubik';
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import { Stack } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { ReducedMotionConfig, ReduceMotion } from 'react-native-reanimated';
import { useEffect } from 'react';
import { StatusBar, Platform, I18nManager } from 'react-native';
import * as NavigationBar from 'expo-navigation-bar';
import { initAds } from '../lib/ads/initAds';
import { runAutoMigration } from '../lib/utils/evDataMigration';
import * as Updates from 'expo-updates';

export default function RootLayout() {
  const [fontsLoaded] = useFonts({ Heebo_400Regular, Heebo_500Medium, Heebo_600SemiBold, Heebo_700Bold, Heebo_800ExtraBold, Heebo_900Black, Nunito_800ExtraBold,
    Rubik_400Regular, Rubik_500Medium, Rubik_600SemiBold, Rubik_700Bold, Rubik_800ExtraBold }); // Rubik: CalculatorV2

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

  if (!fontsLoaded) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
    <ReducedMotionConfig mode={ReduceMotion.Never} />
    <BottomSheetModalProvider>
    <Stack screenOptions={{
      headerShown: false,
      contentStyle: { backgroundColor: '#f5f7fa' }
    }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="addVehicle" />
      <Stack.Screen name="LegalScreen" />
    </Stack>
    </BottomSheetModalProvider>
    </GestureHandlerRootView>
  );
}