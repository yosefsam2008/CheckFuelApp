// The registry result card. On the first reveal of a result it plays the add-vehicle signature moment:
// a car drives into its tile, the title uncovers, chips rise, the badge pops. Timings: revealDur (reference demo).
import React, { useEffect, useRef } from 'react';
import { AccessibilityInfo, StyleSheet, Text, View } from 'react-native';
import Animated, {
  interpolate,
  type SharedValue,
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle, Line, Path } from 'react-native-svg';
import { ease, revealDur as D, useRevealReduced } from '../../constants/motion';
import { color, colors, Heebo, radius } from '../../constants/theme';
import type { Vehicle } from '../../lib/data/vehiclesData';
import { isRtlText } from '../../lib/vehicles/reveal';
import { LtrText } from '../history/LtrText';
import { FUEL_LABEL, tintFor, VehicleTile } from './fuel';

const AnimatedPath = Animated.createAnimatedComponent(Path);
const CHECK_LEN = 9; // "m9 12 2 2 4-4" is 8.49 long
const known = (s?: string) => !!s && s !== 'לא ידוע';

// car drawn facing left, 1 unit = 1px, centred in the 48px tile
const TILE = 48;
const CAR_W = 34;
const CAR_H = 22;
const CAR_LEFT = (TILE - CAR_W) / 2;
const CAR_TOP = 12;
const WHEEL = 8;
const WHEELS_X = [9, 26]; // wheel centres in car units
const WHEEL_Y = 16;
const BODY = 'M2 14 L2 11 Q2 9 4 9 L9 8 L13 4 Q14 3 16 3 L25 3 Q27 3 28 5 L31 9 Q33 10 33 12 L33 14 Q33 16 31 16 L4 16 Q2 16 2 14 Z';
const WINDOWS = 'M11 8 L14 5 L19 5 L19 8 Z M21 5 L25 5 L28 8 L21 8 Z';
const PUFFS = [
  { dx: 0, dy: 0, size: 7 },
  { dx: 4, dy: -3, size: 6 },
  { dx: 7, dy: 1, size: 5 },
];

interface Props {
  vehicle: Vehicle;
  title: string;
  /** true only on the first render of this lookup result; later mounts (tab switch back) show it at rest */
  first: boolean;
}

export function VehicleFoundCard({ vehicle, title, first }: Props) {
  const reduced = useRevealReduced();
  const play = useRef(first && !reduced).current;
  const from = play ? 0 : 1;
  // -1: drives in from the left, facing right (the approved web look). Not I18nManager.isRTL: that is false on web
  // and true on native, so the car came from opposite sides on the two platforms of the same RTL app.
  const dir: number = -1;
  const maskSign = isRtlText(title) ? -1 : 1; // Hebrew uncovers right to left, Latin left to right

  const card = useSharedValue(from);
  const carIn = useSharedValue(from);
  const carX = useSharedValue(play ? 140 * dir : 0);
  const wheel = useSharedValue(from);
  const body = useSharedValue(0);
  const dust0 = useSharedValue(0);
  const dust1 = useSharedValue(0);
  const dust2 = useSharedValue(0);
  const mask = useSharedValue(from);
  const chip0 = useSharedValue(from);
  const chip1 = useSharedValue(from);
  const chip2 = useSharedValue(from);
  const badge = useSharedValue(from);
  const check = useSharedValue(from);
  const titleW = useSharedValue(0);
  const dust = [dust0, dust1, dust2];
  const chips = [chip0, chip1, chip2];

  useEffect(() => {
    if (first) AccessibilityInfo.announceForAccessibility(`נמצא: ${title} ${vehicle.year}`);
    if (!play) return;
    const out = (to: number, duration: number, delay = 0) => withDelay(delay, withTiming(to, { duration, easing: ease.outQuint }));
    card.value = out(1, D.card);
    carIn.value = out(1, D.car * 0.25, D.carDelay);
    // passes the tile by 5px at 82% of the drive, then rolls back onto it
    carX.value = withDelay(
      D.carDelay,
      withSequence(withTiming(-5 * dir, { duration: D.car * 0.82, easing: ease.outQuint }), withTiming(0, { duration: D.car * 0.18, easing: ease.outQuint })),
    );
    wheel.value = out(1, D.car, D.carDelay);
    body.value = withDelay(D.settleDelay, withSequence(withTiming(-1.6, { duration: D.settle / 2 }), withTiming(0, { duration: D.settle / 2 })));
    dust.forEach((d, i) => (d.value = withDelay(D.dustDelay + i * D.dustStep, withTiming(1, { duration: D.dust }))));
    mask.value = out(1, D.title, D.titleDelay);
    chips.forEach((c, i) => (c.value = out(1, D.chip, D.chipDelay + i * D.chipStagger)));
    badge.value = withDelay(D.badgeDelay, withTiming(1, { duration: D.badge, easing: ease.pop }));
    check.value = out(1, D.check, D.checkDelay);
    // mount-only: the reveal never replays for the same result
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const cardStyle = useAnimatedStyle(() => ({ opacity: card.value, transform: [{ translateY: (1 - card.value) * 8 }] }));
  const carStyle = useAnimatedStyle(() => ({ opacity: carIn.value, transform: [{ translateX: carX.value }, { scaleX: dir }] }));
  const bodyStyle = useAnimatedStyle(() => ({ transform: [{ translateY: body.value }] }));
  // the car is mirrored with scaleX in LTR, which mirrors the spin too
  const wheelStyle = useAnimatedStyle(() => ({ transform: [{ rotate: `${-720 * wheel.value}deg` }] }));
  const maskStyle = useAnimatedStyle(() => ({ transform: [{ translateX: maskSign * mask.value * titleW.value }] }));
  const badgeStyle = useAnimatedStyle(() => ({ opacity: Math.min(1, badge.value * 2), transform: [{ scale: 0.4 + 0.6 * badge.value }] }));
  const checkProps = useAnimatedProps(() => ({ strokeDashoffset: CHECK_LEN * (1 - check.value) }));

  const tint = tintFor(vehicle.fueltype);
  const isCar = !vehicle.type || vehicle.type === 'car';
  const engine = known(vehicle.engine);
  const chipTexts: { text: string; ltr: boolean }[] = [
    { text: String(vehicle.year), ltr: true },
    { text: FUEL_LABEL[vehicle.fueltype ?? ''] ?? 'לא ידוע', ltr: false },
    ...(engine ? [{ text: vehicle.engine!, ltr: true }] : []),
  ];

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
        {isCar ? (
          <View style={[styles.tile, { backgroundColor: tint.fill }]} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
            {PUFFS.map((p, i) => (
              <Puff
                key={i}
                t={dust[i]}
                dir={dir}
                left={dir === 1 ? CAR_LEFT + CAR_W + p.dx - 4 : CAR_LEFT - p.dx - p.size + 4}
                top={CAR_TOP + WHEEL_Y - 2 + p.dy}
                size={p.size}
              />
            ))}
            <Animated.View style={[styles.car, carStyle]}>
              <Animated.View style={bodyStyle}>
                <Svg width={CAR_W} height={CAR_H} viewBox={`0 0 ${CAR_W} ${CAR_H}`}>
                  <Path d={BODY} fill={tint.icon} />
                  <Path d={WINDOWS} fill={tint.fill} />
                </Svg>
              </Animated.View>
              {WHEELS_X.map((x) => (
                <Animated.View key={x} style={[styles.wheel, { left: x - WHEEL / 2, top: WHEEL_Y - WHEEL / 2 }, wheelStyle]}>
                  <Svg width={WHEEL} height={WHEEL}>
                    <Circle cx={4} cy={4} r={3.6} fill={tint.icon} />
                    <Line x1={4} y1={1.4} x2={4} y2={6.6} stroke={tint.fill} strokeWidth={1} />
                    <Circle cx={4} cy={4} r={1.2} fill={tint.fill} />
                  </Svg>
                </Animated.View>
              ))}
            </Animated.View>
          </View>
        ) : (
          // shortcut: only cars get the drive-in; a motorcycle or truck keeps the static tile
          <VehicleTile type={vehicle.type} fuel={vehicle.fueltype} />
        )}
        <View style={styles.foundText}>
          <View style={styles.titleClip} onLayout={(e) => (titleW.value = e.nativeEvent.layout.width)}>
            <LtrText style={styles.foundName} numberOfLines={2}>{title}</LtrText>
            {play && <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.mask, maskStyle]} />}
          </View>
          <View style={styles.chips}>
            {chipTexts.map((c, i) => (
              <Chip key={i} t={chips[i]} text={c.text} ltr={c.ltr} shrink={i === 2} />
            ))}
          </View>
        </View>
      </View>
    </Animated.View>
  );
}

function Chip({ t, text, ltr, shrink }: { t: SharedValue<number>; text: string; ltr: boolean; shrink: boolean }) {
  const style = useAnimatedStyle(() => ({ opacity: t.value, transform: [{ translateY: (1 - t.value) * 6 }] }));
  const T = ltr ? LtrText : Text;
  return (
    <Animated.View style={[shrink && styles.shrink, style]}>
      <T style={styles.chip} numberOfLines={1}>
        {text}
      </T>
    </Animated.View>
  );
}

function Puff({ t, dir, left, top, size }: { t: SharedValue<number>; dir: number; left: number; top: number; size: number }) {
  const style = useAnimatedStyle(() => ({
    opacity: interpolate(t.value, [0, 0.3, 1], [0, 0.8, 0]),
    transform: [{ translateX: t.value * 4 * dir }, { scale: interpolate(t.value, [0, 0.4, 1], [0.3, 1, 1.7]) }],
  }));
  return <Animated.View style={[styles.puff, { left, top, width: size, height: size, borderRadius: size / 2 }, style]} />;
}

const styles = StyleSheet.create({
  // overflow hidden: the car enters from the card's edge, not from outside the card
  found: { marginTop: 16, padding: 16, borderRadius: radius.tile, borderWidth: 1, borderColor: colors.divider, overflow: 'hidden' },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', marginBottom: 12, paddingVertical: 4, paddingHorizontal: 10, borderRadius: radius.pill, backgroundColor: colors.guideFill },
  badgeText: { fontFamily: Heebo.semi, fontSize: 13, color: colors.guideText },
  foundHead: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  tile: { width: TILE, height: TILE, borderRadius: radius.tile },
  car: { position: 'absolute', left: CAR_LEFT, top: CAR_TOP, width: CAR_W, height: CAR_H },
  wheel: { position: 'absolute', width: WHEEL, height: WHEEL },
  puff: { position: 'absolute', backgroundColor: colors.textMuted },
  foundText: { flex: 1, minWidth: 0 },
  // hugs the text at the inline start (next to the car), like the badge and the chips
  titleClip: { alignSelf: 'flex-start', maxWidth: '100%', overflow: 'hidden' },
  mask: { backgroundColor: colors.surface },
  foundName: { fontFamily: Heebo.extra, fontSize: 17, color: colors.text },
  chips: { flexDirection: 'row', gap: 6, marginTop: 4 },
  shrink: { flexShrink: 1 },
  // textSecondary, not textMuted: 4.54:1 on the grey pill (textMuted is ~3:1 there)
  chip: { overflow: 'hidden', paddingHorizontal: 8, paddingVertical: 2, borderRadius: radius.pill, backgroundColor: colors.bg, fontFamily: Heebo.semi, fontSize: 12, color: color.textSecondary },
});
