// A white band sweeps the plate once when the search starts: feedback on the "חפש" press, not a loader
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { cancelAnimation, interpolate, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { ease, revealDur, useRevealReduced } from '../../constants/motion';
import { NO_TOUCH } from '../../constants/rtl';

const BEAM = 56;
const BAND = ['rgba(255,255,255,0)', 'rgba(255,255,255,0.75)', 'rgba(255,255,255,0)'] as const;

export function PlateScanBeam({ active }: { active: boolean }) {
  const reduced = useRevealReduced();
  const w = useSharedValue(0);
  const p = useSharedValue(0);

  // no cleanup on `active` turning false: an early answer still lets the sweep finish
  useEffect(() => {
    if (!active || reduced) return;
    p.value = 0;
    p.value = withTiming(1, { duration: revealDur.scan, easing: ease.inOutQuint });
  }, [active, reduced, p]);
  useEffect(() => () => cancelAnimation(p), [p]);

  const style = useAnimatedStyle(() => ({
    opacity: interpolate(p.value, [0, 0.15, 0.85, 1], [0, 1, 1, 0]),
    transform: [{ translateX: -BEAM + p.value * (w.value + BEAM) }, { skewX: '-20deg' }],
  }));

  return (
    <View style={[StyleSheet.absoluteFill, NO_TOUCH]} onLayout={(e) => (w.value = e.nativeEvent.layout.width)}>
      <Animated.View style={[styles.beam, style]}>
        <LinearGradient colors={BAND} start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }} style={StyleSheet.absoluteFill} />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  beam: { position: 'absolute', top: -10, bottom: -10, left: 0, width: BEAM, opacity: 0 },
});
