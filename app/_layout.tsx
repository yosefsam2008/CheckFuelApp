// app/_layout.tsx
import { Stack } from 'expo-router';

export default function RootLayout() {
  return (
    <Stack>
      {/* Main tabs layout */}
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />

      {/* Optional modal screen (uncomment if needed) */}
      {/* <Stack.Screen name="modal" options={{ presentation: 'modal' }} /> */}
    </Stack>
  );
}
