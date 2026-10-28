// The hero's efficiency strip: km/L as lit segments on a 0-25 scale, labelled בזבזני -> חסכוני.
// Fills from the reading side (start) like any RTL progress. Each segment lights by index, not by an anchored overlay,
// so web (CSS rtl) and native (forceRTL) agree. Changes sweep over 600ms on the UI thread; Reduce Motion jumps.
import React, { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { cancelAnimation, Easing, interpolateColor, type SharedValue, useAnimatedStyle, useReducedMotion, useSharedValue, withTiming } from 'react-native-reanimated';
import { colors } from '../../constants/colors';
import { Rubik } from '../../constants/themeV2';

export const GAUGE_MAX = 25; // km/L; hybrids top out around here
export const gaugeRatio = (kpl: number) => Math.min(Math.max(kpl / GAUGE_MAX, 0), 1);

const SEGMENTS = 25;
const segs = Array.from({ length: SEGMENTS }, (_, i) => i);
const SWEEP = { duration: 600, easing: Easing.out(Easing.cubic) };

function Seg({ i, p }: { i: number; p: SharedValue<number> }) {
  // lit once the sweep passes this segment's middle; the 0.5-segment ramp keeps the edge soft while moving
  const style = useAnimatedStyle(() => {
    const t = Math.min(Math.max(p.value * SEGMENTS - i, 0), 1);
    return { backgroundColor: interpolateColor(t, [0, 1], [colors.inkBorder, colors.accent]) };
  });
  return <Animated.View style={[styles.seg, style]} />;
}

export function EfficiencyGauge({ value }: { value: number }) {
  const reduced = useReducedMotion();
  const p = useSharedValue(0);

  useEffect(() => {
    p.value = reduced ? gaugeRatio(value) : withTiming(gaugeRatio(value), SWEEP);
  }, [value, reduced, p]);
  useEffect(() => () => cancelAnimation(p), [p]);

  // the km/L number above is the spoken value; the strip only restates it
  return (
    <View importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
      <View style={styles.row}>
        {segs.map((i) => (
          <Seg key={i} i={i} p={p} />
        ))}
      </View>
      <View style={styles.scale}>
        <Text style={styles.tick}>בזבזני</Text>
        <Text style={styles.tick}>חסכוני</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 3 },
  seg: { flex: 1, height: 10, borderRadius: 2 },
  scale: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 },
  tick: { fontFamily: Rubik.regular, fontSize: 11, color: colors.textMutedInverse },
});
