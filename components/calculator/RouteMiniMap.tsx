// Mini route drawing (Animated Beam): the path draws itself and a dot travels with the pen, in a 3.4s loop.
import React, { useMemo } from 'react';
import Animated, { useAnimatedProps } from 'react-native-reanimated';
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import { useLoop } from '../../constants/motion';
import { colors } from '../../constants/theme';
import { decodePolyline } from '../../lib/route';

const AnimatedPath = Animated.createAnimatedComponent(Path);
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

const W = 110;
const H = 90;
const PAD = 12;
const DRAW_SHARE = 0.6; // draw for 60% of the loop (2040ms of 3400ms), then hold

type Pt = [number, number];

// the default curve: M18 78 C 18 40, 92 58, 90 14, sampled so the traveling dot can follow it
function genericCurve(): Pt[] {
  const [p0, p1, p2, p3]: Pt[] = [[18, 78], [18, 40], [92, 58], [90, 14]];
  return Array.from({ length: 41 }, (_, i) => {
    const t = i / 40, u = 1 - t;
    const f = (k: 0 | 1) => u * u * u * p0[k] + 3 * u * u * t * p1[k] + 3 * u * t * t * p2[k] + t * t * t * p3[k];
    return [f(0), f(1)];
  });
}

function fitRoute(encoded: string): Pt[] | null {
  const raw = decodePolyline(encoded);
  if (raw.length < 2) return null;
  const step = Math.ceil(raw.length / 60);
  const pts = raw.filter((_, i) => i % step === 0 || i === raw.length - 1);
  const lats = pts.map((p) => p[0]), lngs = pts.map((p) => p[1]);
  const minLat = Math.min(...lats), maxLat = Math.max(...lats), minLng = Math.min(...lngs), maxLng = Math.max(...lngs);
  const scale = Math.min((W - 2 * PAD) / (maxLng - minLng || 1e-9), (H - 2 * PAD) / (maxLat - minLat || 1e-9));
  const offX = (W - (maxLng - minLng) * scale) / 2, offY = (H - (maxLat - minLat) * scale) / 2;
  return pts.map(([lat, lng]) => [offX + (lng - minLng) * scale, offY + (maxLat - lat) * scale]);
}

const easeInOut = (t: number) => {
  'worklet';
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
};

/** `active` false = no route yet: the curve is drawn muted and still */
export function RouteMiniMap({ polyline, width = 94, active = true }: { polyline?: string; width?: number; active?: boolean }) {
  const geo = useMemo(() => {
    const pts = (polyline && fitRoute(polyline)) || genericCurve();
    const cum = [0];
    for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
    const d = pts.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(' ');
    return { pts, xs: pts.map((p) => p[0]), ys: pts.map((p) => p[1]), cum, total: cum[cum.length - 1], d };
  }, [polyline]);

  const p = useLoop(3400);
  const { xs, ys, cum, total } = geo;

  const penProps = useAnimatedProps(() => ({
    strokeDashoffset: total * (1 - easeInOut(Math.min(p.value / DRAW_SHARE, 1))),
  }));
  const dotProps = useAnimatedProps(() => {
    const t = easeInOut(Math.min(p.value / DRAW_SHARE, 1)) * total;
    let i = 1;
    while (i < cum.length - 1 && cum[i] < t) i++;
    const seg = cum[i] - cum[i - 1] || 1;
    const k = Math.min(Math.max((t - cum[i - 1]) / seg, 0), 1);
    return { cx: xs[i - 1] + (xs[i] - xs[i - 1]) * k, cy: ys[i - 1] + (ys[i] - ys[i - 1]) * k };
  });

  if (!active) {
    const [ix, iy] = geo.pts[0];
    const [jx, jy] = geo.pts[geo.pts.length - 1];
    return (
      <Svg width={width} height={(width * H) / W} viewBox={`0 0 ${W} ${H}`}>
        <Path d={geo.d} stroke={colors.divider} strokeWidth={4} fill="none" strokeLinecap="round" strokeLinejoin="round" />
        <Circle cx={ix} cy={iy} r={5} stroke={colors.textMuted} strokeWidth={3} fill={colors.white} />
        <Rect x={jx - 5} y={jy - 5} width={10} height={10} rx={2.5} fill={colors.textMuted} />
      </Svg>
    );
  }

  const [sx, sy] = geo.pts[0];
  const [ex, ey] = geo.pts[geo.pts.length - 1];
  return (
    <Svg width={width} height={(width * H) / W} viewBox={`0 0 ${W} ${H}`}>
      <Path d={geo.d} stroke={colors.divider} strokeWidth={4} fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <AnimatedPath
        d={geo.d}
        stroke={colors.brandGreen}
        strokeWidth={4}
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeDasharray={`${total} ${total}`}
        animatedProps={penProps}
      />
      <Circle cx={sx} cy={sy} r={5} stroke={colors.brandGreen} strokeWidth={3} fill={colors.white} />
      <Rect x={ex - 5} y={ey - 5} width={10} height={10} rx={2.5} fill={colors.text} />
      <AnimatedCircle r={5} fill={colors.selectedFill} stroke={colors.brandGreen} strokeWidth={2} animatedProps={dotProps} />
    </Svg>
  );
}
