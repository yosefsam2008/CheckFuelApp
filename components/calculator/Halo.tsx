// CornerArcs: breathing rings in the result card corner.
// The second ring starts 1600ms later, so the two read as a ripple moving away from the center.
import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  cancelAnimation,
  interpolate,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { ease } from '../../constants/motion';
import { LTR, NO_TOUCH } from '../../constants/rtl';
import { colors } from '../../constants/theme';

function useBreath(delayMs: number) {
  const reduced = useReducedMotion();
  const t = useSharedValue(0);
  useEffect(() => {
    if (reduced) {
      t.value = 0; // static at base opacity
      return;
    }
    t.value = withDelay(delayMs, withRepeat(withTiming(1, { duration: 3200, easing: ease.sine }), -1, true));
    return () => cancelAnimation(t);
  }, [reduced, delayMs, t]);
  return t;
}

function Ring({ size, base, peak, delay, style }: { size: number; base: number; peak: number; delay: number; style?: object }) {
  const t = useBreath(delay);
  const anim = useAnimatedStyle(() => ({
    opacity: interpolate(t.value, [0, 1], [base, peak]),
    transform: [{ scale: interpolate(t.value, [0, 1], [1, 1.07]) }],
  }));
  return <Animated.View style={[styles.ring, NO_TOUCH, { width: size, height: size, borderRadius: size / 2 }, style, anim]} />;
}

/** Two concentric arcs centered outside the parent's top-left corner (parent clips with overflow hidden). */
export function CornerArcs() {
  return (
    <View style={[StyleSheet.absoluteFill, LTR.style, NO_TOUCH]} {...LTR.props}>
      <Ring size={200} base={0.12} peak={0.2} delay={1600} style={{ left: -100, top: -100 }} />
      <Ring size={140} base={0.18} peak={0.26} delay={0} style={{ left: -70, top: -70 }} />
    </View>
  );
}

const styles = StyleSheet.create({
  ring: { position: 'absolute', borderWidth: 1.5, borderColor: colors.white },
});
