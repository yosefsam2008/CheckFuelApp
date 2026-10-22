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
  pop: Easing.bezier(0.34, 1.56, 0.64, 1), // overshoots ~10%: add-vehicle reveal only
};

/**
 * The add-vehicle reveal plays even when the OS asks for reduced motion (owner's decision, 2026-10-22; HANDOFF).
 * shortcut: ignores the accessibility setting on this one screen; to respect it again, return useReducedMotion().
 */
export const useRevealReduced = () => false;

/**
 * Add-vehicle reveal (signature moment 2), timings from the approved reference demo. This screen is exempt from the
 * no-overshoot and <=700ms rules (HANDOFF). Delays inside the found sequence count from the reveal start.
 * Under reduced motion everything shows at once.
 */
export const revealDur = {
  digitDrop: 340,
  digitExit: 120,
  digitStep: 105, // paste stagger
  platePress: 150,
  focusRing: 260,
  scan: 760,
  ringOutDelay: 500, // focus ring fades out during the scan
  ringOut: 500,
  skeletonAfter: 300, // show the skeleton only if the lookup is still pending by then
  skeletonIn: 360,
  skeletonOut: 240,
  card: 380,
  carDelay: 40,
  car: 660,
  settleDelay: 560,
  settle: 260,
  dustDelay: 560,
  dustStep: 50,
  dust: 520,
  titleDelay: 160,
  title: 520,
  chipDelay: 320,
  chipStagger: 70,
  chip: 320,
  badgeDelay: 540,
  badge: 420,
  checkDelay: 680,
  check: 300,
  consumptionDelay: 760,
  gauge: 1000,
  needle: 1100,
  odoBase: 900,
  odoStagger: 180,
  handoff: 120,
  follow: 150, // gauge debounce while typing
  ctaDelay: 1760, // consumption step + 1000
  ctaFill: 720,
  ctaDrain: 300,
  ctaLabelDelay: 440,
  ctaLabel: 280,
  pulseDelay: 720,
  pulse: 700,
  shake: 240,
};

/**
 * Staggered entrance: a 400ms fade + 10px rise. A shared-value style, not a Reanimated `entering` layout animation:
 * on web those leave a fixed inline height on the element, which clips content that grows later.
 */
export function useEnter(delay: number, play = true, respectReduced = true) {
  const os = useReducedMotion();
  const reduced = respectReduced && os;
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
