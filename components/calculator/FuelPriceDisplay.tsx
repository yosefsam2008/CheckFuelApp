// Fuel price block. Kept self-contained: it gets its own design pass later.
import React from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import Animated, { interpolate, useAnimatedStyle } from 'react-native-reanimated';
import { useLoop } from '../../constants/motion';
import { LTR, NO_OUTLINE } from '../../constants/rtl';
import { colors, Heebo } from '../../constants/theme';

export type PriceStatus = 'loading' | 'live' | 'estimate' | 'fallback';

interface Props {
  price: string;
  onPriceChange: (text: string) => void;
  unit: string; // "לליטר" / "לקוט״ש"
  status: PriceStatus;
}

function PulseDot() {
  const p = useLoop(1800, { rest: 0 });
  const ring = useAnimatedStyle(() => ({
    opacity: interpolate(p.value, [0, 1], [0.6, 0]),
    transform: [{ scale: interpolate(p.value, [0, 1], [1, 2.2]) }],
  }));
  return (
    <View style={styles.dotWrap}>
      <Animated.View style={[styles.dot, styles.dotRing, ring]} />
      <View style={styles.dot} />
    </View>
  );
}

const STATUS_TEXT: Record<PriceStatus, string> = {
  loading: 'טוען מחיר רשמי…',
  live: 'מחיר רשמי · עדכני',
  estimate: 'מחיר משוער',
  fallback: 'מחיר משוער',
};

export function FuelPriceDisplay({ price, onPriceChange, unit, status }: Props) {
  return (
    <View style={styles.row}>
      <View style={styles.priceRow}>
        {/* the digits lead: ₪ is 70% size, weight 600 */}
        <View {...LTR.props} style={styles.amount}>
          <Text style={styles.currency} maxFontSizeMultiplier={1.2}>₪</Text>
          <TextInput value={price} onChangeText={onPriceChange} keyboardType="decimal-pad" returnKeyType="done" style={styles.price} maxFontSizeMultiplier={1.2} accessibilityLabel={`מחיר ${unit}`} />
        </View>
        <Text style={styles.unit}>{unit}</Text>
      </View>
      <View style={styles.status}>
        {status === 'live' && <PulseDot />}
        <Text style={styles.statusText} numberOfLines={1}>
          {STATUS_TEXT[status]}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  priceRow: { flexDirection: 'row', alignItems: 'baseline', gap: 6 },
  amount: { flexDirection: 'row', alignItems: 'baseline', ...LTR.style },
  currency: { fontFamily: Heebo.semi, fontSize: 32 * 0.7, color: colors.text, marginEnd: 2 },
  price: { fontFamily: Heebo.extra, fontSize: 32, color: colors.text, padding: 0, width: 84, fontVariant: ['tabular-nums'], ...NO_OUTLINE },
  unit: { fontFamily: Heebo.regular, fontSize: 14, color: colors.textMuted },
  status: { flexDirection: 'row', alignItems: 'center', gap: 8, flexShrink: 1 },
  statusText: { fontFamily: Heebo.regular, fontSize: 12, color: colors.textMuted, flexShrink: 1 },
  dotWrap: { width: 8, height: 8 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.brandGreen },
  dotRing: { position: 'absolute' },
});
