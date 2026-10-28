// Per-digit rolling number (port of Motion Primitives "Sliding Number"). Digits spring up/down a 0-9 column.
import React, { useEffect, useState } from 'react';
import { StyleProp, Text, TextStyle, View } from 'react-native';
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withDelay, withSpring, withTiming } from 'react-native-reanimated';
import { ease, spring } from '../../constants/motion';
import { LTR } from '../../constants/rtl';
import { Heebo } from '../../constants/theme';

const DIGITS = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];

function Digit({ digit, height, width, delay, duration, textStyle }: { digit: number; height: number; width: number; delay: number; duration?: number; textStyle: StyleProp<TextStyle> }) {
  const reduced = useReducedMotion();
  const y = useSharedValue(-digit * height);
  useEffect(() => {
    const to = -digit * height;
    y.value = reduced ? to : withDelay(delay, duration ? withTiming(to, { duration, easing: ease.outQuint }) : withSpring(to, spring.digit));
  }, [digit, height, delay, duration, reduced, y]);
  const column = useAnimatedStyle(() => ({ transform: [{ translateY: y.value }] }));

  return (
    <View style={{ height, width, overflow: 'hidden' }}>
      <Animated.View style={column}>
        {DIGITS.map((d) => (
          <Text key={d} style={[textStyle, { height, lineHeight: height, width }]}>
            {d}
          </Text>
        ))}
      </Animated.View>
    </View>
  );
}

interface Props {
  value: string;
  fontSize: number;
  color: string;
  fontFamily?: string;
  /** ms between neighbouring digits, right to left */
  staggerMs?: number;
  /** render this first (same shape as value), then roll to value after startDelay */
  from?: string;
  startDelay?: number;
  /** timed roll (ms, ease.outQuint) instead of the spring */
  duration?: number;
  /** currency sign etc: drawn at 70% size, weight 600, so the digits lead */
  prefix?: string;
  accessibilityLabel?: string;
}

export function SlidingDigits({ value, fontSize, color, fontFamily, staggerMs = 0, from, startDelay = 0, duration, prefix, accessibilityLabel }: Props) {
  const reduced = useReducedMotion();
  const [shown, setShown] = useState(reduced ? value : from ?? value);
  useEffect(() => {
    if (from === undefined || reduced) return setShown(value);
    const t = setTimeout(() => setShown(value), startDelay);
    return () => clearTimeout(t);
  }, [value, from, startDelay, reduced]);

  const height = Math.round(fontSize * 1.25);
  const width = Math.round(fontSize * 0.58);
  const textStyle: TextStyle = { fontSize, color, fontFamily, textAlign: 'center', writingDirection: 'ltr', fontVariant: ['tabular-nums'], includeFontPadding: false };
  const chars = shown.split('');

  return (
    // numbers always read left-to-right, even inside the RTL layout
    <View {...LTR.props} style={[{ flexDirection: 'row', alignItems: 'center' }, LTR.style]} accessible accessibilityLabel={accessibilityLabel ?? value}>
      {/* negative margin eats the empty side of the first digit's fixed-width column, so ₪ sits next to the ink */}
      {!!prefix && <Text style={[textStyle, { fontSize: fontSize * 0.7, fontFamily: Heebo.bold, height, lineHeight: height, marginEnd: -fontSize * 0.04 }]}>{prefix}</Text>}
      {chars.map((c, i) => {
        const fromRight = chars.length - 1 - i;
        return /\d/.test(c) ? (
          <Digit key={fromRight} digit={+c} height={height} width={width} delay={fromRight * staggerMs} duration={duration} textStyle={textStyle} />
        ) : (
          <Text key={`s${fromRight}`} style={[textStyle, { height, lineHeight: height }]}>
            {c}
          </Text>
        );
      })}
    </View>
  );
}
