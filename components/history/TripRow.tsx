// One trip: collapsed line that opens in place to the details and a single inline delete confirmation
import ChevronDown from 'lucide-react-native/dist/esm/icons/chevron-down';
import MapPin from 'lucide-react-native/dist/esm/icons/map-pin';
import Pencil from 'lucide-react-native/dist/esm/icons/pencil';
import Trash2 from 'lucide-react-native/dist/esm/icons/trash-2';
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
import { dur, EASE, ease, haptic } from '../../constants/motion';
import { LTR, NO_TOUCH } from '../../constants/rtl';
import { colors } from '../../constants/colors';
import { Rubik } from '../../constants/themeV2';
import { dayLabel, tripTime } from '../../lib/calc/monthly';
import { formatAmount, formatMoney } from '../../lib/format';
import type { Vehicle } from '../../lib/tripCost';
import type { TripRecord } from '../../types/trip';
import { PressableScale } from '../calculator/PressableScale';
import { vehicleTitle } from '../calculator/VehiclePriceCard';
import { LtrText } from './LtrText';

const energyName = (t: TripRecord) => (t.energyType === 'electricity' ? 'חשמל' : t.fuelType === 'Diesel' ? 'סולר' : 'בנזין');

/** A detail cell rises in a little after the previous one (reading order) while the open progress `p` runs 0 -> 1 */
function Cell({ p, i, children }: { p: SharedValue<number>; i: number; children: React.ReactNode }) {
  const style = useAnimatedStyle(() => {
    const q = Math.min(1, Math.max(0, (p.value - 0.15 - i * 0.1) / 0.5));
    return { alignItems: 'center', gap: 2, opacity: q, transform: [{ translateY: (1 - q) * 6 }] };
  });
  return <Animated.View style={style}>{children}</Animated.View>;
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
  onToggle: (id: string) => void;
  /** called once the row has slid out */
  onDelete: (trip: TripRecord) => void;
  /** no divider above the first row of a list */
  first?: boolean;
}

export const TripRow = React.memo(function TripRow({ trip, open, onToggle, onDelete, first }: Props) {
  const reduced = useReducedMotion();
  const [confirming, setConfirming] = useState(false);
  const p = useSharedValue(open ? 1 : 0);
  const rot = useSharedValue(open ? 1 : 0);
  const detailH = useSharedValue(0);
  const fullH = useSharedValue(0);
  const exit = useSharedValue(0);
  const everOpen = useRef(open);
  if (open) everOpen.current = true;

  useEffect(() => {
    if (!open) setConfirming(false);
    const to = open ? 1 : 0;
    p.value = reduced ? to : withTiming(to, { duration: 280, easing: EASE.out });
    rot.value = reduced ? to : withTiming(to, { duration: 240, easing: EASE.out });
  }, [open, reduced, p, rot]);

  const ev = trip.energyType === 'electricity';
  const used = trip.fuelConsumed;
  const consumption = trip.distance > 0 && used > 0 ? (ev ? (used / trip.distance) * 100 : trip.distance / used) : 0;
  const unitPrice = used > 0 ? trip.totalCost / used : 0; // display only: totalCost = fuelConsumed * price
  const when = dayLabel(tripTime(trip), Date.now());
  const cost = formatMoney(trip.totalCost);
  const route = trip.from && trip.to ? `${trip.from} ← ${trip.to}` : '';
  const km = `${formatAmount(trip.distance, 0)} ק״מ`;
  const cells: [string, string][] = [
    [used.toFixed(1), ev ? 'קוט״ש' : 'ליטר'],
    [consumption.toFixed(1), ev ? 'קוט״ש ל־100 ק״מ' : 'ק״מ לליטר'],
    [formatAmount(trip.costPerKm), '₪ לק״מ'],
    [formatAmount(unitPrice), `${ev ? '₪ לקוט״ש' : '₪ לליטר'} · ${energyName(trip)}`],
  ];

  const wrap = useAnimatedStyle(() =>
    exit.value > 0
      ? { height: fullH.value * (1 - exit.value), opacity: 1 - exit.value, overflow: 'hidden', transform: [{ translateX: -30 * exit.value }] }
      : {},
  );
  const detail = useAnimatedStyle(() => ({ height: detailH.value * p.value }));
  const reveal = useAnimatedStyle(() => ({ opacity: p.value, transform: [{ translateY: (1 - p.value) * 6 }] }));
  const chevron = useAnimatedStyle(() => ({ transform: [{ rotate: `${180 * rot.value}deg` }] }));

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
        onPress={() => onToggle(trip.id)}
        scaleTo={reduced ? 1 : 0.98}
        style={styles.row}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        accessibilityLabel={`${route ? `מ${trip.from} אל ${trip.to}, ` : ''}${when}, ${trip.distance} ק״מ, ${cost}`}
      >
        <View style={[styles.tile, route ? styles.tileRoute : styles.tileManual]}>
          {route ? <MapPin size={20} color={colors.accentText} strokeWidth={2} /> : <Pencil size={18} color={colors.textMuted} strokeWidth={2} />}
        </View>
        <View style={styles.main}>
          {/* a routed trip leads with its route; manual-distance and older trips lead with the distance */}
          <Text style={styles.title} numberOfLines={2}>
            {route || `מרחק ידני · ${km}`}
          </Text>
          <Text style={styles.meta} numberOfLines={1}>
            {route ? `${when} · ${km}` : when}
          </Text>
        </View>
        <View {...LTR.props} style={[styles.amount, LTR.style]}>
          <Text style={styles.amountShekel}>₪</Text>
          <Text style={styles.amountNum}>{formatAmount(trip.totalCost)}</Text>
        </View>
        <Animated.View style={chevron}>
          <ChevronDown size={18} color={colors.textMuted} strokeWidth={2} />
        </Animated.View>
      </PressableScale>

      <Animated.View style={[styles.clip, detail, !open && NO_TOUCH]} accessibilityElementsHidden={!open} importantForAccessibility={open ? 'auto' : 'no-hide-descendants'}>
        {/* mounted on the first open only, so closed rows stay light */}
        {everOpen.current && (
          <Animated.View style={[styles.measure, reveal]} onLayout={(e) => (detailH.value = e.nativeEvent.layout.height)}>
            <View style={styles.strip}>
              {cells.map(([value, label], i) => (
                <View key={i} style={[styles.cell, i > 0 && styles.cellDivider]}>
                  <Cell p={p} i={i}>
                    <LtrText style={styles.cellValue}>{value}</LtrText>
                    <Text style={styles.cellLabel} numberOfLines={2}>
                      {label}
                    </Text>
                  </Cell>
                </View>
              ))}
            </View>
            <View style={styles.actions}>
              {confirming ? (
                <FadeIn style={styles.confirm}>
                  <Text style={styles.confirmQ}>למחוק את הנסיעה?</Text>
                  <View style={styles.btns}>
                    <PressableScale onPress={() => setConfirming(false)} style={[styles.btn, styles.ghost]} accessibilityRole="button">
                      <Text style={styles.btnText}>ביטול</Text>
                    </PressableScale>
                    <PressableScale onPress={confirmDelete} style={[styles.btn, styles.danger]} accessibilityRole="button">
                      <Text style={[styles.btnText, { color: colors.textInverse }]}>מחק</Text>
                    </PressableScale>
                  </View>
                </FadeIn>
              ) : (
                <FadeIn style={styles.actionRow}>
                  <LtrText style={styles.vehicle} numberOfLines={1}>
                    {vehicleTitle({ name: trip.vehicleName, model: trip.vehicleModel } as Vehicle)}
                  </LtrText>
                  <PressableScale onPress={() => setConfirming(true)} scaleTo={reduced ? 1 : 0.98} style={styles.iconBtn} accessibilityRole="button" accessibilityLabel="מחק נסיעה">
                    <Trash2 size={18} color={colors.textMuted} strokeWidth={2} />
                  </PressableScale>
                </FadeIn>
              )}
            </View>
          </Animated.View>
        )}
      </Animated.View>
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  divider: { height: 1, backgroundColor: colors.lineSubtle },
  row: { minHeight: 64, flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10 },
  tile: { width: 40, height: 40, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  tileRoute: { backgroundColor: colors.accentTint },
  tileManual: { backgroundColor: colors.surfaceSunken },
  main: { flex: 1, minWidth: 0, gap: 2 },
  title: { fontFamily: Rubik.bold, fontSize: 15, color: colors.text },
  meta: { fontFamily: Rubik.regular, fontSize: 12, color: colors.textMuted, fontVariant: ['tabular-nums'] },
  amount: { flexDirection: 'row', alignItems: 'baseline', gap: 1 },
  amountShekel: { fontFamily: Rubik.bold, fontSize: 13, color: colors.accentText },
  amountNum: { fontFamily: Rubik.extra, fontSize: 19, color: colors.text, fontVariant: ['tabular-nums'] },
  clip: { overflow: 'hidden' },
  // measured at its natural height; absolute so the clip's animated height does not squeeze it
  measure: { position: 'absolute', width: '100%', paddingBottom: 12 },
  strip: { flexDirection: 'row', backgroundColor: colors.surfaceSunken, borderRadius: 16, paddingVertical: 12, paddingHorizontal: 4 },
  cell: { flex: 1, alignItems: 'center', gap: 2, paddingHorizontal: 4 },
  cellDivider: { borderStartWidth: 1, borderStartColor: colors.line },
  cellValue: { fontFamily: Rubik.extra, fontSize: 16, color: colors.text, fontVariant: ['tabular-nums'] },
  cellLabel: { fontFamily: Rubik.regular, fontSize: 11, color: colors.textMuted, textAlign: 'center' },
  actions: { minHeight: 52, justifyContent: 'center', paddingTop: 8 },
  actionRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  vehicle: { flex: 1, fontFamily: Rubik.regular, fontSize: 13, color: colors.textMuted, textAlign: 'right' },
  iconBtn: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  confirm: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  confirmQ: { fontFamily: Rubik.bold, fontSize: 14, color: colors.text },
  btns: { flexDirection: 'row', gap: 8 },
  btn: { height: 44, minWidth: 44, paddingHorizontal: 18, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  ghost: { backgroundColor: colors.surfaceSunken },
  danger: { backgroundColor: colors.surfaceInverse },
  btnText: { fontFamily: Rubik.bold, fontSize: 14, color: colors.text },
});
