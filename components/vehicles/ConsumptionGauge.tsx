// Small km/l dial bound to the field's current text. Decorative: the number in the field is the real value.
import React, { useEffect, useRef } from 'react';
import { View } from 'react-native';
import Animated, { useAnimatedProps, useReducedMotion, useSharedValue, withDelay, withSequence, withSpring, withTiming } from 'react-native-reanimated';
import Svg, { Circle, Line, Path } from 'react-native-svg';
import { ease, revealDur, spring } from '../../constants/motion';
import { colors } from '../../constants/theme';
import { gaugeFraction } from '../../lib/vehicles/reveal';

const AnimatedPath = Animated.createAnimatedComponent(Path);
const AnimatedLine = Animated.createAnimatedComponent(Line);
const W = 64;
const H = 38;
const CX = W / 2;
const CY = 34;
const R = 26;
const NEEDLE = 21; // starts at the hub, ends short of the arc so it reads against the track
const ARC = Math.PI * R;
const OVERSHOOT = 8 / 180; // 8 degrees, as a fraction of the half circle

export function ConsumptionGauge({ value, play, delay }: { value: number | null; play: boolean; delay: number }) {
  const reduced = useReducedMotion();
  const target = gaugeFraction(value);
  const intro = useRef(play && !reduced);
  const arcP = useSharedValue(intro.current ? 0 : target);
  const needleP = useSharedValue(intro.current ? 0 : target);

  useEffect(() => {
    if (intro.current) {
      intro.current = false;
      arcP.value = withDelay(delay, withTiming(target, { duration: revealDur.gauge, easing: ease.outQuint }));
      // ease out past the value by 8 degrees (68% of the time), then settle back onto it
      const n = revealDur.needle;
      needleP.value = withDelay(
        delay,
        target > 0
          ? withSequence(withTiming(target + OVERSHOOT, { duration: n * 0.68, easing: ease.outQuint }), withTiming(target, { duration: n * 0.32, easing: ease.inOutQuint }))
          : withTiming(0, { duration: 0 }),
      );
      return;
    }
    if (reduced) {
      arcP.value = target;
      needleP.value = target;
      return;
    }
    // typing: follow once the user pauses, so every keystroke does not yank the needle
    const t = setTimeout(() => {
      arcP.value = withSpring(target, spring.calm);
      needleP.value = withSpring(target, spring.calm);
    }, revealDur.follow);
    return () => clearTimeout(t);
  }, [target, reduced, delay, arcP, needleP]);

  const arcProps = useAnimatedProps(() => ({ strokeDashoffset: ARC * (1 - arcP.value) }));
  const needleProps = useAnimatedProps(() => {
    const a = Math.PI * (1 - needleP.value); // 0 sits on the left, like a speedometer
    return { x2: CX + NEEDLE * Math.cos(a), y2: CY - NEEDLE * Math.sin(a) };
  });

  const arc = `M ${CX - R} ${CY} A ${R} ${R} 0 0 1 ${CX + R} ${CY}`;
  return (
    <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Svg width={W} height={H}>
        <Path d={arc} stroke={colors.divider} strokeWidth={5} strokeLinecap="round" fill="none" />
        <AnimatedPath d={arc} stroke={colors.brandGreen} strokeWidth={5} strokeLinecap="butt" fill="none" strokeDasharray={ARC} animatedProps={arcProps} />
        <AnimatedLine x1={CX} y1={CY} stroke={colors.text} strokeWidth={2} strokeLinecap="round" animatedProps={needleProps} />
        <Circle cx={CX} cy={CY} r={3} fill={colors.text} />
      </Svg>
    </View>
  );
}
