// Result screen entrance, in one place. It plays once per mount (each time the Result opens); a refocus doesn't replay it.
// t=0 dark card, t=120 total roll, t=300 stats count-up, t=450 the other cards 60ms apart; per-person waits for the total to land.
// Reduce Motion: everything fades in together over 150ms.
import { useEffect } from 'react';
import { useAnimatedStyle, useReducedMotion, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';
import { DUR, EASE, STAGGER } from '../../constants/motion';

export const ENTRANCE = { total: 120, stats: 300, statsDur: 700, rest: 450, shareDur: 500 };

function useStep(delay: number, duration: number) {
  const reduced = useReducedMotion();
  const p = useSharedValue(0);
  useEffect(() => {
    p.value = reduced ? withTiming(1, { duration: DUR.fade }) : withDelay(delay, withTiming(1, { duration, easing: EASE.out }));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps -- once per mount
  return { p, reduced };
}

function useFadeInDown(i: number) {
  const { p, reduced } = useStep(ENTRANCE.rest + STAGGER * i, DUR.enter);
  return useAnimatedStyle(() => ({ opacity: p.value, transform: [{ translateY: reduced ? 0 : (1 - p.value) * 12 }] }));
}

/** Styles for the dark total card and, in visual order, the cards around it: routes, split, navigation. */
export function useResultEntrance() {
  const { p, reduced } = useStep(0, DUR.card);
  const hero = useAnimatedStyle(() => ({ opacity: p.value, transform: [{ scale: reduced ? 1 : 0.98 + 0.02 * p.value }] }));
  const routes = useFadeInDown(0);
  const share = useFadeInDown(1);
  const nav = useFadeInDown(2);
  return { hero, routes, share, nav };
}
