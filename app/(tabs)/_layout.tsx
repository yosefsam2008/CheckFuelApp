// app/(tabs)/_layout.tsx
import { Tabs } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { Platform } from 'react-native';

export default function TabsLayout() {
  return (
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
          tabBarLabel: "היסטורית נסיעות",
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons name="history" color={color} size={size} />
          ),
        }}
      />
  
      <Tabs.Screen
        name="settings"
        options={{
          tabBarLabel: "הגדרות",
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons name="settings" color={color} size={size} />
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
  );
}
