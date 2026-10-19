// Six-month spend bars. Time runs right to left, so the newest month is at the left end.
import React, { useEffect, useRef } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedProps,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Path, Text as SvgText } from 'react-native-svg';
import { dur, ease, haptic } from '../../constants/motion';
import { colors, Heebo } from '../../constants/theme';
import { formatAmount } from '../../lib/format';
import { monthName } from '../../lib/calc/monthly';

const COL_W = 48; // viewBox width: wide enough for the bar (26) and "₪1,240"; a column is never narrower than 44pt
const H = 140;
const TOP = 24;
const BASE = 112;
const BAR_W = 26;
const R = 4;
const AnimatedPath = Animated.createAnimatedComponent(Path);
const AnimatedSvgText = Animated.createAnimatedComponent(SvgText);

function barPath(h: number) {
  'worklet';
  if (h < 0.5) return 'M0,0';
  const r = Math.min(R, h);
  const x = (COL_W - BAR_W) / 2;
  return `M${x},${BASE} V${BASE - h + r} q0,${-r} ${r},${-r} h${BAR_W - 2 * r} q${r},0 ${r},${r} V${BASE} Z`;
}

function Bar({ index, monthKey, total, max, on, onPress }: { index: number; monthKey: number; total: number; max: number; on: boolean; onPress: () => void }) {
  const reduced = useReducedMotion();
  const target = total ? Math.max(4, ((BASE - TOP) * total) / max) : 0;
  const first = useRef(true);
  const h = useSharedValue(reduced ? target : 0);
  const pulse = useSharedValue(1);
  const valueOpacity = useSharedValue(0);

  useEffect(() => {
    const isFirst = first.current;
    first.current = false;
    if (reduced) {
      h.value = target;
      valueOpacity.value = on && total ? 1 : 0;
      return;
    }
    // first paint: grow from the baseline 40ms apart, starting at 200ms; later changes just ease
    h.value = isFirst ? withDelay(200 + index * 40, withTiming(target, { duration: 250, easing: ease.out })) : withTiming(target, { duration: dur.std, easing: ease.out });
    valueOpacity.value = withDelay(isFirst ? 450 : 0, withTiming(on && total ? 1 : 0, { duration: dur.std }));
    if (on && !isFirst) pulse.value = withSequence(withTiming(1.06, { duration: dur.std / 2 }), withTiming(1, { duration: dur.std / 2 }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target, on, total, reduced]);

  const pathProps = useAnimatedProps(() => ({ d: barPath(h.value * pulse.value) }));
  const textProps = useAnimatedProps(() => ({ y: BASE - h.value * pulse.value - 8, opacity: valueOpacity.value }));

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${monthName(monthKey)}: ₪${formatAmount(total, 0)}`}
      accessibilityState={{ selected: on }}
      style={styles.col}
    >
      <Svg width="100%" height={H} viewBox={`0 0 ${COL_W} ${H}`} preserveAspectRatio="xMidYMax meet" style={styles.svg}>
        <AnimatedPath animatedProps={pathProps} fill={on ? colors.selectedText : colors.selectedFill} />
        <AnimatedSvgText
          animatedProps={textProps}
          x={COL_W / 2}
          textAnchor="middle"
          fontSize={12}
          fontFamily={Heebo.bold}
          fill={colors.text}
        >
          {`₪${formatAmount(total, 0)}`}
        </AnimatedSvgText>
        <SvgText
          x={COL_W / 2}
          y={H - 4}
          textAnchor="middle"
          fontSize={12}
          fontFamily={on ? Heebo.bold : Heebo.medium}
          fill={on ? colors.text : colors.textMuted}
        >
          {`${monthName(monthKey).slice(0, 3)}׳`}
        </SvgText>
      </Svg>
    </Pressable>
  );
}

interface Props {
  /** oldest first, as returned by lastMonths */
  months: { key: number; total: number }[];
  selectedKey: number;
  onSelect: (key: number) => void;
}

export function MonthChart({ months, selectedKey, onSelect }: Props) {
  const max = Math.max(...months.map((m) => m.total), 1);
  return (
    <View style={styles.row}>
      {months.map((m, i) => (
        <Bar
          key={i}
          index={i}
          monthKey={m.key}
          total={m.total}
          max={max}
          on={m.key === selectedKey}
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
  row: { flexDirection: 'row' },
  col: { flex: 1, minWidth: 44, height: H },
  svg: { overflow: 'visible' },
});
