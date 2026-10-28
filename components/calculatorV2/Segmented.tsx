// Segmented control with a sliding thumb (spring damping 20 / stiffness 260, selection haptic).
// Same RTL approach as SlidingSegment: the thumb sits in an LTR layer and moves to each option's measured x.
import React, { useEffect, useState } from 'react';
import { LayoutChangeEvent, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withSpring } from 'react-native-reanimated';
import { haptic, spring } from '../../constants/motion';
import { LTR, NO_TOUCH } from '../../constants/rtl';
import { colors } from '../../constants/colors';
import { Rubik } from '../../constants/themeV2';

export interface Option<T extends string> {
  value: T;
  label: string;
  sub?: string; // second line, e.g. "+12%"
  subColor?: string;
  icon?: (color: string) => React.ReactNode;
}

type Variant = 'dark' | 'light' | 'ink';
const THEME: Record<Variant, { track: string; thumb: string; on: string; off: string }> = {
  dark: { track: colors.surfaceInverseRaised, thumb: colors.surfaceRaised, on: colors.text, off: colors.textMutedInverse }, // on the dark route card
  light: { track: colors.surfaceSunken, thumb: colors.surfaceRaised, on: colors.text, off: colors.textMuted },
  ink: { track: colors.surfaceSunken, thumb: colors.surfaceInverse, on: colors.textInverse, off: colors.textMuted }, // compact trip-type toggle
};

interface Props<T extends string> {
  options: Option<T>[];
  value: T;
  onChange: (v: T) => void;
  variant?: Variant;
  height?: number;
  compact?: boolean; // options size to their label instead of sharing the width
  accessibilityLabel: string;
}

export function Segmented<T extends string>({ options, value, onChange, variant = 'light', height = 44, compact, accessibilityLabel }: Props<T>) {
  const t = THEME[variant];
  const reduced = useReducedMotion();
  const [boxes, setBoxes] = useState<Record<number, { x: number; width: number }>>({});
  const x = useSharedValue(0);
  const w = useSharedValue(0);
  const index = options.findIndex((o) => o.value === value);

  useEffect(() => {
    const box = boxes[index];
    if (!box) return;
    const instant = reduced || w.value === 0; // first placement does not slide in from nowhere
    x.value = instant ? box.x : withSpring(box.x, spring.thumb);
    w.value = instant ? box.width : withSpring(box.width, spring.thumb);
  }, [index, boxes, reduced, x, w]);

  const thumb = useAnimatedStyle(() => ({ width: w.value, opacity: w.value ? 1 : 0, transform: [{ translateX: x.value }] }));
  const onItemLayout = (i: number) => (e: LayoutChangeEvent) => {
    const { x: bx, width } = e.nativeEvent.layout;
    setBoxes((b) => (b[i]?.x === bx && b[i]?.width === width ? b : { ...b, [i]: { x: bx, width } }));
  };

  return (
    <View style={[styles.track, { backgroundColor: t.track, borderRadius: variant === 'dark' ? 13 : 14, padding: variant === 'dark' ? 3 : 4 }]} accessibilityRole="radiogroup" accessibilityLabel={accessibilityLabel}>
      <View {...LTR.props} style={[StyleSheet.absoluteFill, LTR.style, NO_TOUCH]}>
        <Animated.View style={[styles.thumb, { backgroundColor: t.thumb, top: variant === 'dark' ? 3 : 4, bottom: variant === 'dark' ? 3 : 4 }, variant === 'light' && styles.thumbLight, thumb]} />
      </View>
      {options.map((o, i) => {
        const on = o.value === value;
        const color = on ? t.on : t.off;
        return (
          <Pressable
            key={o.value}
            style={[styles.item, { minHeight: height }, compact ? styles.compact : styles.fill]}
            onLayout={onItemLayout(i)}
            onPress={() => {
              if (on) return;
              haptic.select();
              onChange(o.value);
            }}
            accessibilityRole="radio"
            accessibilityState={{ checked: on }}
          >
            <View style={styles.row}>
              {o.icon?.(color)}
              <Text style={[styles.label, { color }]} numberOfLines={1}>
                {o.label}
              </Text>
            </View>
            {!!o.sub && <Text style={[styles.sub, { color: on ? (o.subColor ?? colors.textMuted) : colors.faint }]}>{o.sub}</Text>}
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  track: { flexDirection: 'row', gap: 2 },
  thumb: { position: 'absolute', left: 0, borderRadius: 10 },
  thumbLight: { borderWidth: 1, borderColor: colors.line },
  item: { alignItems: 'center', justifyContent: 'center', gap: 2 },
  fill: { flex: 1 },
  compact: { paddingHorizontal: 14 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  label: { fontFamily: Rubik.semi, fontSize: 14, lineHeight: 18, includeFontPadding: false },
  // ltr so a signed delta like "-8%" keeps its sign on the left
  sub: { fontFamily: Rubik.semi, fontSize: 11, lineHeight: 15, includeFontPadding: false, writingDirection: 'ltr', textAlign: 'center' },
});
