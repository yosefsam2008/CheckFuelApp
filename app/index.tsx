import { Redirect } from 'expo-router';
import { useEffect } from 'react';
import { Platform } from 'react-native';

export default function Index() {
  useEffect(() => {
    // Dynamic import רק ב-runtime ורק ב-Native
    if (Platform.OS !== 'web') {
      import('react-native-google-mobile-ads')
        .then((module) => {
          const mobileAds = module.default;
          return mobileAds().initialize();
        })
        .then((adapterStatuses: any) => {
          if (__DEV__) console.log('✅ AdMob initialized:', adapterStatuses);
        })
        .catch((error: any) => {
          console.error('❌ AdMob initialization failed:', error);
        });
    } else {
      if (__DEV__) console.log('AdMob not initialized (Web platform)');
    }
  }, []);
  
  return <Redirect href="/dashboard" />;
}