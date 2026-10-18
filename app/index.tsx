import { Redirect } from 'expo-router';
import { useEffect, useState } from 'react';
import { View, ActivityIndicator } from 'react-native';

export default function Index() {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const initializeApp = async () => {
      // 1. אתחול AdMob (הקוד המקורי שלך)
      try {
        const admobModule = require('react-native-google-mobile-ads');
        const mobileAds = admobModule.default || admobModule;

        if (typeof mobileAds === 'function') {
          await mobileAds().initialize();
          if (__DEV__) console.log('✅ AdMob initialized correctly!');
        } else if (mobileAds && typeof mobileAds.initialize === 'function') {
          await mobileAds.initialize();
          if (__DEV__) console.log('✅ AdMob initialized from object!');
        } else {
          console.log('⚠️ Skipping AdMob init. Type received:', typeof mobileAds);
        }
      } catch (error) {
        console.error('❌ AdMob error bypassed:', error);
      }

      // כולם נכנסים למחשבון
      setIsReady(true);
    };

    initializeApp();
  }, []);

  // מציגים טוען בזמן שהאפליקציה בודקת לאן לנווט
  if (!isReady) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f5f9f8' }}>
        <ActivityIndicator size="large" color="#009688" />
      </View>
    );
  }
  
  return <Redirect href="/calculator" />;
}