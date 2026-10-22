// The registry result card. On the first reveal of a result it plays the add-vehicle signature moment (<= 600ms).
import React, { useEffect, useRef } from 'react';
import { AccessibilityInfo, I18nManager, StyleSheet, Text, View } from 'react-native';
import Animated, {
  useAnimatedProps,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle, Path } from 'react-native-svg';
import { ease, revealDur, spring } from '../../constants/motion';
import { color, colors, Heebo, radius } from '../../constants/theme';
import type { Vehicle } from '../../lib/data/vehiclesData';
import { isRtlText } from '../../lib/vehicles/reveal';
import { LtrText } from '../history/LtrText';
import { FUEL_LABEL, VehicleTile } from './fuel';

const AnimatedPath = Animated.createAnimatedComponent(Path);
const CHECK_LEN = 9; // "m9 12 2 2 4-4" is 8.49 long
const known = (s?: string) => !!s && s !== 'לא ידוע';

interface Props {
  vehicle: Vehicle;
  title: string;
  /** true only on the first render of this lookup result; later mounts (tab switch back) show it at rest */
  first: boolean;
}

export function VehicleFoundCard({ vehicle, title, first }: Props) {
  const reduced = useReducedMotion();
  const play = useRef(first && !reduced).current;
  const from = play ? 0 : 1;
  const card = useSharedValue(from);
  const car = useSharedValue(from);
  const mask = useSharedValue(from);
  const meta = useSharedValue(from);
  const badge = useSharedValue(from);
  const check = useSharedValue(from);
  const titleW = useSharedValue(0);

  useEffect(() => {
    if (first) AccessibilityInfo.announceForAccessibility(`נמצא: ${title} ${vehicle.year}`);
    if (!play) return;
    const t = (to: number, duration: number, delay = 0) => withDelay(delay, withTiming(to, { duration, easing: ease.outQuint }));
    card.value = t(1, 300);
    car.value = t(1, revealDur.carIn);
    badge.value = withSpring(1, spring.calm);
    check.value = t(1, 300, 150);
    mask.value = t(1, 450, 100);
    meta.value = t(1, 300, 100 + 2 * revealDur.chipStagger);
    // mount-only: the reveal never replays for the same result
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const dir = I18nManager.isRTL ? 1 : -1; // enters from the inline-start edge
  const maskSign = isRtlText(title) ? -1 : 1; // Hebrew uncovers right to left, Latin left to right

  const cardStyle = useAnimatedStyle(() => ({ opacity: card.value, transform: [{ translateY: (1 - card.value) * 8 }] }));
  const carStyle = useAnimatedStyle(() => ({ opacity: car.value, transform: [{ translateX: (1 - car.value) * 40 * dir }] }));
  const maskStyle = useAnimatedStyle(() => ({ transform: [{ translateX: maskSign * mask.value * titleW.value }] }));
  const metaStyle = useAnimatedStyle(() => ({ opacity: meta.value, transform: [{ translateY: (1 - meta.value) * 6 }] }));
  const badgeStyle = useAnimatedStyle(() => ({ opacity: badge.value, transform: [{ scale: 0.8 + 0.2 * badge.value }] }));
  const checkProps = useAnimatedProps(() => ({ strokeDashoffset: CHECK_LEN * (1 - check.value) }));

  const engine = known(vehicle.engine);
  return (
    <Animated.View style={[styles.found, cardStyle]}>
      <Animated.View style={[styles.badge, badgeStyle]}>
        {/* lucide CircleCheck geometry, with the tick drawn in */}
        <Svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke={colors.guideText} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
          <Circle cx={12} cy={12} r={10} />
          <AnimatedPath d="m9 12 2 2 4-4" strokeDasharray={CHECK_LEN} animatedProps={checkProps} />
        </Svg>
        <Text style={styles.badgeText}>נמצא במאגר משרד התחבורה</Text>
      </Animated.View>
      <View style={styles.foundHead}>
        <Animated.View style={carStyle}>
          <VehicleTile type={vehicle.type} fuel={vehicle.fueltype} />
        </Animated.View>
        <View style={styles.foundText}>
          <View style={styles.titleClip} onLayout={(e) => (titleW.value = e.nativeEvent.layout.width)}>
            <LtrText style={styles.foundName} numberOfLines={1}>{title}</LtrText>
            {play && <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.mask, maskStyle]} />}
          </View>
          <Animated.View style={[styles.chips, metaStyle]}>
            <LtrText style={styles.chip} numberOfLines={1}>{vehicle.year}</LtrText>
            <Text style={styles.chip} numberOfLines={1}>{FUEL_LABEL[vehicle.fueltype ?? ''] ?? 'לא ידוע'}</Text>
            {engine && <LtrText style={[styles.chip, styles.chipShrink]} numberOfLines={1}>{vehicle.engine}</LtrText>}
          </Animated.View>
        </View>
      </View>
    </Animated.View>
  );
}

// moved from addVehicle.tsx unchanged, plus the title clip and its mask
const styles = StyleSheet.create({
  found: { marginTop: 16, padding: 16, borderRadius: radius.tile, borderWidth: 1, borderColor: colors.divider },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', marginBottom: 12, paddingVertical: 4, paddingHorizontal: 10, borderRadius: radius.pill, backgroundColor: colors.guideFill },
  badgeText: { fontFamily: Heebo.semi, fontSize: 13, color: colors.guideText },
  foundHead: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  foundText: { flex: 1, minWidth: 0 },
  titleClip: { overflow: 'hidden' },
  mask: { backgroundColor: colors.surface },
  foundName: { fontFamily: Heebo.extra, fontSize: 17, color: colors.text },
  chips: { flexDirection: 'row', gap: 6, marginTop: 4 },
  // textSecondary, not textMuted: 4.54:1 on the grey pill (textMuted is ~3:1 there)
  chip: { overflow: 'hidden', paddingHorizontal: 8, paddingVertical: 2, borderRadius: radius.pill, backgroundColor: colors.bg, fontFamily: Heebo.semi, fontSize: 12, color: color.textSecondary },
  chipShrink: { flexShrink: 1 },
});
