// Motion system: springs, durations, entrance, looping clock and haptics in one place
import * as Haptics from 'expo-haptics';
import { useEffect, useRef } from 'react';
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
  // critical damping is 2*sqrt(260*0.6) = 24.98, so 25 never overshoots; clamping guards a moving start
  calm: { damping: 25, stiffness: 260, mass: 0.6, overshootClamping: true },
};

export const dur = { micro: 150, std: 300, emph: 550 };

export const ease = {
  out: Easing.out(Easing.cubic),
  inOut: Easing.inOut(Easing.cubic),
  sine: Easing.inOut(Easing.sin),
  outQuint: Easing.bezier(0.16, 1, 0.3, 1),
  inOutQuint: Easing.bezier(0.65, 0, 0.35, 1),
};

/** Add-vehicle reveal (signature moment 2). Every value is at most 700ms; under reduced motion everything shows at once. */
export const revealDur = {
  digitDrop: 300,
  digitExit: 120,
  digitStep: 105, // paste stagger
  platePress: 150,
  scan: 600,
  skeletonAfter: 300, // show the skeleton only if the lookup is still pending by then
  card: 600,
  carIn: 500,
  chipStagger: 70,
  gauge: 700,
  odoBase: 500,
  odoStagger: 100,
  handoff: 120,
  ctaFill: 700,
  ctaDrain: 300,
  follow: 150, // gauge debounce while typing
  shake: 240,
};

/**
 * Staggered entrance: a 400ms fade + 10px rise. A shared-value style, not a Reanimated `entering` layout animation:
 * on web those leave a fixed inline height on the element, which clips content that grows later.
 */
export function useEnter(delay: number, play = true) {
  const reduced = useReducedMotion();
  const on = useRef(play).current; // read at mount: a later `false` must not cut a running entrance
  const t = useSharedValue(reduced || !on ? 1 : 0);
  useEffect(() => {
    t.value = reduced || !on ? 1 : withDelay(delay, withTiming(1, { duration: 400, easing: ease.out }));
  }, [delay, reduced, on, t]);
  return useAnimatedStyle(() => ({ opacity: t.value, transform: [{ translateY: (1 - t.value) * 10 }] }));
}

export const haptic = {
  select: () => Haptics.selectionAsync().catch(() => {}),
  press: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {}),
  warn: () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {}),
  success: () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {}),
  error: () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {}),
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
