// GradientButton whose gradient rises like fuel when it becomes enabled and drains when it is disabled again.
// At rest it looks exactly like GradientButton; `disabled` comes straight from the screen's validity check.
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withTiming } from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';
import { ease, revealDur } from '../../constants/motion';
import { NO_TOUCH } from '../../constants/rtl';
import { colors, Heebo, radius, shadow } from '../../constants/theme';
import { PressableScale } from '../calculator/PressableScale';

const H = 56;
const WAVE_H = 6;
const PERIOD = 40;
// wide enough for any phone width plus one period of travel
const WAVE = `M0 ${WAVE_H / 2} ${Array.from({ length: 30 }, (_, i) => `Q${i * PERIOD + PERIOD / 4} 0 ${i * PERIOD + PERIOD / 2} ${WAVE_H / 2} T${(i + 1) * PERIOD} ${WAVE_H / 2}`).join(' ')} V${WAVE_H} H0 Z`;

export function FuelFillButton({ label, onPress, disabled }: { label: string; onPress: () => void; disabled: boolean }) {
  const reduced = useReducedMotion();
  const f = useSharedValue(disabled ? 0 : 1);
  useEffect(() => {
    const to = disabled ? 0 : 1;
    f.value = reduced ? to : withTiming(to, { duration: disabled ? revealDur.ctaDrain : revealDur.ctaFill, easing: ease.inOutQuint });
  }, [disabled, reduced, f]);

  const liquid = useAnimatedStyle(() => ({ transform: [{ translateY: (1 - f.value) * H }] }));
  const wave = useAnimatedStyle(() => ({ opacity: f.value > 0.001 ? 1 : 0, transform: [{ translateX: -f.value * PERIOD * 2 }] }));
  const text = useAnimatedStyle(() => ({ color: f.value >= 0.6 ? colors.white : colors.guideText }));

  return (
    <PressableScale
      onPress={disabled ? undefined : onPress}
      scaleTo={0.95}
      style={[styles.btn, !disabled && shadow.cta]}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      accessibilityLabel={label}
    >
      <View style={[StyleSheet.absoluteFill, styles.empty]} />
      <Animated.View style={[StyleSheet.absoluteFill, NO_TOUCH, liquid]}>
        <Animated.View style={[styles.wave, wave]}>
          <Svg width={30 * PERIOD} height={WAVE_H}>
            <Path d={WAVE} fill={colors.ctaGradient[0]} />
          </Svg>
        </Animated.View>
        <LinearGradient colors={colors.ctaGradient} start={{ x: 1, y: 0 }} end={{ x: 0, y: 1 }} style={StyleSheet.absoluteFill} />
      </Animated.View>
      <Animated.Text style={[styles.label, text]}>{label}</Animated.Text>
    </PressableScale>
  );
}

// btn and label copied from GradientButton (fuel.tsx) so the two look identical at rest
const styles = StyleSheet.create({
  btn: { height: H, borderRadius: radius.pill, flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  empty: { backgroundColor: colors.guideFill },
  wave: { position: 'absolute', top: -WAVE_H + 1, left: 0 },
  label: { fontFamily: Heebo.extra, fontSize: 17 },
});
