// Home route card (design Main.dc.html): the chosen route's shape in a 72×112 box, drawn from its polyline, no map.
import React, { useEffect, useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedProps, useReducedMotion, useSharedValue, withTiming } from 'react-native-reanimated';
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import { ease } from '../../constants/motion';
import { colors } from '../../constants/colors';
import { Rubik } from '../../constants/themeV2';
import { routeShape } from '../../lib/routeShape';

const AnimatedPath = Animated.createAnimatedComponent(Path);
const AnimatedRect = Animated.createAnimatedComponent(Rect);

const W = 72;
const H = 112;
const DRAW_MS = 900;
// before a destination: the mockup's placeholder curve and its ends
const GHOST = 'M52 12 C52 52 20 60 20 100';
const GHOST_ENDS = { start: { x: 52, y: 12 }, end: { x: 20, y: 100 } };

export function RouteShapeBox({ polyline, km }: { polyline?: string; km?: number | null }) {
  const shape = useMemo(() => (polyline ? routeShape(polyline, W, H) : null), [polyline]);
  const reduced = useReducedMotion();
  const drawn = useSharedValue(0);
  const length = shape?.length ?? 0;

  useEffect(() => {
    drawn.value = 0;
    if (shape) drawn.value = withTiming(1, { duration: reduced ? 200 : DRAW_MS, easing: ease.inOutQuint });
  }, [shape, reduced, drawn]);

  // reduced motion: the line fades in whole instead of drawing
  const lineProps = useAnimatedProps(() => (reduced ? { strokeDashoffset: 0, opacity: drawn.value } : { strokeDashoffset: length * (1 - drawn.value), opacity: 1 }));
  // the destination fades in as the line reaches it
  const endProps = useAnimatedProps(() => ({ opacity: shape ? 0.25 + 0.75 * Math.min(1, Math.max(0, (drawn.value - 0.6) / 0.4)) : 0.25 }));

  const { start, end } = shape ?? GHOST_ENDS;
  return (
    <View style={styles.box}>
      <Svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        {shape ? (
          <AnimatedPath d={shape.d} fill="none" stroke={colors.textInverse} strokeWidth={3.5} strokeLinecap="round" strokeLinejoin="round" strokeDasharray={length} animatedProps={lineProps} />
        ) : (
          <Path d={GHOST} fill="none" stroke={colors.inkBorder} strokeWidth={2} strokeDasharray="2 5" strokeLinecap="round" />
        )}
        <Circle cx={start.x} cy={start.y} r={7} fill={colors.surfaceInverse} stroke={colors.accent} strokeWidth={3.5} />
        <AnimatedRect x={end.x - 7} y={end.y - 7} width={14} height={14} rx={4} fill={colors.surfaceRaised} animatedProps={endProps} />
      </Svg>
      <Text style={styles.km}>{km ? `${Math.round(km)} ק״מ` : ' '}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  box: { width: W, alignItems: 'center', gap: 4 },
  km: { fontFamily: Rubik.semi, fontSize: 11, color: colors.textMutedInverse, fontVariant: ['tabular-nums'] },
});
