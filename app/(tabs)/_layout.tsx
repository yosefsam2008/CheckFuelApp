// app/(tabs)/_layout.tsx
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Tabs } from 'expo-router';
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { ChevronLeft, ExternalLink, Scale, SlidersHorizontal, Star, Trash2, X } from 'lucide-react-native';
import { Alert, Image, Linking, Modal, Platform, Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Animated, { Easing, runOnJS, useAnimatedStyle, useReducedMotion, useSharedValue, withTiming } from 'react-native-reanimated';
import * as Updates from 'expo-updates';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CheckFuelTabBar } from '../../components/nav/CheckFuelTabBar';
import { FirstLaunchModal, LEGAL_VERSION_KEY } from '../../components/modals/FirstLaunchModal';
import { LEGAL_VERSION } from '../../legal/LEGAL_CONTENT_HE';
import { InfoMenuContext } from '../../hooks/use-info-menu';
import { PRIVACY_POLICY_URL } from '../../legal/LEGAL_UI_STRINGS_HE';
import { privacyOptionsRequired, showPrivacyOptions } from '../../lib/ads/initAds';
import { openStorePage } from '../../lib/growth';
import { colors } from '../../constants/colors';
import { LTR } from '../../constants/rtl';
import { Rubik } from '../../constants/themeV2';
import LegalScreen from '../LegalScreen';

const TEAL = '#009688';

type MenuView = 'menu' | 'legal';

// the panel slides in from its edge and back out to the same edge: decelerate in, accelerate out, a little faster
// round only the edge facing the content (the left). Web is laid out by CSS rtl, so physical left is right there;
// native runs forceRTL, where 'end' is the left.
const INNER_CORNERS = Platform.OS === 'web' ? { borderTopLeftRadius: 28, borderBottomLeftRadius: 28 } : { borderTopEndRadius: 28, borderBottomEndRadius: 28 };
const OPEN = { duration: 300, easing: Easing.out(Easing.cubic) };
const CLOSE = { duration: 240, easing: Easing.in(Easing.cubic) };

// Info panel. Legal renders inside the same Modal: iOS can't present a second modal while the menu is dismissing
function SideMenu({ visible, onClose, onDataDeleted }: { visible: boolean; onClose: () => void; onDataDeleted: () => void }) {
  const insets = useSafeAreaInsets();
  const reduced = useReducedMotion();
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

  // p: 0 = off screen, 1 = open. The parent hides the Modal only after the close animation lands.
  const p = useSharedValue(0);
  const w = useSharedValue(400); // panel width, measured; until then far enough to start hidden
  const closing = useRef(false);
  useEffect(() => {
    if (!visible) return;
    closing.current = false;
    p.value = 0;
    p.value = withTiming(1, reduced ? { duration: 150 } : OPEN);
  }, [visible, reduced, p]);

  const finish = () => {
    setView('menu');
    onClose();
  };
  const close = () => {
    if (closing.current) return;
    closing.current = true;
    p.value = withTiming(0, reduced ? { duration: 120 } : CLOSE, (done) => {
      if (done) runOnJS(finish)();
    });
  };

  // Reduce Motion: fades only. translateX is physical: the panel sits on the right edge (RTL start) on web and native.
  const panelStyle = useAnimatedStyle(() => (reduced ? { opacity: p.value } : { transform: [{ translateX: (1 - p.value) * w.value }] }));
  const scrimStyle = useAnimatedStyle(() => ({ opacity: p.value }));

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={close}>
      {view === 'legal' && <LegalScreen onClose={() => setView('menu')} />}
      {view === 'menu' && (
        <View style={styles.overlay}>
          <Animated.View style={[StyleSheet.absoluteFill, styles.scrim, scrimStyle]} pointerEvents="none" />
          <Animated.View onLayout={(e) => (w.value = e.nativeEvent.layout.width)} style={[styles.panel, INNER_CORNERS, panelStyle, { paddingTop: insets.top + 18, paddingBottom: insets.bottom + 18 }]}>
            <View style={styles.top}>
              <View {...LTR.props} style={[styles.logo, LTR.style]} accessible accessibilityRole="image" accessibilityLabel="Checkfuel">
                <Image source={require('../../assets/images/v2/mark-ink.png')} style={styles.mark} />
                <Text style={styles.heck}>
                  heck<Text style={styles.fuel}>fuel</Text>
                </Text>
              </View>
              <Pressable style={styles.close} onPress={close} accessibilityRole="button" accessibilityLabel="סגור">
                <X size={18} color={colors.text} strokeWidth={2.2} />
              </Pressable>
            </View>

            <Text style={styles.h1} accessibilityRole="header">
              מידע
            </Text>
            <Text style={styles.lead}>הרכבים וההיסטוריה שלך נשמרים רק במכשיר הזה.</Text>

            <View style={styles.group}>
              <MenuRow icon={<Scale size={18} color={colors.text} strokeWidth={2} />} label="הצהרות משפטיות" sub="תנאי שימוש והגבלת אחריות" trail="chevron" onPress={() => setView('legal')} role="button" />
              <MenuRow divider icon={<ExternalLink size={18} color={colors.text} strokeWidth={2} />} label="מדיניות פרטיות" sub="נפתח באתר" trail="external" onPress={() => Linking.openURL(PRIVACY_POLICY_URL)} role="link" />
              {showAdPrivacy && (
                <MenuRow divider icon={<SlidersHorizontal size={18} color={colors.text} strokeWidth={2} />} label="הגדרות פרטיות לפרסומות" trail="chevron" onPress={() => showPrivacyOptions().catch(() => {})} role="button" />
              )}
              {Platform.OS === 'android' && (
                <MenuRow divider icon={<Star size={18} color={colors.text} strokeWidth={2} />} label="דרגו אותנו" sub="נפתח ב-Google Play" trail="external" onPress={openStorePage} role="link" />
              )}
            </View>

            <View style={styles.spacer} />

            <View style={styles.group}>
              <MenuRow
                danger
                icon={<Trash2 size={18} color={colors.danger} strokeWidth={2} />}
                label="מחק את כל הנתונים שלי"
                sub="רכבים והיסטוריה, בלי אפשרות לשחזר"
                onPress={confirmDeleteAll}
                role="button"
              />
            </View>
          </Animated.View>
          <Pressable style={styles.backdrop} onPress={close} accessibilityLabel="סגור" />
        </View>
      )}
    </Modal>
  );
}

function MenuRow({ icon, label, sub, trail, onPress, role, divider, danger }: {
  icon: ReactNode;
  label: string;
  sub?: string;
  trail?: 'chevron' | 'external';
  onPress: () => void;
  role: 'button' | 'link';
  divider?: boolean;
  danger?: boolean;
}) {
  return (
    <TouchableOpacity activeOpacity={0.6} style={[styles.row, divider && styles.rowDivider]} onPress={onPress} accessibilityRole={role} accessibilityLabel={sub ? `${label}, ${sub}` : label}>
      <View style={[styles.tile, danger && styles.tileDanger]}>{icon}</View>
      <View style={styles.rowText}>
        <Text style={[styles.rowLabel, danger && { color: colors.danger }]}>{label}</Text>
        {!!sub && <Text style={styles.rowSub}>{sub}</Text>}
      </View>
      {trail === 'chevron' && <ChevronLeft size={18} color={colors.textMuted} strokeWidth={2} />}
      {trail === 'external' && <ExternalLink size={16} color={colors.textMuted} strokeWidth={2} />}
    </TouchableOpacity>
  );
}

export default function TabsLayout() {
  const [showFirstLaunch, setShowFirstLaunch] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const openMenu = useCallback(() => setMenuOpen(true), []);


  useEffect(() => {
    // first launch, or accepted an older version of the terms
    AsyncStorage.getItem(LEGAL_VERSION_KEY)
      .then((v) => setShowFirstLaunch(v !== LEGAL_VERSION))
      .catch(() => setShowFirstLaunch(true));
  }, []);

  return (
    <InfoMenuContext.Provider value={openMenu}>
      <FirstLaunchModal visible={showFirstLaunch} onAccept={() => setShowFirstLaunch(false)} />
      <SideMenu visible={menuOpen} onClose={() => setMenuOpen(false)} onDataDeleted={() => setShowFirstLaunch(true)} />

      <Tabs
        tabBar={(props) => <CheckFuelTabBar {...props} />}
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
          // background tabs stop re-rendering while another tab is shown
          freezeOnBlur: true,
        }}
      >
        <Tabs.Screen
          name="calculator"
          options={{
            headerShown: false, // the calculator hero has its own brand row and info button
            tabBarLabel: 'מחשבון דלק',
            tabBarIcon: ({ color, size }) => <MaterialIcons name="calculate" color={color} size={size} />,
          }}
        />
        <Tabs.Screen
          name="history"
          options={{
            headerShown: false, // the history hero has its own brand row and info button
            tabBarLabel: 'היסטוריה',
            tabBarIcon: ({ color, size }) => <MaterialIcons name="history" color={color} size={size} />,
          }}
        />
        <Tabs.Screen
          name="vehicles"
          options={{
            headerShown: false, // the vehicles hero has its own brand row and info button
            tabBarLabel: 'הרכבים שלי',
            tabBarIcon: ({ color, size }) => <MaterialIcons name="directions-car" color={color} size={size} />,
          }}
        />
      </Tabs>
    </InfoMenuContext.Provider>
  );
}

const styles = StyleSheet.create({
  menuButton: { paddingHorizontal: 16, paddingVertical: 8 },
  // row: in RTL the panel opens from the start (right) side
  overlay: { flex: 1, flexDirection: 'row' },
  scrim: { backgroundColor: colors.scrim },
  backdrop: { flex: 1 },
  panel: { width: 310, maxWidth: '86%', backgroundColor: colors.surface, paddingHorizontal: 16 },
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 4 },
  logo: { flexDirection: 'row', alignItems: 'flex-end' },
  mark: { width: 24, height: 24, marginRight: -1, marginBottom: 1 },
  heck: { fontFamily: Rubik.medium, fontSize: 21, letterSpacing: -0.4, lineHeight: 24, color: colors.text },
  fuel: { fontFamily: Rubik.bold, color: colors.accentTextLarge },
  close: { width: 44, height: 44, borderRadius: 22, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.surfaceRaised, alignItems: 'center', justifyContent: 'center' },
  h1: { fontFamily: Rubik.extra, fontSize: 28, lineHeight: 34, letterSpacing: -0.28, color: colors.text, marginTop: 22, marginHorizontal: 4 },
  lead: { fontFamily: Rubik.regular, fontSize: 14, lineHeight: 20, color: colors.textMuted, marginTop: 4, marginBottom: 18, marginHorizontal: 4 },
  group: { backgroundColor: colors.surfaceRaised, borderWidth: 1, borderColor: colors.line, borderRadius: 22, paddingHorizontal: 14 },
  row: { minHeight: 64, flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10 },
  rowDivider: { borderTopWidth: 1, borderTopColor: colors.lineSubtle },
  tile: { width: 36, height: 36, borderRadius: 12, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  tileDanger: { backgroundColor: '#FBEAEA' },
  rowText: { flex: 1, minWidth: 0, gap: 2 },
  rowLabel: { fontFamily: Rubik.bold, fontSize: 15, color: colors.text },
  rowSub: { fontFamily: Rubik.regular, fontSize: 12, color: colors.textMuted },
  spacer: { flex: 1, minHeight: 18 },
});
