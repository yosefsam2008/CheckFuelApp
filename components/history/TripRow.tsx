// One trip: collapsed line that opens in place to the details and a single inline delete confirmation
import { ChevronDown, Trash2 } from 'lucide-react-native';
import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View, type LayoutChangeEvent } from 'react-native';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { dur, ease, haptic } from '../../constants/motion';
import { NO_TOUCH } from '../../constants/rtl';
import { colors, Heebo, radius } from '../../constants/theme';
import { dayLabel, tripTime } from '../../lib/calc/monthly';
import { formatAmount, formatMoney } from '../../lib/format';
import type { Vehicle } from '../../lib/tripCost';
import type { TripRecord } from '../../types/trip';
import { PressableScale } from '../calculator/PressableScale';
import { vehicleTitle } from '../calculator/VehiclePriceCard';
import { LtrText } from './LtrText';

const PAD_X = 24;
const energyName = (t: TripRecord) => (t.energyType === 'electricity' ? 'חשמל' : t.fuelType === 'Diesel' ? 'סולר' : 'בנזין');

/** Each detail line starts a little after the previous one (about 30ms apart) while the open progress `p` runs 0 -> 1 */
function Reveal({ p, i, children }: { p: SharedValue<number>; i: number; children: React.ReactNode }) {
  const style = useAnimatedStyle(() => {
    const q = Math.min(1, Math.max(0, (p.value - i * 0.1) / 0.5));
    return { opacity: q, transform: [{ translateY: (1 - q) * 8 }] };
  });
  return <Animated.View style={style}>{children}</Animated.View>;
}

function Line({ label, value, unit, ltr, first }: { label: string; value: string; unit?: string; ltr?: boolean; first?: boolean }) {
  return (
    <View style={[styles.kv, !first && styles.kvBorder]}>
      <Text style={styles.kvLabel}>{label}</Text>
      <View style={styles.kvValue}>
        {ltr || unit ? <LtrText style={styles.kvText}>{value}</LtrText> : <Text style={styles.kvText}>{value}</Text>}
        {!!unit && <Text style={styles.kvText}>{unit}</Text>}
      </View>
    </View>
  );
}

function FadeIn({ children, style }: { children: React.ReactNode; style?: object }) {
  const reduced = useReducedMotion();
  const o = useSharedValue(reduced ? 1 : 0);
  useEffect(() => {
    if (!reduced) o.value = withTiming(1, { duration: dur.micro + 50, easing: ease.out });
  }, [reduced, o]);
  const anim = useAnimatedStyle(() => ({ opacity: o.value }));
  return <Animated.View style={[style, anim]}>{children}</Animated.View>;
}

interface Props {
  trip: TripRecord;
  open: boolean;
  onToggle: () => void;
  /** called once the row has slid out */
  onDelete: (trip: TripRecord) => void;
  /** no divider above the first row of a list */
  first?: boolean;
}

export function TripRow({ trip, open, onToggle, onDelete, first }: Props) {
  const reduced = useReducedMotion();
  const [confirming, setConfirming] = useState(false);
  const p = useSharedValue(open ? 1 : 0);
  const detailH = useSharedValue(0);
  const fullH = useSharedValue(0);
  const exit = useSharedValue(0);
  const everOpen = useRef(open);
  if (open) everOpen.current = true;

  useEffect(() => {
    if (!open) setConfirming(false);
    p.value = reduced ? (open ? 1 : 0) : withTiming(open ? 1 : 0, { duration: dur.std, easing: ease.out });
  }, [open, reduced, p]);

  const ev = trip.energyType === 'electricity';
  const used = trip.fuelConsumed;
  const consumption = trip.distance > 0 && used > 0 ? (ev ? (used / trip.distance) * 100 : trip.distance / used) : 0;
  const when = dayLabel(tripTime(trip), Date.now());
  const cost = formatMoney(trip.totalCost);
  const route = trip.from && trip.to ? `${trip.from} ← ${trip.to}` : '';
  const km = `${formatAmount(trip.distance, 0)} ק״מ`;

  const wrap = useAnimatedStyle(() =>
    exit.value > 0
      ? { height: fullH.value * (1 - exit.value), opacity: 1 - exit.value, overflow: 'hidden', transform: [{ translateX: -30 * exit.value }] }
      : {},
  );
  const detail = useAnimatedStyle(() => ({ height: detailH.value * p.value }));
  const chevron = useAnimatedStyle(() => ({ transform: [{ rotate: `${180 * p.value}deg` }] }));

  const confirmDelete = () => {
    haptic.press();
    if (reduced) return onDelete(trip);
    exit.value = withTiming(1, { duration: dur.std, easing: ease.out }, (done) => {
      if (done) runOnJS(onDelete)(trip);
    });
  };

  return (
    <Animated.View
      style={wrap}
      onLayout={(e: LayoutChangeEvent) => {
        if (exit.value === 0) fullH.value = e.nativeEvent.layout.height;
      }}
    >
      {!first && <View style={styles.divider} />}
      <PressableScale
        onPress={onToggle}
        scaleTo={0.985}
        style={styles.row}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        accessibilityLabel={`${route ? `מ${trip.from} אל ${trip.to}, ` : ''}${when}, ${trip.distance} ק״מ, ${cost}`}
      >
        <View style={styles.main}>
          {/* a routed trip leads with its route; manual-distance and older trips keep the date */}
          <Text style={styles.when} numberOfLines={1}>
            {route || when}
          </Text>
          <Text style={styles.km} numberOfLines={1}>
            {route ? `${when} · ${km}` : km}
          </Text>
        </View>
        <Text style={styles.cost}>{cost}</Text>
        <Animated.View style={chevron}>
          <ChevronDown size={18} color={colors.textMuted} strokeWidth={2} />
        </Animated.View>
      </PressableScale>

      <Animated.View style={[styles.clip, detail, !open && NO_TOUCH]} accessibilityElementsHidden={!open} importantForAccessibility={open ? 'auto' : 'no-hide-descendants'}>
        {/* mounted on the first open only: a closed row skipped ~10 animated hooks, which made the tab's first open heavy */}
        {everOpen.current && (
        <View style={styles.measure} onLayout={(e) => (detailH.value = e.nativeEvent.layout.height)}>
          <View style={styles.dl}>
            <Reveal p={p} i={0}>
              <Line first label="רכב" value={vehicleTitle({ name: trip.vehicleName, model: trip.vehicleModel } as Vehicle)} ltr />
            </Reveal>
            {!!route && (
              <Reveal p={p} i={1}>
                <Line label="מוצא" value={trip.from!} />
                <Line label="יעד" value={trip.to!} />
              </Reveal>
            )}
            <Reveal p={p} i={1}>
              <Line label={ev ? 'חשמל שנצרך' : 'דלק שנצרך'} value={used.toFixed(1)} unit={ev ? 'קוט״ש' : 'ליטר'} />
            </Reveal>
            <Reveal p={p} i={2}>
              <Line label="צריכה" value={consumption.toFixed(1)} unit={ev ? 'קוט״ש ל־100 ק״מ' : 'ק״מ לליטר'} />
            </Reveal>
            <Reveal p={p} i={3}>
              <Line label="עלות לק״מ" value={formatMoney(trip.costPerKm)} />
            </Reveal>
            <Reveal p={p} i={4}>
              <Line label="סוג אנרגיה" value={energyName(trip)} />
            </Reveal>
          </View>
          <Reveal p={p} i={5}>
            <View style={styles.actions}>
              {confirming ? (
                <FadeIn style={styles.confirm}>
                  <Text style={styles.confirmQ}>למחוק את הנסיעה?</Text>
                  <View style={styles.btns}>
                    <PressableScale onPress={() => setConfirming(false)} style={[styles.btn, styles.ghost]} accessibilityRole="button">
                      <Text style={styles.btnText}>ביטול</Text>
                    </PressableScale>
                    <PressableScale onPress={confirmDelete} style={[styles.btn, styles.danger]} accessibilityRole="button">
                      <Text style={[styles.btnText, { color: colors.white }]}>מחק</Text>
                    </PressableScale>
                  </View>
                </FadeIn>
              ) : (
                <FadeIn>
                  <PressableScale onPress={() => setConfirming(true)} style={styles.askBtn} accessibilityRole="button">
                    <Trash2 size={18} color={colors.error} strokeWidth={2} />
                    <Text style={[styles.btnText, { color: colors.error }]}>מחק נסיעה</Text>
                  </PressableScale>
                </FadeIn>
              )}
            </View>
          </Reveal>
        </View>
        )}
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  divider: { height: StyleSheet.hairlineWidth, marginHorizontal: PAD_X, backgroundColor: colors.divider },
  row: { minHeight: 84, flexDirection: 'row', alignItems: 'center', gap: 16, paddingVertical: 20, paddingHorizontal: PAD_X },
  main: { flex: 1, minWidth: 0 },
  when: { fontFamily: Heebo.semi, fontSize: 16, color: colors.text },
  km: { fontFamily: Heebo.regular, fontSize: 14, color: colors.textMuted, marginTop: 4 },
  cost: { fontFamily: Heebo.extra, fontSize: 18, color: colors.text },
  clip: { overflow: 'hidden' },
  // measured at its natural height; absolute so the clip's animated height does not squeeze it
  measure: { position: 'absolute', width: '100%' },
  dl: { marginHorizontal: PAD_X, paddingHorizontal: 16, paddingVertical: 6, backgroundColor: colors.bg, borderRadius: radius.tile },
  kv: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, paddingVertical: 12 },
  kvBorder: { borderTopWidth: 1, borderTopColor: colors.divider },
  kvLabel: { fontFamily: Heebo.regular, fontSize: 15, color: colors.textMuted },
  kvValue: { flexDirection: 'row', alignItems: 'center', gap: 4, flexShrink: 1 },
  kvText: { fontFamily: Heebo.bold, fontSize: 15, color: colors.text },
  actions: { minHeight: 68, justifyContent: 'center', paddingTop: 12, paddingBottom: 18, paddingHorizontal: PAD_X },
  confirm: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  confirmQ: { fontFamily: Heebo.bold, fontSize: 14, color: colors.text },
  btns: { flexDirection: 'row', gap: 8 },
  btn: { height: 44, minWidth: 44, paddingHorizontal: 18, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
  ghost: { backgroundColor: colors.bg },
  danger: { backgroundColor: colors.error },
  askBtn: { height: 44, flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start' },
  btnText: { fontFamily: Heebo.bold, fontSize: 14, color: colors.text },
});
