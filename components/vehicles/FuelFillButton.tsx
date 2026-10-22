// GradientButton whose gradient rises like fuel when it becomes enabled and drains when it is disabled again.
// At rest it looks exactly like GradientButton; `disabled` comes straight from the screen's validity check.
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { interpolateColor, useAnimatedStyle, useReducedMotion, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';
import { ease, revealDur as D } from '../../constants/motion';
import { NO_TOUCH } from '../../constants/rtl';
import { colors, Heebo, radius, shadow } from '../../constants/theme';
import { PressableScale } from '../calculator/PressableScale';

const H = 56;
const WAVE_H = 6;
const PERIOD = 40;
// wide enough for any phone width plus one period of travel
const WAVE = `M0 ${WAVE_H / 2} ${Array.from({ length: 30 }, (_, i) => `Q${i * PERIOD + PERIOD / 4} 0 ${i * PERIOD + PERIOD / 2} ${WAVE_H / 2} T${(i + 1) * PERIOD} ${WAVE_H / 2}`).join(' ')} V${WAVE_H} H0 Z`;

interface Props {
  label: string;
  onPress: () => void;
  disabled: boolean;
  /** first reveal of a lookup result: the fill waits for the consumption step, then rises once with a pulse */
  first?: boolean;
}

export function FuelFillButton({ label, onPress, disabled, first = false }: Props) {
  const reduced = useReducedMotion();
  const intro = useRef(first && !reduced && !disabled);
  const full = disabled || intro.current ? 0 : 1;
  const f = useSharedValue(full); // liquid level
  const lit = useSharedValue(full); // label: mint text -> white
  const pulse = useSharedValue(0);
  const w = useSharedValue(0);

  useEffect(() => {
    const to = disabled ? 0 : 1;
    if (reduced) {
      f.value = to;
      lit.value = to;
      return;
    }
    const start = intro.current ? D.ctaDelay : 0;
    if (intro.current) pulse.value = withDelay(start + D.pulseDelay, withTiming(1, { duration: D.pulse, easing: ease.outQuint }));
    intro.current = false;
    if (to) {
      f.value = withDelay(start, withTiming(1, { duration: D.ctaFill, easing: ease.inOutQuint }));
      lit.value = withDelay(start + D.ctaLabelDelay, withTiming(1, { duration: D.ctaLabel }));
    } else {
      f.value = withTiming(0, { duration: D.ctaDrain, easing: ease.inOutQuint });
      lit.value = withTiming(0, { duration: D.ctaDrain });
    }
  }, [disabled, reduced, f, lit, pulse]);

  const liquid = useAnimatedStyle(() => ({ transform: [{ translateY: (1 - f.value) * H }] }));
  const wave = useAnimatedStyle(() => ({ opacity: f.value > 0.001 && f.value < 0.999 ? 1 : 0, transform: [{ translateX: -f.value * PERIOD * 2 }] }));
  const text = useAnimatedStyle(() => ({ color: interpolateColor(lit.value, [0, 1], [colors.guideText, colors.white]) }));
  // one ring spreading 16px around the pill while it fades
  const ring = useAnimatedStyle(() => ({
    opacity: pulse.value > 0 && pulse.value < 1 ? 0.35 * (1 - pulse.value) : 0,
    transform: [{ scaleX: w.value ? 1 + (32 * pulse.value) / w.value : 1 }, { scaleY: 1 + (32 * pulse.value) / H }],
  }));

  return (
    <View onLayout={(e) => (w.value = e.nativeEvent.layout.width)}>
      <Animated.View style={[StyleSheet.absoluteFill, NO_TOUCH, styles.ring, ring]} />
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
    </View>
  );
}

// btn and label copied from GradientButton (fuel.tsx) so the two look identical at rest
const styles = StyleSheet.create({
  btn: { height: H, borderRadius: radius.pill, flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  empty: { backgroundColor: colors.guideFill },
  ring: { borderRadius: radius.pill, backgroundColor: colors.brandGreen },
  wave: { position: 'absolute', top: -WAVE_H + 1, left: 0 },
  label: { fontFamily: Heebo.extra, fontSize: 17 },
});
