// Six-month spend bars on the dark hero. The oldest month is the first column, so in RTL it sits at the right end.
// Motion: on first show the bars grow from the baseline one after another; later a height change (delete, undo)
// eases to the new height, a new selection fades the bar color and lifts its value label in.
import React, { useEffect, useRef } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { Easing, interpolateColor, useAnimatedStyle, useReducedMotion, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';
import { EASE, haptic } from '../../constants/motion';
import { colors } from '../../constants/colors';
import { Rubik } from '../../constants/themeV2';
import { monthName } from '../../lib/calc/monthly';
import { formatMoney } from '../../lib/format';

const MAX_H = 84;
export const BARS_START = 280; // first bar starts growing (ms after mount)
const BARS_STEP = 45;
const GROW = 560;

function Column({ index, total, max, on, onPress, label }: { index: number; total: number; max: number; on: boolean; onPress: () => void; label: string }) {
  const reduced = useReducedMotion();
  const target = total ? Math.max(6, (MAX_H * total) / max) : 3;
  const first = useRef(true);
  const firstSel = useRef(true);
  const h = useSharedValue(reduced ? target : 0);
  const sel = useSharedValue(on ? 1 : 0);
  const tag = useSharedValue(reduced && on ? 1 : 0);

  useEffect(() => {
    const isFirst = first.current;
    first.current = false;
    if (reduced) {
      h.value = target;
      return;
    }
    h.value = isFirst
      ? withDelay(BARS_START + index * BARS_STEP, withTiming(target, { duration: GROW, easing: EASE.hero }))
      : withTiming(target, { duration: 400, easing: EASE.out });
  }, [target, reduced, index, h]);

  useEffect(() => {
    const landed = BARS_START + 5 * BARS_STEP + GROW - 120; // the label waits for the last bar on first show
    const isFirst = firstSel.current;
    firstSel.current = false;
    sel.value = reduced ? (on ? 1 : 0) : withTiming(on ? 1 : 0, { duration: 240, easing: Easing.ease });
    tag.value = reduced ? (on ? 1 : 0) : on ? withDelay(isFirst ? landed : 60, withTiming(1, { duration: 260, easing: EASE.out })) : withTiming(0, { duration: 120 });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only the selection drives this
  }, [on, reduced]);

  const bar = useAnimatedStyle(() => ({
    height: h.value,
    backgroundColor: interpolateColor(sel.value, [0, 1], [colors.chartBarInactive, colors.chartBarActive]),
  }));
  const valueStyle = useAnimatedStyle(() => ({ opacity: tag.value, transform: [{ translateY: (1 - tag.value) * 6 }] }));
  const monthStyle = useAnimatedStyle(() => ({ color: interpolateColor(sel.value, [0, 1], [colors.textMutedInverse, colors.textInverse]) }));

  return (
    <Pressable onPress={onPress} style={styles.col} accessibilityRole="radio" accessibilityState={{ selected: on }} accessibilityLabel={`${label}: ${formatMoney(total, { decimals: 0 })}`}>
      <Animated.Text style={[styles.value, valueStyle]} numberOfLines={1} maxFontSizeMultiplier={1.2}>
        {formatMoney(total, { decimals: 0 })}
      </Animated.Text>
      <Animated.View style={[styles.bar, bar]} />
      <Animated.Text style={[styles.month, on && styles.monthOn, monthStyle]} numberOfLines={1} maxFontSizeMultiplier={1.2}>
        {`${label.slice(0, 3)}׳`}
      </Animated.Text>
    </Pressable>
  );
}

interface Props {
  /** oldest first, as returned by lastMonths */
  months: { key: number; total: number }[];
  selectedKey: number;
  onSelect: (key: number) => void;
}

export function MonthBars({ months, selectedKey, onSelect }: Props) {
  const max = Math.max(...months.map((m) => m.total), 1);
  return (
    <View style={styles.row} accessibilityRole="radiogroup">
      {months.map((m, i) => (
        <Column
          key={m.key}
          index={i}
          total={m.total}
          max={max}
          on={m.key === selectedKey}
          label={monthName(m.key)}
          onPress={() => {
            haptic.select();
            onSelect(m.key);
          }}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', height: 132 },
  col: { flex: 1, minWidth: 44, alignItems: 'center', justifyContent: 'flex-end', gap: 6 },
  value: { fontFamily: Rubik.bold, fontSize: 11, color: colors.textInverse, fontVariant: ['tabular-nums'] },
  bar: { width: '100%', maxWidth: 34, borderRadius: 8 },
  month: { fontFamily: Rubik.medium, fontSize: 12 },
  monthOn: { fontFamily: Rubik.bold },
});
