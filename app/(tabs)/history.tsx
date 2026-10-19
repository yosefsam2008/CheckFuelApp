// app/(tabs)/history.tsx
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import { History as HistoryIcon } from 'lucide-react-native';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown, FadeOut, useAnimatedStyle, useReducedMotion, useSharedValue, withTiming } from 'react-native-reanimated';
import { HeroHeader } from '../../components/calculator/HeroHeader';
import { PressableScale } from '../../components/calculator/PressableScale';
import { MonthSummary } from '../../components/history/MonthSummary';
import { TripRow } from '../../components/history/TripRow';
import { dur, ease, haptic, useEnter } from '../../constants/motion';
import { colors, Heebo, radius, shadow, space } from '../../constants/theme';
import { useOpenInfoMenu } from '../../hooks/use-info-menu';
import { loadTrips } from '../../lib/calc/history';
import { lastMonths, monthKey, monthName, monthSummary } from '../../lib/calc/monthly';
import { LEGAL_UI_STRINGS } from '../../legal/LEGAL_UI_STRINGS_HE';
import type { TripRecord } from '../../types/trip';

// Banner ads only exist on native
// eslint-disable-next-line @typescript-eslint/no-require-imports
const BannerAd = Platform.OS === 'web' ? () => null : require('../../components/BannerAd').default;

const KEY = 'tripHistory';
const GAP = 24;
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

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <HeroHeader onInfo={openInfo} title="כמה הוצאתי על דלק?" subtitle="כל שקל על הכביש, במבט אחד" />

        {empty ? (
          <Enter delay={120} animate={intro} style={styles.top}>
            <View style={styles.emptyCard}>
              <View style={styles.tile}>
                <HistoryIcon size={24} color={colors.textMuted} strokeWidth={2} />
              </View>
              <Text style={styles.emptyTitle}>עוד אין נסיעות שמורות</Text>
              <Text style={styles.emptySub}>{'אחרי חישוב, לוחצים "שמור" והנסיעה מופיעה כאן עם סיכום חודשי.'}</Text>
              <PressableScale onPress={() => router.navigate('/calculator')} style={styles.cta} accessibilityRole="button">
                <Text style={styles.ctaText}>לחישוב ראשון</Text>
              </PressableScale>
            </View>
          </Enter>
        ) : (
          <>
            <Enter delay={120} animate={intro} style={styles.top}>
              <MonthSummary summary={summary} months={months} selectedKey={selectedKey} onSelectMonth={selectMonth} isCurrent={selectedKey === currentKey} />
            </Enter>

            <Enter delay={240} animate={intro} style={styles.card}>
              <View style={styles.head}>
                <Text style={styles.headTitle}>נסיעות ב{monthName(selectedKey)}</Text>
                <Text style={styles.headCount}>{summary.count} נסיעות</Text>
              </View>
              <Animated.View style={slideStyle}>
                {summary.trips.length === 0 ? (
                  <Text style={styles.none}>אין נסיעות בחודש הזה</Text>
                ) : (
                  summary.trips.map((t, i) => (
                    <Enter key={t.id} delay={Math.min(280 + 40 * i, 520)} animate={intro}>
                      <TripRow trip={t} first={i === 0} open={openId === t.id} onToggle={() => setOpenId(openId === t.id ? null : t.id)} onDelete={deleteTrip} />
                    </Enter>
                  ))
                )}
              </Animated.View>
              <View style={styles.clear}>
                {confirmAll ? (
                  <View style={styles.confirm}>
                    <Text style={styles.confirmQ}>למחוק את כל {trips.length} הנסיעות?</Text>
                    <View style={styles.btns}>
                      <PressableScale onPress={() => setConfirmAll(false)} style={[styles.btn, styles.ghost]} accessibilityRole="button">
                        <Text style={styles.btnText}>ביטול</Text>
                      </PressableScale>
                      <PressableScale onPress={clearAll} style={[styles.btn, styles.danger]} accessibilityRole="button">
                        <Text style={[styles.btnText, { color: colors.white }]}>מחק הכל</Text>
                      </PressableScale>
                    </View>
                  </View>
                ) : (
                  <PressableScale onPress={() => setConfirmAll(true)} style={styles.askBtn} accessibilityRole="button">
                    <Text style={[styles.btnText, { color: colors.error }]}>מחק את כל ההיסטוריה</Text>
                  </PressableScale>
                )}
              </View>
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
  // the wrapper must sit above the hero because the card inside overlaps it
  top: { zIndex: 2 },
  card: { backgroundColor: colors.surface, borderRadius: radius.card, marginHorizontal: space.gutter, marginTop: GAP, overflow: 'hidden', ...shadow.card },
  head: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', paddingTop: 22, paddingHorizontal: GAP, paddingBottom: 10 },
  headTitle: { fontFamily: Heebo.extra, fontSize: 17, color: colors.text },
  headCount: { fontFamily: Heebo.regular, fontSize: 13, color: colors.textMuted },
  none: { fontFamily: Heebo.regular, fontSize: 14, color: colors.textMuted, paddingVertical: 20, paddingHorizontal: GAP },
  clear: { minHeight: 68, justifyContent: 'center', paddingVertical: 12, paddingHorizontal: GAP },
  confirm: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  confirmQ: { fontFamily: Heebo.bold, fontSize: 14, color: colors.text, flexShrink: 1 },
  btns: { flexDirection: 'row', gap: 8 },
  btn: { height: 44, minWidth: 44, paddingHorizontal: 18, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
  ghost: { backgroundColor: colors.bg },
  danger: { backgroundColor: colors.error },
  askBtn: { height: 44, alignSelf: 'center', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 12 },
  btnText: { fontFamily: Heebo.bold, fontSize: 14, color: colors.text },
  banner: { alignItems: 'center', marginTop: GAP },

  emptyCard: { backgroundColor: colors.surface, borderRadius: radius.card, marginTop: -44, marginHorizontal: space.gutter, paddingTop: GAP, paddingHorizontal: 20, paddingBottom: GAP, alignItems: 'flex-start', gap: 6, ...shadow.card },
  tile: { width: 40, height: 40, borderRadius: radius.tile, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center', marginBottom: 6 },
  emptyTitle: { fontFamily: Heebo.extra, fontSize: 17, color: colors.text },
  emptySub: { fontFamily: Heebo.regular, fontSize: 14, color: colors.textMuted },
  cta: { height: 44, marginTop: 10, paddingHorizontal: 20, borderRadius: radius.pill, backgroundColor: colors.selectedFill, alignItems: 'center', justifyContent: 'center' },
  ctaText: { fontFamily: Heebo.bold, fontSize: 14, color: colors.guideText },

  toast: { position: 'absolute', start: space.gutter, end: space.gutter, bottom: space.gutter, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, backgroundColor: colors.text, borderRadius: radius.pill, paddingVertical: 4, paddingStart: 18, paddingEnd: 8, minHeight: 48 },
  toastText: { fontFamily: Heebo.bold, fontSize: 14, color: colors.white, flexShrink: 1 },
  toastAction: { minHeight: 44, paddingHorizontal: 12, justifyContent: 'center' },
  toastActionText: { fontFamily: Heebo.bold, fontSize: 14, color: colors.selectedFill },
});
