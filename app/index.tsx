// app/index.tsx
import { Redirect } from 'expo-router';
import { useEffect } from 'react';
import mobileAds from 'react-native-google-mobile-ads';

export default function Index() {
  useEffect(() => {
    // אתחול רגיל ונקי של הפרסומות
    mobileAds()
      .initialize()
      .then((adapterStatuses) => {
        if (__DEV__) console.log('✅ AdMob initialized:', adapterStatuses);
      })
      .catch((error) => {
        console.error('❌ AdMob initialization failed:', error);
      });
  }, []);
  
  return <Redirect href="/dashboard" />;
}