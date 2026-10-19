// Diagonal light band that sweeps right-to-left. Sweeps for `sweepMs` of each `period`, then rests.
import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { Easing, interpolate, useAnimatedStyle } from 'react-native-reanimated';
import { useLoop } from '../../constants/motion';
import { LTR, NO_TOUCH } from '../../constants/rtl';

interface Props {
  width: number; // width of the container being swept
  period: number;
  sweepMs: number;
  band?: number;
  skew?: number; // degrees
}

const inOut = Easing.inOut(Easing.cubic);

export function Shimmer({ width, period, sweepMs, band = 70, skew = -18 }: Props) {
  const p = useLoop(period, { rest: 0 });
  const style = useAnimatedStyle(() => {
    const phase = inOut(Math.min((p.value * period) / sweepMs, 1));
    return { transform: [{ translateX: interpolate(phase, [0, 1], [width, -band]) }, { skewX: `${skew}deg` }] };
  });
  return (
    <View {...LTR.props} style={[StyleSheet.absoluteFill, LTR.style, NO_TOUCH]}>
      <Animated.View style={[styles.band, { width: band }, style]}>
        <LinearGradient
          colors={['rgba(255,255,255,0)', 'rgba(255,255,255,0.35)', 'rgba(255,255,255,0)']}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({ band: { position: 'absolute', top: 0, bottom: 0, left: 0 } });
