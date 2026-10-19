// Motion system: springs, durations, entrance, looping clock and haptics in one place
import * as Haptics from 'expo-haptics';
import { useEffect } from 'react';
import {
  cancelAnimation,
  useAnimatedStyle,
  withDelay,
  Easing,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
  type EasingFunction,
} from 'react-native-reanimated';

export const spring = {
  snappy: { damping: 18, stiffness: 220, mass: 1 },
  bouncy: { damping: 12, stiffness: 180, mass: 1 },
  digit: { damping: 18, stiffness: 280, mass: 0.3 }, // Motion Primitives "Sliding Number"
};

export const dur = { micro: 150, std: 300, emph: 550 };

export const ease = { out: Easing.out(Easing.cubic), inOut: Easing.inOut(Easing.cubic), sine: Easing.inOut(Easing.sin) };

/**
 * Staggered entrance: a 400ms fade + 10px rise. A shared-value style, not a Reanimated `entering` layout animation:
 * on web those leave a fixed inline height on the element, which clips content that grows later.
 */
export function useEnter(delay: number) {
  const t = useSharedValue(0);
  useEffect(() => {
    t.value = withDelay(delay, withTiming(1, { duration: 400, easing: ease.out }));
  }, [delay, t]);
  return useAnimatedStyle(() => ({ opacity: t.value, transform: [{ translateY: (1 - t.value) * 10 }] }));
}

export const haptic = {
  select: () => Haptics.selectionAsync().catch(() => {}),
  press: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {}),
  warn: () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {}),
  success: () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {}),
};

/**
 * A 0 -> 1 clock that repeats on the UI thread. Under OS reduce-motion infinite loops stop and hold at `rest`;
 * everything else keeps animating because the root layout sets ReducedMotionConfig to Never
 * (Reanimated's default would skip every animation, which was the original "nothing animates" bug).
 */
export function useLoop(duration: number, opts: { reverse?: boolean; easing?: EasingFunction; rest?: number } = {}) {
  const { reverse = false, easing = Easing.linear, rest = 1 } = opts;
  const reduced = useReducedMotion();
  const p = useSharedValue(reduced ? rest : 0);
  useEffect(() => {
    if (reduced) {
      p.value = rest;
      return;
    }
    p.value = 0;
    p.value = withRepeat(withTiming(1, { duration, easing }), -1, reverse);
    return () => cancelAnimation(p);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reduced, duration]);
  return p;
}
