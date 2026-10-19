// Breathing rings: InfoHalo (around the info button) and CornerArcs (result card corner).
// The second ring starts 1600ms later, so the two read as a ripple moving away from the center.
import { Info } from 'lucide-react-native';
import React, { useEffect } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  cancelAnimation,
  interpolate,
  SharedValue,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { ease, haptic, spring } from '../../constants/motion';
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

function Ring({ size, base, peak, delay, pulse, style }: { size: number; base: number; peak: number; delay: number; pulse?: SharedValue<number>; style?: object }) {
  const t = useBreath(delay);
  const anim = useAnimatedStyle(() => ({
    opacity: interpolate(t.value, [0, 1], [base, peak]),
    transform: [{ scale: interpolate(t.value, [0, 1], [1, 1.07]) * (pulse ? pulse.value : 1) }],
  }));
  return <Animated.View style={[styles.ring, NO_TOUCH, { width: size, height: size, borderRadius: size / 2 }, style, anim]} />;
}

/** 88px wrapper; the button's center is the rings' center. Place it with an LTR (physical-left) parent. */
export function InfoHalo({ onPress }: { onPress: () => void }) {
  const pulse = useSharedValue(1);
  return (
    <View style={styles.halo}>
      <Ring size={88} base={0.18} peak={0.26} delay={1600} pulse={pulse} />
      <Ring size={66} base={0.3} peak={0.4} delay={0} pulse={pulse} />
      <Pressable
        onPress={() => {
          haptic.press();
          pulse.value = withSequence(withTiming(1.15, { duration: 150 }), withSpring(1, spring.bouncy));
          onPress();
        }}
        style={styles.button}
        accessibilityRole="button"
        accessibilityLabel="מידע ומסמכים משפטיים"
      >
        <Info size={22} color={colors.white} strokeWidth={2} />
      </Pressable>
    </View>
  );
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
  halo: { width: 88, height: 88, alignItems: 'center', justifyContent: 'center', overflow: 'visible' },
  ring: { position: 'absolute', borderWidth: 1.5, borderColor: colors.white },
  button: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.white18, alignItems: 'center', justifyContent: 'center' },
});
