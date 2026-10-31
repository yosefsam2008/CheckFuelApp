// app/(tabs)/vehicles.tsx
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { BottomSheetModal } from '@gorhom/bottom-sheet';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import Info from 'lucide-react-native/dist/esm/icons/info';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Image, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown, FadeOut, useReducedMotion } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ActiveVehicleHero } from '../../components/vehicles/ActiveVehicleHero';
import { isEv } from '../../components/vehicles/fuel';
import { VehicleDetailsSheet } from '../../components/vehicles/VehicleDetailsSheet';
import { VehicleSwitchList } from '../../components/vehicles/VehicleSwitchList';
import { colors } from '../../constants/colors';
import { dur, haptic } from '../../constants/motion';
import { LTR } from '../../constants/rtl';
import { Rubik } from '../../constants/themeV2';
import { useOpenInfoMenu } from '../../hooks/use-info-menu';
import type { Vehicle } from '../../lib/data/vehiclesData';
import { defaultIO, getPrices, type PriceResult } from '../../lib/prices';
import type { FuelPrices } from '../../lib/tripCost';
import { LEGAL_UI_STRINGS } from '../../legal/LEGAL_UI_STRINGS_HE';

// Banner ads only exist on native
// eslint-disable-next-line @typescript-eslint/no-require-imports
const BannerAd = Platform.OS === 'web' ? () => null : require('../../components/BannerAd').default;

const ADDED_FLAG = 'vehicleJustAdded'; // set by the add screen, read here on focus

type ToastMsg = { text: string; undo?: { vehicle: Vehicle; index: number; wasDefault: boolean }; error?: boolean };

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
  const [sheetId, setSheetId] = useState<string | null>(null);
  const sheetRef = useRef<BottomSheetModal>(null);
  const insets = useSafeAreaInsets();
  const [toast, setToast] = useState<ToastMsg | null>(null);
  const [loaded, setLoaded] = useState(false);

  const setVehicles = (next: Vehicle[]) => {
    listRef.current = next;
    setVehiclesState(next);
  };
  const failToast = () => setToast({ text: LEGAL_UI_STRINGS.errors.apiError, error: true });

  // display only: today's price for the hero's cost line, the same cached source the calculator reads
  const [prices, setPrices] = useState<FuelPrices | null>(null);
  useEffect(() => {
    let alive = true;
    const apply = (r: PriceResult) => alive && setPrices(r.prices);
    getPrices(defaultIO, apply).then(apply, () => {});
    return () => {
      alive = false;
    };
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

  // display only: the active vehicle in the hero, the rest in the switch list
  const active = vehicles.find((v) => v.id === effectiveDefault);
  const others = useMemo(() => vehicles.filter((v) => v.id !== effectiveDefault), [vehicles, effectiveDefault]);
  const bestId = useMemo(() => {
    const fuel = vehicles.filter((v) => v.avgConsumption && !isEv(v.fueltype)); // kWh and km/L don't compare
    return fuel.length > 1 ? fuel.reduce((a, b) => (b.avgConsumption! > a.avgConsumption! ? b : a)).id : null;
  }, [vehicles]);

  // stable handlers so a swap re-renders only the rows that change
  const latest = useRef({ setDefault, goAdd });
  latest.current = { setDefault, goAdd };
  const onSelect = useCallback((v: Vehicle) => latest.current.setDefault(v), []);
  const onAdd = useCallback(() => latest.current.goAdd(), []);
  const openDetails = () => {
    setSheetId(active?.id ?? null);
    sheetRef.current?.present();
  };
  const onDelete = (v: Vehicle) => {
    sheetRef.current?.dismiss();
    remove(v);
  };

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* same header as the calculator (CalculatorV2) */}
        <View style={styles.header}>
          <Pressable style={styles.infoBtn} onPress={openInfo} accessibilityRole="button" accessibilityLabel="מידע">
            <Info size={20} color={colors.text} strokeWidth={2} />
          </Pressable>
          <View {...LTR.props} style={[styles.logo, LTR.style]} accessible accessibilityRole="image" accessibilityLabel="Checkfuel">
            <Image source={require('../../assets/images/v2/mark-ink.png')} style={styles.mark} />
            <Text style={styles.heck}>
              heck<Text style={styles.fuel}>fuel</Text>
            </Text>
          </View>
        </View>

        <Text style={styles.h1} accessibilityRole="header">
          הרכבים שלי
        </Text>

        {active && <ActiveVehicleHero vehicle={active} prices={prices} onDetails={openDetails} />}
        {loaded && count === 0 && <Text style={styles.emptySub}>מקלידים מספר רישוי ואנחנו מביאים את הדגם, סוג הדלק והצריכה ממשרד הרישוי. אפשר גם להוסיף ידנית.</Text>}
        {loaded && <VehicleSwitchList vehicles={others} bestId={bestId} onSelect={onSelect} onAdd={onAdd} />}

        <View style={styles.banner}>
          <BannerAd />
        </View>
      </ScrollView>

      <VehicleDetailsSheet sheetRef={sheetRef} vehicle={vehicles.find((v) => v.id === sheetId)} onSave={save} onDelete={onDelete} />

      {toast && (
        <Animated.View
          entering={reduced ? undefined : FadeInDown.duration(dur.std)}
          exiting={reduced ? undefined : FadeOut.duration(200)}
          style={[styles.toast, toast.error && { backgroundColor: colors.toastError }]}
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
  screen: { flex: 1, backgroundColor: colors.surface },
  content: { paddingHorizontal: 16, paddingBottom: 96, gap: 14 },
  // same header as the calculator (CalculatorV2) and history
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 18, paddingHorizontal: 4, paddingBottom: 6 },
  logo: { flexDirection: 'row', alignItems: 'flex-end' },
  mark: { width: 26, height: 26, marginRight: -1, marginBottom: 1 },
  heck: { fontFamily: Rubik.medium, fontSize: 24, letterSpacing: -0.5, lineHeight: 26, color: colors.text },
  fuel: { fontFamily: Rubik.bold, color: colors.accentTextLarge },
  infoBtn: { width: 44, height: 44, borderRadius: 22, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.surfaceRaised, alignItems: 'center', justifyContent: 'center' },
  h1: { fontFamily: Rubik.extra, fontSize: 28, lineHeight: 32, letterSpacing: -0.28, color: colors.text, marginHorizontal: 4 },
  emptySub: { fontFamily: Rubik.regular, fontSize: 14, color: colors.textMuted, marginHorizontal: 4 },
  banner: { alignItems: 'center', marginTop: 10 },

  toast: { position: 'absolute', start: 16, end: 16, bottom: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, backgroundColor: colors.surfaceInverse, borderRadius: 14, paddingVertical: 4, paddingStart: 18, paddingEnd: 8, minHeight: 48 },
  toastText: { fontFamily: Rubik.bold, fontSize: 14, color: colors.textInverse, flexShrink: 1 },
  toastAction: { minHeight: 44, paddingHorizontal: 12, justifyContent: 'center' },
  toastActionText: { fontFamily: Rubik.bold, fontSize: 14, color: colors.accent },
});
