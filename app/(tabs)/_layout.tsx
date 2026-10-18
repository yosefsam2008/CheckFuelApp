// app/(tabs)/_layout.tsx
import { MaterialIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Tabs, usePathname, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FirstLaunchModal } from '../../components/modals/FirstLaunchModal';
import LegalScreen from '../LegalScreen';
import UserGuideScreen from '../UserGuideScreen';

const TEAL = '#009688';

const MENU_ITEMS = [
  { path: '/calculator', label: 'מחשבון דלק', icon: 'calculate' },
  { path: '/vehicles', label: 'הרכבים שלי', icon: 'directions-car' },
  { path: '/history', label: 'היסטוריה', icon: 'history' },
] as const;

type MenuView = 'menu' | 'legal' | 'guide';

// Legal/guide render inside the same Modal: iOS can't present a second modal while the menu is dismissing
function SideMenu({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const router = useRouter();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const [view, setView] = useState<MenuView>('menu');

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
            <Text style={styles.brand}>CheckFuel</Text>
            {MENU_ITEMS.map((item) => {
              const active = pathname === item.path;
              return (
                <TouchableOpacity
                  key={item.path}
                  style={[styles.item, active && styles.itemActive]}
                  onPress={() => {
                    close();
                    if (!active) router.navigate(item.path);
                  }}
                  accessibilityRole="button"
                >
                  <MaterialIcons name={item.icon} size={24} color={active ? TEAL : '#555'} />
                  <Text style={[styles.itemText, active && styles.itemTextActive]}>{item.label}</Text>
                </TouchableOpacity>
              );
            })}
            <View style={styles.divider} />
            <TouchableOpacity style={styles.item} onPress={() => setView('guide')} accessibilityRole="button">
              <MaterialIcons name="help-outline" size={24} color="#555" />
              <Text style={styles.itemText}>מדריך למשתמש</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.item} onPress={() => setView('legal')} accessibilityRole="button">
              <MaterialIcons name="policy" size={24} color="#555" />
              <Text style={styles.itemText}>הצהרות משפטיות</Text>
            </TouchableOpacity>
          </View>
          <Pressable style={styles.backdrop} onPress={close} accessibilityLabel="סגור תפריט" />
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
      <SideMenu visible={menuOpen} onClose={() => setMenuOpen(false)} />

      {/* אין טאבים תחתונים: הניווט הוא התפריט בכותרת. הניווט נשאר מבוסס Tabs כדי לשמור על הנתיבים הקיימים. */}
      <Tabs
        tabBar={() => null}
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
              accessibilityLabel="תפריט"
            >
              <MaterialIcons name="menu" size={28} color={TEAL} />
            </TouchableOpacity>
          ),
          // בלי הטאב-בר, פס הניווט של המערכת צריך ריווח תחתון משלו
          sceneStyle: { paddingBottom: insets.bottom, backgroundColor: '#f5f7fa' },
        }}
      />
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
