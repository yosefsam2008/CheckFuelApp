import { Redirect } from 'expo-router';
import { useEffect } from 'react';
import { Platform } from 'react-native';

// ייבוא מותנה רק ב-Native
let mobileAds: any = null;
if (Platform.OS !== 'web') {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    mobileAds = require('react-native-google-mobile-ads').default;
  } catch {
    if (__DEV__) {
      console.log('AdMob library not available');
    }
  }
}

export default function Index() {
  useEffect(() => {
    // אתחול AdMob רק ב-Native
    if (Platform.OS !== 'web' && mobileAds) {
      mobileAds()
        .initialize()
        .then((adapterStatuses: any) => {
  if (__DEV__) console.log('✅ AdMob initialized:', adapterStatuses);
})
.catch((error: any) => {
  console.error('❌ AdMob initialization failed:', error); // KEEP
});
// ...
} else {
  if (__DEV__) console.log('AdMob not initialized (Web platform or library unavailable)');
}
  }, []);
  
  return <Redirect href="/dashboard" />;
}