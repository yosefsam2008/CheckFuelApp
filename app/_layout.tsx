// Per-weight imports: the package index pulls every weight into the build
import { Heebo_400Regular } from '@expo-google-fonts/heebo/400Regular';
import { Heebo_500Medium } from '@expo-google-fonts/heebo/500Medium';
import { Heebo_600SemiBold } from '@expo-google-fonts/heebo/600SemiBold';
import { Heebo_700Bold } from '@expo-google-fonts/heebo/700Bold';
import { Heebo_800ExtraBold } from '@expo-google-fonts/heebo/800ExtraBold';
import { Heebo_900Black } from '@expo-google-fonts/heebo/900Black';
import { Nunito_800ExtraBold } from '@expo-google-fonts/nunito/800ExtraBold';
import { Rubik_400Regular } from '@expo-google-fonts/rubik/400Regular';
import { Rubik_500Medium } from '@expo-google-fonts/rubik/500Medium';
import { Rubik_600SemiBold } from '@expo-google-fonts/rubik/600SemiBold';
import { Rubik_700Bold } from '@expo-google-fonts/rubik/700Bold';
import { Rubik_800ExtraBold } from '@expo-google-fonts/rubik/800ExtraBold';
import { useFonts } from 'expo-font';
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import { Stack } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useEffect } from 'react';
import { I18nManager } from 'react-native';
import { colors } from '../constants/theme';
import { initAds } from '../lib/ads/initAds';
import { markFirstOpen, useReviewAfterShare } from '../lib/growth';
import { runAutoMigration } from '../lib/utils/evDataMigration';
import * as Updates from 'expo-updates';

export default function RootLayout() {
  const [fontsLoaded] = useFonts({ Heebo_400Regular, Heebo_500Medium, Heebo_600SemiBold, Heebo_700Bold, Heebo_800ExtraBold, Heebo_900Black, Nunito_800ExtraBold,
    Rubik_400Regular, Rubik_500Medium, Rubik_600SemiBold, Rubik_700Bold, Rubik_800ExtraBold }); // Rubik: CalculatorV2

  useReviewAfterShare();

  useEffect(() => {
    markFirstOpen();
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

        // 3. הגירת נתונים (Android edge-to-edge is always on in SDK 54; no status/nav bar setup needed)
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
    <BottomSheetModalProvider>
    <Stack screenOptions={{
      headerShown: false,
      contentStyle: { backgroundColor: colors.bg }
    }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="addVehicle" />
      <Stack.Screen name="LegalScreen" />
    </Stack>
    </BottomSheetModalProvider>
    </GestureHandlerRootView>
  );
}