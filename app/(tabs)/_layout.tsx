// app/(tabs)/_layout.tsx
import { MaterialIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Tabs } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Linking, Modal, Platform, Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import * as Updates from 'expo-updates';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FirstLaunchModal } from '../../components/modals/FirstLaunchModal';
import { PRIVACY_POLICY_URL } from '../../legal/LEGAL_UI_STRINGS_HE';
import { privacyOptionsRequired, showPrivacyOptions } from '../../lib/ads/initAds';
import LegalScreen from '../LegalScreen';
import UserGuideScreen from '../UserGuideScreen';

import { color } from '../../constants/theme';

const TEAL = color.brandTeal;

type MenuView = 'menu' | 'legal' | 'guide';

// Info panel (guide, legal). Legal/guide render inside the same Modal: iOS can't present a second modal while the menu is dismissing
function SideMenu({ visible, onClose, onDataDeleted }: { visible: boolean; onClose: () => void; onDataDeleted: () => void }) {
  const insets = useSafeAreaInsets();
  const [view, setView] = useState<MenuView>('menu');
  const [showAdPrivacy, setShowAdPrivacy] = useState(false);

  useEffect(() => {
    if (visible) privacyOptionsRequired().then(setShowAdPrivacy);
  }, [visible]);

  const confirmDeleteAll = () =>
    Alert.alert('מחיקת כל הנתונים', 'זה ימחק את כל הרכבים וההיסטוריה מהמכשיר. אי אפשר לבטל.', [
      { text: 'ביטול', style: 'cancel' },
      {
        text: 'מחק הכול',
        style: 'destructive',
        onPress: async () => {
          try {
            await AsyncStorage.clear(); // the app only stores its own keys here
            close();
            onDataDeleted();
            // Reload so screens drop their in-memory state; dev builds can't reload.
            if (!__DEV__) Updates.reloadAsync().catch(() => {});
          } catch {
            Alert.alert('שגיאה', 'לא הצלחנו למחוק את הנתונים. נסה שוב.');
          }
        },
      },
    ]);

  const close = () => {
    setView('menu');
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={close}>
      {view === 'legal' && <LegalScreen onClose={() => setView('menu')} />}
      {view === 'guide' && <UserGuideScreen onClose={() => setView('menu')} />}
      {view === 'menu' && (
        <View style={styles.overlay}>
          <View style={[styles.panel, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 16 }]}>
            <Text style={styles.brand}>מידע</Text>
            <TouchableOpacity style={styles.item} onPress={() => setView('guide')} accessibilityRole="button">
              <MaterialIcons name="help-outline" size={24} color="#555" />
              <Text style={styles.itemText}>מדריך למשתמש</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.item} onPress={() => setView('legal')} accessibilityRole="button">
              <MaterialIcons name="policy" size={24} color="#555" />
              <Text style={styles.itemText}>הצהרות משפטיות</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.item} onPress={() => Linking.openURL(PRIVACY_POLICY_URL)} accessibilityRole="link">
              <MaterialIcons name="open-in-new" size={24} color="#555" />
              <Text style={styles.itemText}>מדיניות פרטיות באתר</Text>
            </TouchableOpacity>
            {showAdPrivacy && (
              <TouchableOpacity style={styles.item} onPress={() => showPrivacyOptions().catch(() => {})} accessibilityRole="button">
                <MaterialIcons name="tune" size={24} color="#555" />
                <Text style={styles.itemText}>הגדרות פרטיות לפרסומות</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity style={styles.item} onPress={confirmDeleteAll} accessibilityRole="button" accessibilityLabel="מחק את כל הנתונים שלי">
              <MaterialIcons name="delete-outline" size={24} color="#B3261E" />
              <Text style={[styles.itemText, { color: '#B3261E' }]}>מחק את כל הנתונים שלי</Text>
            </TouchableOpacity>
          </View>
          <Pressable style={styles.backdrop} onPress={close} accessibilityLabel="סגור" />
        </View>
      )}
    </Modal>
  );
}

export default function TabsLayout() {
  const [showFirstLaunch, setShowFirstLaunch] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

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
      <FirstLaunchModal visible={showFirstLaunch} onAccept={handleAccept} />
      <SideMenu visible={menuOpen} onClose={() => setMenuOpen(false)} onDataDeleted={() => setShowFirstLaunch(true)} />

      <Tabs
        screenOptions={{
          headerShown: true,
          headerTitle: 'CheckFuel',
          headerTitleAlign: 'center',
          headerTitleStyle: { fontWeight: 'bold', color: '#222' },
          headerStyle: { backgroundColor: '#ffffff' },
          headerLeft: () => (
            <TouchableOpacity
              onPress={() => setMenuOpen(true)}
              style={styles.menuButton}
              accessibilityRole="button"
              accessibilityLabel="מידע ומסמכים משפטיים"
            >
              <MaterialIcons name="info-outline" size={28} color={TEAL} />
            </TouchableOpacity>
          ),
          sceneStyle: { backgroundColor: '#f5f7fa' },
          tabBarActiveTintColor: color.brandTealStrong,
          tabBarInactiveTintColor: color.textSecondary,
          // גובה דינמי וריווח תחתון שמתחשב בפס הניווט של המערכת
          tabBarStyle: {
            height: 60 + insets.bottom,
            paddingBottom: insets.bottom > 0 ? insets.bottom : 5,
            paddingTop: 5,
            backgroundColor: '#ffffff',
            borderTopWidth: 1,
            borderTopColor: '#e0e0e0',
          },
          tabBarLabelStyle: { fontWeight: 'bold', fontSize: 12 },
          tabBarItemStyle: { width: Platform.OS === 'ios' ? 80 : 70 },
          tabBarHideOnKeyboard: true,
        }}
      >
        <Tabs.Screen
          name="calculator"
          options={{
            tabBarLabel: 'מחשבון דלק',
            tabBarIcon: ({ color, size }) => <MaterialIcons name="calculate" color={color} size={size} />,
          }}
        />
        <Tabs.Screen
          name="history"
          options={{
            tabBarLabel: 'היסטוריה',
            tabBarIcon: ({ color, size }) => <MaterialIcons name="history" color={color} size={size} />,
          }}
        />
        <Tabs.Screen
          name="vehicles"
          options={{
            tabBarLabel: 'הרכבים שלי',
            tabBarIcon: ({ color, size }) => <MaterialIcons name="directions-car" color={color} size={size} />,
          }}
        />
      </Tabs>
    </>
  );
}

const styles = StyleSheet.create({
  menuButton: { paddingHorizontal: 16, paddingVertical: 8 },
  // row: בממשק RTL הלוח נפתח מימין (צד ההתחלה)
  overlay: { flex: 1, flexDirection: 'row', backgroundColor: 'rgba(0,0,0,0.4)' },
  backdrop: { flex: 1 },
  panel: { width: 280, backgroundColor: '#fff', paddingHorizontal: 12 },
  brand: { fontSize: 22, fontWeight: 'bold', color: TEAL, paddingHorizontal: 12, marginBottom: 16 },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 12,
  },
  divider: { height: 1, backgroundColor: '#e0e0e0', marginVertical: 8, marginHorizontal: 12 },
  itemActive: { backgroundColor: '#e0f2f1' },
  itemText: { fontSize: 17, color: '#333' },
  itemTextActive: { color: TEAL, fontWeight: 'bold' },
});
