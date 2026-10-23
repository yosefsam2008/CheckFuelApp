// app/(tabs)/vehicles.tsx
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import { Plus } from 'lucide-react-native';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown, FadeOut, useReducedMotion } from 'react-native-reanimated';
import { HeroHeader } from '../../components/calculator/HeroHeader';
import { PressableScale } from '../../components/calculator/PressableScale';
import { GradientButton, VehicleTile } from '../../components/vehicles/fuel';
import { VehicleCard } from '../../components/vehicles/VehicleCard';
import { dur, haptic, useEnter } from '../../constants/motion';
import { colors, Heebo, radius, shadow, space } from '../../constants/theme';
import { useOpenInfoMenu } from '../../hooks/use-info-menu';
import type { Vehicle } from '../../lib/data/vehiclesData';
import { LEGAL_UI_STRINGS } from '../../legal/LEGAL_UI_STRINGS_HE';

// Banner ads only exist on native
// eslint-disable-next-line @typescript-eslint/no-require-imports
const BannerAd = Platform.OS === 'web' ? () => null : require('../../components/BannerAd').default;

const GAP = 24;
const ADDED_FLAG = 'vehicleJustAdded'; // set by the add screen, read here on focus

type ToastMsg = { text: string; undo?: { vehicle: Vehicle; index: number; wasDefault: boolean }; error?: boolean };

/** Fade + rise on first show only (list changes must not replay it) */
function Enter({ delay, animate, children, style }: { delay: number; animate: boolean; children: React.ReactNode; style?: object }) {
  const anim = useEnter(delay);
  const [first] = useState(animate); // fixed at mount: flipping it later would remount the children
  return first ? <Animated.View style={[style, anim]}>{children}</Animated.View> : <View style={style}>{children}</View>;
}

// `def`: undefined leaves lastVehicleId alone, null removes it
const persist = async (list: Vehicle[], def?: string | null) => {
  try {
    await AsyncStorage.setItem('vehicles', JSON.stringify(list));
    if (def) await AsyncStorage.setItem('lastVehicleId', def);
    else if (def === null) await AsyncStorage.removeItem('lastVehicleId');
    return true;
  } catch (error) {
    console.error('Failed to save vehicles:', error);
    return false;
  }
};

export default function VehiclesScreen() {
  const router = useRouter();
  const openInfo = useOpenInfoMenu();
  const reduced = useReducedMotion();

  const [vehicles, setVehiclesState] = useState<Vehicle[]>([]);
  const listRef = useRef<Vehicle[]>([]);
  const [defaultId, setDefaultId] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [toast, setToast] = useState<ToastMsg | null>(null);
  const [intro, setIntro] = useState(true);
  const [loaded, setLoaded] = useState(false);

  const setVehicles = (next: Vehicle[]) => {
    listRef.current = next;
    setVehiclesState(next);
  };
  const failToast = () => setToast({ text: LEGAL_UI_STRINGS.errors.apiError, error: true });

  useEffect(() => {
    const t = setTimeout(() => setIntro(false), 1500);
    return () => clearTimeout(t);
  }, []);

  useFocusEffect(
    useCallback(() => {
      let alive = true;
      (async () => {
        try {
          const [list, last, added] = await Promise.all([AsyncStorage.getItem('vehicles'), AsyncStorage.getItem('lastVehicleId'), AsyncStorage.getItem(ADDED_FLAG)]);
          if (!alive) return;
          setVehicles(list ? JSON.parse(list) : []);
          setDefaultId(last);
          setLoaded(true);
          if (added) {
            AsyncStorage.removeItem(ADDED_FLAG).catch(() => {});
            setToast({ text: 'הרכב נשמר ונבחר כברירת מחדל' });
          }
        } catch (error) {
          console.error('Failed to load vehicles:', error);
          if (alive) failToast();
        }
      })();
      return () => {
        alive = false;
      };
    }, []),
  );

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), toast.undo ? 4000 : 2400);
    return () => clearTimeout(t);
  }, [toast]);

  // an unknown stored id means the first vehicle, as in the calculator
  const effectiveDefault = vehicles.some((v) => v.id === defaultId) ? defaultId : (vehicles[0]?.id ?? null);

  // optimistic: change state first, write, and put everything back if the write fails
  const commit = async (next: Vehicle[], nextDefault: string | null | undefined, okToast: ToastMsg) => {
    const prev = listRef.current;
    const prevDefault = defaultId;
    setVehicles(next);
    if (nextDefault !== undefined) setDefaultId(nextDefault);
    if (await persist(next, nextDefault)) setToast(okToast);
    else {
      setVehicles(prev);
      setDefaultId(prevDefault);
      failToast();
    }
  };

  const setDefault = (v: Vehicle) => {
    haptic.select();
    commit(listRef.current, v.id, { text: `${v.name} נקבע כברירת מחדל` });
  };
  const save = (v: Vehicle, name: string, avgConsumption: number | undefined) =>
    commit(listRef.current.map((x) => (x.id === v.id ? { ...x, name, avgConsumption } : x)), undefined, { text: 'השינויים נשמרו' });

  const remove = (v: Vehicle) => {
    const index = listRef.current.findIndex((x) => x.id === v.id);
    const next = listRef.current.filter((x) => x.id !== v.id);
    const wasDefault = v.id === effectiveDefault;
    setOpenId(null);
    // deleting the default hands it to the vehicle that takes its place; an empty list drops the key
    commit(next, wasDefault ? (next[Math.min(index, next.length - 1)]?.id ?? null) : undefined, { text: 'הרכב נמחק', undo: { vehicle: v, index, wasDefault } });
  };
  const undo = async ({ vehicle, index, wasDefault }: NonNullable<ToastMsg['undo']>) => {
    setToast(null);
    const next = [...listRef.current];
    next.splice(Math.min(index, next.length), 0, vehicle);
    const prev = listRef.current;
    setVehicles(next);
    if (wasDefault) setDefaultId(vehicle.id);
    if (!(await persist(next, wasDefault ? vehicle.id : undefined))) {
      setVehicles(prev);
      failToast();
    }
  };

  const goAdd = () => router.push('/addVehicle');
  const count = vehicles.length;
  const cardDelay = (i: number) => Math.min(160 + 70 * i, 450);

  return (
    <View style={styles.screen}>
      {/* keeps the inline name / consumption fields above the keyboard (Android is edge-to-edge since SDK 54) */}
      <KeyboardAvoidingView behavior="padding" style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <HeroHeader onInfo={openInfo} title="הרכבים שלי" subtitle="הרכב במסגרת הירוקה נפתח במחשבון" />

        {loaded && count === 0 ? (
          <Enter delay={cardDelay(0)} animate={intro} style={styles.top}>
            <View style={styles.emptyCard}>
              <VehicleTile size={40} />
              <Text style={styles.emptyTitle}>עוד אין רכבים</Text>
              <Text style={styles.emptySub}>מקלידים מספר רישוי ואנחנו מביאים את הדגם, סוג הדלק והצריכה ממשרד הרישוי. אפשר גם להוסיף ידנית.</Text>
              <View style={styles.emptyCta}>
                <GradientButton label="הוספת רכב" onPress={goAdd} icon={<Plus size={20} color={colors.white} strokeWidth={2.4} />} />
              </View>
            </View>
          </Enter>
        ) : (
          <>
            {vehicles.map((v, i) => (
              <Enter key={v.id} delay={cardDelay(i)} animate={intro} style={[styles.item, i === 0 && styles.first]}>
                <VehicleCard
                  vehicle={v}
                  isDefault={v.id === effectiveDefault}
                  open={openId === v.id}
                  intro={intro}
                  onToggle={() => setOpenId(openId === v.id ? null : v.id)}
                  onSetDefault={setDefault}
                  onSave={save}
                  onDelete={remove}
                />
              </Enter>
            ))}
            {loaded && (
              <Enter delay={cardDelay(count)} animate={intro} style={[styles.item, count === 0 && styles.first]}>
                <PressableScale onPress={goAdd} style={styles.add} accessibilityRole="button" accessibilityLabel="הוספת רכב">
                  <View style={styles.plus}>
                    <Plus size={22} color={colors.selectedText} strokeWidth={2.4} />
                  </View>
                  <View>
                    <Text style={styles.addTitle}>הוספת רכב</Text>
                    <Text style={styles.addSub}>לפי מספר רישוי או ידנית</Text>
                  </View>
                </PressableScale>
              </Enter>
            )}
          </>
        )}

        <View style={styles.banner}>
          <BannerAd />
        </View>
      </ScrollView>
      </KeyboardAvoidingView>

      {toast && (
        <Animated.View
          entering={reduced ? undefined : FadeInDown.duration(dur.std)}
          exiting={reduced ? undefined : FadeOut.duration(200)}
          style={[styles.toast, toast.error && { backgroundColor: colors.error }]}
          accessibilityLiveRegion="polite"
        >
          <Text style={styles.toastText}>{toast.text}</Text>
          {toast.undo && (
            <Pressable onPress={() => undo(toast.undo!)} hitSlop={12} style={styles.toastAction} accessibilityRole="button" accessibilityLabel="ביטול המחיקה">
              <Text style={styles.toastActionText}>ביטול</Text>
            </Pressable>
          )}
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { paddingBottom: 96 },
  // the wrappers must sit above the hero because the first card overlaps it
  top: { zIndex: 2 },
  item: { zIndex: 2, marginHorizontal: space.gutter, marginTop: 12 },
  first: { marginTop: -44 },
  add: { minHeight: 72, flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 20, borderRadius: radius.card, borderWidth: 1.5, borderStyle: 'dashed', borderColor: '#C7C7CC' },
  plus: { width: 40, height: 40, borderRadius: radius.tile, backgroundColor: colors.selectedFill, alignItems: 'center', justifyContent: 'center' },
  addTitle: { fontFamily: Heebo.bold, fontSize: 16, color: colors.selectedText },
  addSub: { fontFamily: Heebo.regular, fontSize: 14, color: colors.textMuted },
  banner: { alignItems: 'center', marginTop: GAP },

  emptyCard: { backgroundColor: colors.surface, borderRadius: radius.card, marginTop: -44, marginHorizontal: space.gutter, paddingTop: GAP, paddingHorizontal: 20, paddingBottom: GAP, alignItems: 'flex-start', gap: 6, ...shadow.card },
  emptyTitle: { fontFamily: Heebo.extra, fontSize: 17, color: colors.text, marginTop: 6 },
  emptySub: { fontFamily: Heebo.regular, fontSize: 14, color: colors.textMuted },
  emptyCta: { alignSelf: 'stretch', marginTop: 14 },

  toast: { position: 'absolute', start: space.gutter, end: space.gutter, bottom: space.gutter, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, backgroundColor: colors.text, borderRadius: radius.pill, paddingVertical: 4, paddingStart: 18, paddingEnd: 8, minHeight: 48 },
  toastText: { fontFamily: Heebo.bold, fontSize: 14, color: colors.white, flexShrink: 1 },
  toastAction: { minHeight: 44, paddingHorizontal: 12, justifyContent: 'center' },
  toastActionText: { fontFamily: Heebo.bold, fontSize: 14, color: colors.selectedFill },
});
