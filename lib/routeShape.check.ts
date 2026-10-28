// Self-check for routeShape.
// Run: npx ts-node --transpile-only -O "{\"module\":\"commonjs\",\"moduleResolution\":\"node\",\"customConditions\":null}" lib/routeShape.check.ts
import assert from 'node:assert/strict';
import { routeShape } from './routeShape';

// Google's polyline encoding, so the test builds its own inputs
function encode(points: [number, number][]) {
  let out = '', pLat = 0, pLng = 0;
  const num = (v: number) => {
    let n = v < 0 ? ~(v << 1) : v << 1;
    while (n >= 0x20) {
      out += String.fromCharCode((0x20 | (n & 0x1f)) + 63);
      n >>= 5;
    }
    out += String.fromCharCode(n + 63);
  };
  for (const [lat, lng] of points) {
    const a = Math.round(lat * 1e5), b = Math.round(lng * 1e5);
    num(a - pLat);
    num(b - pLng);
    pLat = a;
    pLng = b;
  }
  return out;
}

const inBox = (p: { x: number; y: number }) => p.x >= 9.9 && p.x <= 62.1 && p.y >= 9.9 && p.y <= 102.1;
const pointsOf = (d: string) => d.split(/[ML]/).filter(Boolean).map((t) => t.trim().split(' ').map(Number));

// Tel Aviv -> Haifa heads north, a 200-point wiggly route
const north: [number, number][] = Array.from({ length: 200 }, (_, i) => [32.08 + (i / 199) * 0.73, 34.78 + Math.sin(i / 20) * 0.05]);
const a = routeShape(encode(north))!;
assert.ok(a, 'shape');
assert.ok(a.start.y < a.end.y, 'origin on top even when the route heads north');
assert.ok(Math.abs(a.start.x - a.end.x) < 0.2, 'origin above destination');
assert.ok(pointsOf(a.d).length <= 40, 'simplified to <= 40 points');
assert.ok(pointsOf(a.d).every(([x, y]) => inBox({ x, y })), 'fits the box with 10px padding');
assert.ok(Math.abs(a.start.y - 10) < 0.2 && Math.abs(a.end.y - 102) < 0.2, 'fills the box height');
assert.ok(a.length >= 92, 'length covers at least the straight distance');

// a straight line keeps its ends centered horizontally
const line = routeShape(encode([[31, 35], [31.5, 35], [32, 35]]))!;
assert.deepEqual([line.start, line.end], [{ x: 36, y: 10 }, { x: 36, y: 102 }]);
assert.equal(line.length, 92);

// east-west route is turned, not squashed: still uses the full height
const east = routeShape(encode([[32, 34.8], [32, 35.3]]))!;
assert.ok(Math.abs(east.end.y - east.start.y - 92) < 0.2);

// round trip back to the start: no turn, still fits
const loop = routeShape(encode([[32, 34.8], [32.1, 34.9], [32.2, 34.8], [32, 34.8]]))!;
assert.ok(pointsOf(loop.d).every(([x, y]) => inBox({ x, y })));

// nothing to draw
assert.equal(routeShape(''), null);
assert.equal(routeShape(encode([[32, 34.8]])), null);
const same = routeShape(encode([[32, 34.8], [32, 34.8]]))!;
assert.deepEqual(same.start, { x: 36, y: 56 });

console.log('routeShape: ok');
