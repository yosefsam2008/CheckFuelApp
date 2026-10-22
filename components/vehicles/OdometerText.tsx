// Rolls each digit of a number into place, odometer style. Draws the value it was mounted with; never edits anything.
import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { type AnimatedStyle, cancelAnimation, useAnimatedStyle, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';
import { ease, revealDur } from '../../constants/motion';
import { colors, Heebo } from '../../constants/theme';

const LH = 24;
const STRIP = Array.from({ length: 20 }, (_, i) => i % 10); // 0-9 twice, so every digit rolls a full turn

/** Longest roll for a value, so the caller knows when to hand off to the real input */
export const odometerDuration = (value: string) => {
  const n = value.replace(/\D/g, '').length;
  return n ? revealDur.odoBase + (n - 1) * revealDur.odoStagger : 0;
};

export function OdometerText({ value, delay, style }: { value: string; delay: number; style?: StyleProp<AnimatedStyle<StyleProp<ViewStyle>>> }) {
  const [text] = useState(value);
  let i = 0;
  return (
    <Animated.View style={[styles.row, style]}>
      {[...text].map((ch, k) =>
        /\d/.test(ch) ? (
          <Digit key={k} d={Number(ch)} delay={delay} duration={revealDur.odoBase + i++ * revealDur.odoStagger} />
        ) : (
          <Text key={k} style={styles.text}>{ch}</Text>
        ),
      )}
    </Animated.View>
  );
}

function Digit({ d, delay, duration }: { d: number; delay: number; duration: number }) {
  const y = useSharedValue(0);
  useEffect(() => {
    y.value = withDelay(delay, withTiming(10 + d, { duration, easing: ease.outQuint }));
    return () => cancelAnimation(y);
  }, [d, delay, duration, y]);
  const roll = useAnimatedStyle(() => ({ transform: [{ translateY: -y.value * LH }] }));
  return (
    <View style={styles.cell}>
      {/* the hidden final digit sizes the cell, so the overlay matches the input text width */}
      <Text style={[styles.text, styles.ghost]}>{d}</Text>
      <Animated.View style={[styles.strip, roll]}>
        {STRIP.map((n, k) => (
          <Text key={k} style={styles.text}>{n}</Text>
        ))}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  cell: { height: LH, overflow: 'hidden' },
  ghost: { opacity: 0 },
  strip: { position: 'absolute', top: 0, left: 0, right: 0, alignItems: 'center' },
  text: { height: LH, lineHeight: LH, fontFamily: Heebo.bold, fontSize: 17, color: colors.text, includeFontPadding: false },
});
