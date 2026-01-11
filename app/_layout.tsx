// app/_layout.tsx
import { Stack } from 'expo-router';
import { useEffect } from 'react';
import { StatusBar, Platform } from 'react-native';
import * as NavigationBar from 'expo-navigation-bar';
import { runAutoMigration } from '../lib/utils/evDataMigration';

export default function RootLayout() {
  useEffect(() => {
    // Set status bar to translucent for edge-to-edge experience
    if (Platform.OS === 'android') {
      StatusBar.setTranslucent(true);
      StatusBar.setBackgroundColor('transparent');
      // Note: setPositionAsync and setBackgroundColorAsync are not supported with edge-to-edge enabled
      // Using expo-navigation-bar visibility only
      NavigationBar.setVisibilityAsync('visible');
    }

    // Run EV data migration (km/% → kWh/km)
    // This will only run once and is safe to call multiple times
    runAutoMigration();
  }, []);

  return (
    <Stack screenOptions={{
      headerShown: false,
      contentStyle: { backgroundColor: '#f5f7fa' }
    }}>
      {/* Main tabs layout */}
      <Stack.Screen name="(tabs)" />

      {/* Add Vehicle by Plate screen */}
      <Stack.Screen name="addVehicleByPlate" />

      {/* Add Vehicle screen */}
      <Stack.Screen name="addVehicle" />

      {/* Legal screens */}
      <Stack.Screen name="LegalScreen" />
      <Stack.Screen name="UserGuideScreen" />
    </Stack>
  );
}
