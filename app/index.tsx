import { Redirect } from 'expo-router';
import { useEffect } from 'react';

export default function Index() {
  useEffect(() => {
    const initAdMob = async () => {
      try {
        // אנחנו משתמשים ב-require במקום import כדי לעקוף את הבלגן של השרת
        const admobModule = require('react-native-google-mobile-ads');
        const mobileAds = admobModule.default || admobModule;

        // בודק אם זה הגיע בתור פונקציה (כמו שצריך להיות)
        if (typeof mobileAds === 'function') {
          await mobileAds().initialize();
          if (__DEV__) console.log('✅ AdMob initialized correctly!');
        } 
        // בודק אם זה הגיע בתור אובייקט (הבאג של השרת)
        else if (mobileAds && typeof mobileAds.initialize === 'function') {
          await mobileAds.initialize();
          if (__DEV__) console.log('✅ AdMob initialized from object!');
        } 
        // אם אף אחד מהם לא עובד, לא קורסים - פשוט ממשיכים הלאה
        else {
          console.log('⚠️ Skipping AdMob init. Type received:', typeof mobileAds);
        }
      } catch (error) {
        console.error('❌ AdMob error bypassed:', error);
      }
    };

    initAdMob();
  }, []);
  
  // מעבר בטוח למסך הראשי
  return <Redirect href="/dashboard" />;
}