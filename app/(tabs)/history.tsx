// app/(tabs)/history.tsx
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import { History as HistoryIcon, Info } from 'lucide-react-native';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Image, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown, FadeOut, useAnimatedStyle, useReducedMotion, useSharedValue, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PressableScale } from '../../components/calculator/PressableScale';
import { ClearHistory } from '../../components/history/ClearHistory';
import { HistoryHero } from '../../components/history/HistoryHero';
import { TripRow } from '../../components/history/TripRow';
import { dur, ease, haptic, useEnter } from '../../constants/motion';
import { LTR } from '../../constants/rtl';
import { colors } from '../../constants/colors';
import { Rubik } from '../../constants/themeV2';
import { formatMoney } from '../../lib/format';
import { useOpenInfoMenu } from '../../hooks/use-info-menu';
import { loadTrips } from '../../lib/calc/history';
import { lastMonths, monthKey, monthName, monthSummary } from '../../lib/calc/monthly';
import { LEGAL_UI_STRINGS } from '../../legal/LEGAL_UI_STRINGS_HE';
import type { TripRecord } from '../../types/trip';

// Banner ads only exist on native
// eslint-disable-next-line @typescript-eslint/no-require-imports
const BannerAd = Platform.OS === 'web' ? () => null : require('../../components/BannerAd').default;

const KEY = 'tripHistory';
const SLIDE = 24;

type ToastMsg = { text: string; undo?: TripRecord[]; error?: boolean };

const readTrips = async (): Promise<TripRecord[]> => {
  const stored = await AsyncStorage.getItem(KEY);
  return stored ? JSON.parse(stored) : [];
};

const persist = async (next: TripRecord[]) => {
  try {
    if (next.length) await AsyncStorage.setItem(KEY, JSON.stringify(next));
    else await AsyncStorage.removeItem(KEY);
    return true;
  } catch (error) {
    console.error('Failed to save history:', error);
    return false;
  }
};

/** Fade + rise on first show only (month changes and deletes must not replay it) */
function Enter({ delay, animate, children, style }: { delay: number; animate: boolean; children: React.ReactNode; style?: object }) {
  const anim = useEnter(delay);
  const [first] = useState(animate); // fixed at mount: flipping it later would remount the children
  return first ? <Animated.View style={[style, anim]}>{children}</Animated.View> : <View style={style}>{children}</View>;
}

export default function HistoryScreen() {
  const router = useRouter();
  const openInfo = useOpenInfoMenu();
  const reduced = useReducedMotion();
  const insets = useSafeAreaInsets();

  const [trips, setTripsState] = useState<TripRecord[]>([]);
  const tripsRef = useRef<TripRecord[]>([]);
  const [now, setNow] = useState(Date.now());
  const [selected, setSelected] = useState<number | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [confirmAll, setConfirmAll] = useState(false);
  const [toast, setToast] = useState<ToastMsg | null>(null);
  const [intro, setIntro] = useState(true);

  const setTrips = (next: TripRecord[]) => {
    tripsRef.current = next;
    setTripsState(next);
  };
  const failToast = () => setToast({ text: LEGAL_UI_STRINGS.errors.apiError, error: true });

  useEffect(() => {
    const t = setTimeout(() => setIntro(false), 1000);
    return () => clearTimeout(t);
  }, []);

  useFocusEffect(
    useCallback(() => {
      let alive = true;
      (async () => {
        try {
          const loaded = await loadTrips();
          if (!alive) return;
          setNow(Date.now());
          setTrips(loaded);
        } catch (error) {
          console.error('Failed to load history:', error);
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

  const currentKey = monthKey(now);
  const selectedKey = selected ?? currentKey;
  const months = lastMonths(trips, now);
  const summary = monthSummary(trips, selectedKey, now);

  // list slides in from the side of the month that was picked: newer months sit at the left end of the chart
  const slideX = useSharedValue(0);
  const slideO = useSharedValue(1);
  const prevKey = useRef(selectedKey);
  useEffect(() => {
    const dir = Math.sign(selectedKey - prevKey.current);
    prevKey.current = selectedKey;
    if (!dir || reduced) return;
    slideX.value = dir > 0 ? -SLIDE : SLIDE;
    slideO.value = 0;
    slideX.value = withTiming(0, { duration: dur.std, easing: ease.out });
    slideO.value = withTiming(1, { duration: dur.std, easing: ease.out });
  }, [selectedKey, reduced, slideX, slideO]);
  const slideStyle = useAnimatedStyle(() => ({ opacity: slideO.value, transform: [{ translateX: slideX.value }] }));

  const selectMonth = (key: number) => {
    setSelected(key);
    setOpenId(null);
    setConfirmAll(false);
  };

  // optimistic: remove, write, and put everything back if the write fails
  const remove = async (next: TripRecord[], removed: TripRecord[]) => {
    const prev = tripsRef.current;
    setTrips(next);
    setOpenId(null);
    setConfirmAll(false);
    if (await persist(next)) setToast({ text: 'הנסיעה נמחקה', undo: removed });
    else {
      setTrips(prev);
      failToast();
    }
  };
  const deleteTrip = (trip: TripRecord) => remove(tripsRef.current.filter((t) => t.id !== trip.id), [trip]);
  const clearAll = () => {
    haptic.press();
    remove([], tripsRef.current);
  };

  const undo = async (items: TripRecord[]) => {
    setToast(null);
    try {
      const have = await readTrips();
      const ids = new Set(have.map((t) => t.id));
      const merged = [...have, ...items.filter((t) => !ids.has(t.id))];
      await AsyncStorage.setItem(KEY, JSON.stringify(merged));
      setTrips(merged);
    } catch (error) {
      console.error('Failed to restore trips:', error);
      failToast();
    }
  };

  const empty = trips.length === 0;
  const press = reduced ? 1 : 0.98;

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
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
          ההיסטוריה שלי
        </Text>

        {empty ? (
          <Enter delay={120} animate={intro} style={styles.emptyCard}>
            <View style={styles.tile}>
              <HistoryIcon size={24} color={colors.textMuted} strokeWidth={2} />
            </View>
            <Text style={styles.emptyTitle}>עוד אין נסיעות שמורות</Text>
            <Text style={styles.emptySub}>{'אחרי חישוב, לוחצים "שמור" והנסיעה מופיעה כאן עם סיכום חודשי.'}</Text>
            <PressableScale onPress={() => router.navigate('/calculator')} scaleTo={press} style={styles.cta} accessibilityRole="button">
              <Text style={styles.ctaText}>לחישוב ראשון</Text>
            </PressableScale>
          </Enter>
        ) : (
          <>
            <Enter delay={120} animate={intro}>
              <HistoryHero summary={summary} months={months} selectedKey={selectedKey} onSelectMonth={selectMonth} isCurrent={selectedKey === currentKey} />
            </Enter>

            <Enter delay={240} animate={intro} style={styles.stack}>
              <View style={styles.card}>
                <View style={styles.head}>
                  <Text style={styles.headTitle}>נסיעות ב{monthName(selectedKey)}</Text>
                  {summary.count > 0 && <Text style={styles.headSub}>ממוצע {formatMoney(summary.total / summary.count, { decimals: 0 })} לנסיעה</Text>}
                </View>
                <Animated.View style={slideStyle}>
                  {summary.trips.length === 0 ? (
                    <View style={styles.none}>
                      <Text style={styles.noneTitle}>אין נסיעות בחודש הזה</Text>
                      <Text style={styles.noneSub}>חישובים ששומרים מהמחשבון יופיעו כאן</Text>
                    </View>
                  ) : (
                    summary.trips.map((t, i) => (
                      <Enter key={t.id} delay={Math.min(280 + 40 * i, 520)} animate={intro}>
                        <TripRow trip={t} first={i === 0} open={openId === t.id} onToggle={() => setOpenId(openId === t.id ? null : t.id)} onDelete={deleteTrip} />
                      </Enter>
                    ))
                  )}
                </Animated.View>
              </View>

              <ClearHistory confirming={confirmAll} count={trips.length} onAsk={() => setConfirmAll(true)} onCancel={() => setConfirmAll(false)} onConfirm={clearAll} />
            </Enter>
          </>
        )}

        <View style={styles.banner}>
          <BannerAd />
        </View>
      </ScrollView>

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
  content: { paddingHorizontal: 16, paddingBottom: 96, gap: 12 },
  // same header as the calculator (CalculatorV2)
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 18, paddingHorizontal: 4, paddingBottom: 6 },
  logo: { flexDirection: 'row', alignItems: 'flex-end' },
  mark: { width: 26, height: 26, marginRight: -1, marginBottom: 1 },
  heck: { fontFamily: Rubik.medium, fontSize: 24, letterSpacing: -0.5, lineHeight: 26, color: colors.text },
  fuel: { fontFamily: Rubik.bold, color: colors.accentTextLarge },
  infoBtn: { width: 44, height: 44, borderRadius: 22, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.surfaceRaised, alignItems: 'center', justifyContent: 'center' },
  h1: { fontFamily: Rubik.extra, fontSize: 28, lineHeight: 32, letterSpacing: -0.28, color: colors.text, marginHorizontal: 4 },

  stack: { gap: 12 },
  card: { backgroundColor: colors.surfaceRaised, borderWidth: 1, borderColor: colors.line, borderRadius: 22, paddingVertical: 6, paddingHorizontal: 16 },
  head: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'baseline', justifyContent: 'space-between', columnGap: 8, paddingTop: 10, paddingBottom: 6 },
  headTitle: { fontFamily: Rubik.extra, fontSize: 17, color: colors.text },
  headSub: { fontFamily: Rubik.regular, fontSize: 13, color: colors.textMuted, fontVariant: ['tabular-nums'] },
  none: { alignItems: 'center', gap: 4, paddingVertical: 24 },
  noneTitle: { fontFamily: Rubik.bold, fontSize: 15, color: colors.text, textAlign: 'center' },
  noneSub: { fontFamily: Rubik.regular, fontSize: 13, color: colors.textMuted, textAlign: 'center' },

  banner: { alignItems: 'center', marginTop: 12 },

  emptyCard: { backgroundColor: colors.surfaceRaised, borderWidth: 1, borderColor: colors.line, borderRadius: 22, padding: 20, alignItems: 'flex-start', gap: 6 },
  tile: { width: 40, height: 40, borderRadius: 13, backgroundColor: colors.surfaceSunken, alignItems: 'center', justifyContent: 'center', marginBottom: 6 },
  emptyTitle: { fontFamily: Rubik.extra, fontSize: 17, color: colors.text },
  emptySub: { fontFamily: Rubik.regular, fontSize: 14, color: colors.textMuted },
  cta: { height: 44, marginTop: 10, paddingHorizontal: 20, borderRadius: 14, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' },
  ctaText: { fontFamily: Rubik.bold, fontSize: 14, color: colors.text },

  toast: { position: 'absolute', start: 16, end: 16, bottom: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, backgroundColor: colors.surfaceInverse, borderRadius: 14, paddingVertical: 4, paddingStart: 18, paddingEnd: 8, minHeight: 48 },
  toastText: { fontFamily: Rubik.bold, fontSize: 14, color: colors.textInverse, flexShrink: 1 },
  toastAction: { minHeight: 44, paddingHorizontal: 12, justifyContent: 'center' },
  toastActionText: { fontFamily: Rubik.bold, fontSize: 14, color: colors.accent },
});
