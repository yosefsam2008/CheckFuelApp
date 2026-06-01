import { Redirect } from 'expo-router';
import { useEffect, useState } from 'react';
import { View, ActivityIndicator } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function Index() {
  const [isReady, setIsReady] = useState(false);
  const [targetRoute, setTargetRoute] = useState("/dashboard"); // ברירת המחדל

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

      // 2. בדיקת סוג המשתמש (חדש או חוזר)
      try {
        const storedVehicles = await AsyncStorage.getItem('vehicles');
        const vehicles = storedVehicles ? JSON.parse(storedVehicles) : [];

        if (vehicles.length === 0) {
          // משתמש חדש לגמרי - נשלח אותו ישירות למחשבון
          setTargetRoute("/calculator");
        } else {
          // משתמש קיים (יש לו רכב) - נשלח ללוח הבקרה
          setTargetRoute("/dashboard");
        }
      } catch (error) {
        console.error('❌ Error reading AsyncStorage:', error);
        // במקרה של שגיאה, ברירת המחדל היא Dashboard
        setTargetRoute("/dashboard");
      } finally {
        // מסמנים שהאפליקציה סיימה לטעון את הבדיקות
        setIsReady(true);
      }
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
  
  // מעבר חכם למסך המתאים לפי החלטת הלוגיקה
  return <Redirect href={targetRoute as any} />;
}