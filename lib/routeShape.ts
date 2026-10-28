// A route's shape for a small SVG box, no map: decode -> equirectangular -> turn so origin is on top -> simplify -> fit.
import { decodePolyline } from './route';

export interface RouteShape {
  /** SVG path data in box pixels */
  d: string;
  start: { x: number; y: number };
  end: { x: number; y: number };
  /** path length in px, for the strokeDashoffset draw-in */
  length: number;
}

export function routeShape(polyline: string, width = 72, height = 112, pad = 10, maxPoints = 40): RouteShape | null {
  let ll: [number, number][];
  try {
    ll = decodePolyline(polyline);
  } catch {
    return null;
  }
  if (ll.length < 2 || ll.some(([a, b]) => !Number.isFinite(a) || !Number.isFinite(b))) return null;

  const lats = ll.map((p) => p[0]);
  const k = Math.cos((((Math.min(...lats) + Math.max(...lats)) / 2) * Math.PI) / 180);
  // screen axes: x east, y south
  let pts = ll.map(([lat, lng]) => ({ x: lng * k, y: -lat }));

  // the design puts the origin on top and the destination below it, so turn (never mirror) the shape until it is
  const first = pts[0], last = pts[pts.length - 1];
  const vx = last.x - first.x, vy = last.y - first.y;
  if (vx || vy) {
    const t = Math.PI / 2 - Math.atan2(vy, vx);
    const cos = Math.cos(t), sin = Math.sin(t);
    pts = pts.map(({ x, y }) => ({ x: x * cos - y * sin, y: x * sin + y * cos }));
  }

  // simplify: evenly spaced points, always keeping both ends
  if (pts.length > maxPoints) {
    const step = (pts.length - 1) / (maxPoints - 1);
    pts = Array.from({ length: maxPoints }, (_, i) => pts[Math.round(i * step)]);
  }

  const xs = pts.map((p) => p.x), ys = pts.map((p) => p.y);
  const minX = Math.min(...xs), minY = Math.min(...ys);
  const bw = Math.max(...xs) - minX, bh = Math.max(...ys) - minY;
  const s = Math.min(bw ? (width - 2 * pad) / bw : Infinity, bh ? (height - 2 * pad) / bh : Infinity);
  const scale = Number.isFinite(s) ? s : 1;
  const ox = (width - bw * scale) / 2, oy = (height - bh * scale) / 2;
  const out = pts.map((p) => ({ x: +(ox + (p.x - minX) * scale).toFixed(1), y: +(oy + (p.y - minY) * scale).toFixed(1) }));

  let length = 0;
  for (let i = 1; i < out.length; i++) length += Math.hypot(out[i].x - out[i - 1].x, out[i].y - out[i - 1].y);
  const d = out.map((p, i) => `${i ? 'L' : 'M'}${p.x} ${p.y}`).join(' ');
  return { d, start: out[0], end: out[out.length - 1], length };
}
