// app/(tabs)/_layout.tsx
import { MaterialIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Tabs } from 'expo-router';
import { useEffect, useState } from 'react';
import { FirstLaunchModal } from '../../components/modals/FirstLaunchModal';
import { Alert, Platform, BackHandler } from 'react-native';


export default function TabsLayout() {
  const [showFirstLaunch, setShowFirstLaunch] = useState(false);

  useEffect(() => {
   const checkFirstLaunch = async () => {
  try {
    const hasLaunched = await AsyncStorage.getItem('app_launched');
    if (!hasLaunched) {
      setShowFirstLaunch(true);
    }
  } catch (error) {
    console.error('Error checking first launch:', error);
    // Show modal by default if can't read storage
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
    // Still allow usage if storage fails, but log the error
    setShowFirstLaunch(false);
  }
};

const handleReject = () => {
  Alert.alert(
    "Terms Required",
    "You must accept the Terms of Service and Privacy Policy to use this application.",
    [
      {
        text: "Review Again",
        style: "default",
      },
      {
        text: "Exit App",
        style: "destructive",
        onPress: () => {
          if (Platform.OS === 'android') {
            BackHandler.exitApp();
          }
        },
      },
    ],
    { cancelable: false }
  );
  // Note: Modal stays visible - user MUST accept or exit
};

  return (
    <>
      <FirstLaunchModal
        visible={showFirstLaunch}
        onAccept={handleAccept}
        onReject={handleReject}
      />
    
      <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#009688',
        tabBarInactiveTintColor: '#999',
        tabBarStyle: { height: 70, paddingBottom: 5 },
        tabBarLabelStyle: { fontWeight: 'bold', fontSize: 12 },
        tabBarItemStyle: { width: Platform.OS === 'ios' ? 80 : 70 }, // ככה כל טאבים יתאימו
        tabBarHideOnKeyboard: true, // מסתיר כשהמקלדת פתוחה
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
