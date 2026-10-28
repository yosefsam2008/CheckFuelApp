// Fuel price row: label above, ₪ price + unit, status chip on the opposite side.
import React from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import Animated, { interpolate, useAnimatedStyle } from 'react-native-reanimated';
import { useLoop } from '../../constants/motion';
import { LTR, NO_OUTLINE } from '../../constants/rtl';
import { colors, Heebo, radius } from '../../constants/theme';

export type PriceStatus = 'loading' | 'live' | 'estimate' | 'fallback';

interface Props {
  price: string;
  onPriceChange: (text: string) => void;
  unit: string; // "לליטר" / "לקוט״ש"
  label: string; // "בנזין 95 · מחיר מפוקח"
  status: PriceStatus;
}

export function PulseDot({ color }: { color?: string }) {
  const p = useLoop(1800, { rest: 0 });
  const ring = useAnimatedStyle(() => ({
    opacity: interpolate(p.value, [0, 1], [0.6, 0]),
    transform: [{ scale: interpolate(p.value, [0, 1], [1, 2.2]) }],
  }));
  return (
    <View style={styles.dotWrap}>
      <Animated.View style={[styles.dot, styles.dotRing, color && { backgroundColor: color }, ring]} />
      <View style={[styles.dot, color && { backgroundColor: color }]} />
    </View>
  );
}

// shortcut: interim chip until PriceAsOfChip (next commit) replaces it
const STATUS_TEXT: Record<PriceStatus, string> = {
  loading: 'בודק מחיר…',
  live: 'מחיר עדכני',
  estimate: 'מחיר משוער',
  fallback: 'מחיר משוער',
};

function Chip({ status }: { status: PriceStatus }) {
  const live = status === 'live';
  const warn = status === 'fallback' || status === 'estimate';
  return (
    <View style={[styles.chip, live && styles.chipLive, warn && styles.chipWarn]}>
      {live && <PulseDot />}
      <Text style={[styles.chipText, live && { color: colors.guideText }, warn && { color: colors.warnText }]} numberOfLines={1}>
        {STATUS_TEXT[status]}
      </Text>
    </View>
  );
}

export function FuelPriceDisplay({ price, onPriceChange, unit, label, status }: Props) {
  return (
    <View>
      <Text style={styles.label} numberOfLines={1}>{label}</Text>
      <View style={styles.row}>
        <View style={styles.priceRow}>
          {/* the digits lead: ₪ is 70% size, weight 600 */}
          <View {...LTR.props} style={styles.amount}>
            <Text style={styles.currency} maxFontSizeMultiplier={1.2}>₪</Text>
            <TextInput value={price} onChangeText={onPriceChange} keyboardType="decimal-pad" returnKeyType="done" style={styles.price} maxFontSizeMultiplier={1.2} accessibilityLabel={`מחיר ${unit}`} />
          </View>
          <Text style={styles.unit}>{unit}</Text>
        </View>
        <Chip status={status} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  label: { fontFamily: Heebo.medium, fontSize: 13, color: colors.textMuted, marginBottom: 2 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  priceRow: { flexDirection: 'row', alignItems: 'baseline', gap: 6 },
  amount: { flexDirection: 'row', alignItems: 'baseline', ...LTR.style },
  currency: { fontFamily: Heebo.semi, fontSize: 32 * 0.7, color: colors.text, marginEnd: 2 },
  price: { fontFamily: Heebo.extra, fontSize: 32, color: colors.text, padding: 0, width: 84, fontVariant: ['tabular-nums'], ...NO_OUTLINE },
  unit: { fontFamily: Heebo.regular, fontSize: 14, color: colors.textMuted },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, flexShrink: 1, height: 28, paddingHorizontal: 10, borderRadius: radius.pill, backgroundColor: colors.bg },
  chipLive: { backgroundColor: colors.guideFill },
  chipWarn: { backgroundColor: colors.warnBg },
  chipText: { fontFamily: Heebo.medium, fontSize: 12, color: colors.textMuted, flexShrink: 1 },
  dotWrap: { width: 8, height: 8 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.brandGreen },
  dotRing: { position: 'absolute' },
});
