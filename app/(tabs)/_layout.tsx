  // app/(tabs)/_layout.tsx
  import { MaterialIcons } from '@expo/vector-icons';
  import AsyncStorage from '@react-native-async-storage/async-storage';
  import { Tabs } from 'expo-router';
  import { useEffect, useState } from 'react';
  import { Platform } from 'react-native';
  import { useSafeAreaInsets } from 'react-native-safe-area-context';
  import { FirstLaunchModal } from '../../components/modals/FirstLaunchModal';

  export default function TabsLayout() {
    const [showFirstLaunch, setShowFirstLaunch] = useState(false);
    
    // מקבל את המידות המדויקות של שטחי המערכת (כולל פס הניווט למטה)
    const insets = useSafeAreaInsets();

    useEffect(() => {
      const checkFirstLaunch = async () => {
        try {
          const hasLaunched = await AsyncStorage.getItem('app_launched');
          if (!hasLaunched) {
            setShowFirstLaunch(true);
          }
        } catch (error) {
          console.error('Error checking first launch:', error);
          setShowFirstLaunch(true);
        }
      };

      checkFirstLaunch();
    }, []);

    const handleAccept = async () => {
      try {
        await AsyncStorage.setItem('app_launched', 'true');
        await AsyncStorage.setItem('legal_accepted_date', new Date().toISOString());
        setShowFirstLaunch(false);
      } catch (error) {
        console.error('Error saving acceptance:', error);
        setShowFirstLaunch(false);
      }
    };

    return (
      <>
        <FirstLaunchModal
          visible={showFirstLaunch}
          onAccept={handleAccept}
        />
      
        <Tabs
          screenOptions={{
            headerShown: false,
            tabBarActiveTintColor: '#009688',
            tabBarInactiveTintColor: '#999',
            // התיקון העיקרי: גובה דינמי וריווח תחתון שמתחשב בפס של המערכת
            tabBarStyle: { 
              height: 60 + insets.bottom, // 60 זה הגובה הבסיסי, אליו נוסיף את גובה פס המערכת
              paddingBottom: insets.bottom > 0 ? insets.bottom : 5, // אם יש פס מערכת, שים ריווח שווה לו. אם אין, שים 5.
              paddingTop: 5,
              backgroundColor: '#ffffff', // חובה להגדיר צבע רקע כדי שפס המערכת לא ייראה שקוף דרכו
              borderTopWidth: 1,
              borderTopColor: '#e0e0e0',
            },
            tabBarLabelStyle: { fontWeight: 'bold', fontSize: 12 },
            tabBarItemStyle: { width: Platform.OS === 'ios' ? 80 : 70 },
            tabBarHideOnKeyboard: true,
          }}
        >
          <Tabs.Screen
            name="dashboard"
            options={{
              tabBarLabel: "לוח הבקרה",
              tabBarIcon: ({ color, size }) => (
                <MaterialIcons name="dashboard" color={color} size={size} />
              ),
            }}
          />

          <Tabs.Screen
            name="calculator"
            options={{
              tabBarLabel: "מחשבון דלק",
              tabBarIcon: ({ color, size }) => (
                <MaterialIcons name="calculate" color={color} size={size} />
              ),
            }}
          />

          <Tabs.Screen
            name="history"
            options={{
              tabBarLabel: "היסטוריה",
              tabBarIcon: ({ color, size }) => (
                <MaterialIcons name="history" color={color} size={size} />
              ),
            }}
          />

          <Tabs.Screen
            name="vehicles"
            options={{
              tabBarLabel: "הרכבים שלי",
              tabBarIcon: ({ color, size }) => (
                <MaterialIcons name="directions-car" color={color} size={size} />
              ),
            }}
          />
        </Tabs>
      </>
    );
  }