// Run: npm run check:contrast. WCAG 2.x contrast for every text/background pair we ship.
import assert from 'node:assert';
import { color, fuelTint, plate } from '../constants/tokens';

const lin = (c: number) => ((c /= 255) <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const lum = (hex: string) => {
  const [r, g, b] = [1, 3, 5].map((i) => lin(parseInt(hex.slice(i, i + 2), 16)));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
export const ratio = (a: string, b: string) => {
  const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};

// [foreground, background, minimum ratio, label]. 4.5 = body text, 3 = large text / icons.
const pairs: [string, string, number, string][] = [
  ['#FFFFFF', color.brandGreenStrong, 4.5, 'white on green fill'],
  ['#FFFFFF', color.brandTealStrong, 4.5, 'white on teal fill'],
  ['#FFFFFF', color.link, 4.5, 'white on link blue'],
  [color.brandTealStrong, color.surface, 4.5, 'teal text on white'],
  [color.link, color.surface, 4.5, 'link on white'],
  [color.textPrimary, color.surface, 4.5, 'primary text on white'],
  [color.textSecondary, color.surface, 4.5, 'secondary text on white'],
  [color.textSecondary, color.background, 4.5, 'secondary text on grouped bg'],
  [color.warningText, color.surface, 4.5, 'warning text on white'],
  [color.textPrimary, color.brandGreen, 4.5, 'dark text on brand green'],
  [color.brandTeal, color.surface, 3, 'brand teal icon on white'],
  [fuelTint.gasolineIcon, fuelTint.gasolineFill, 3, 'gasoline icon on tint'],
  [fuelTint.dieselIcon, fuelTint.dieselFill, 3, 'diesel icon on tint'],
  [fuelTint.evIcon, fuelTint.evFill, 3, 'electric icon on tint'],
  [plate.ink, plate.fill, 4.5, 'plate digits on yellow'],
  [plate.stripText, plate.strip, 4.5, 'IL on plate strip'],
  [color.brandGreen, color.surface, 3, 'brand green icon on white (expected to FAIL: do not use as text)'],
];

let failed = 0;
for (const [fg, bg, min, label] of pairs) {
  const r = ratio(fg, bg);
  const ok = r >= min;
  if (!ok && !label.includes('expected to FAIL')) failed++;
  console.log(`${ok ? 'ok  ' : label.includes('expected') ? 'note' : 'FAIL'} ${r.toFixed(2)}:1 (min ${min}) ${label}`);
}
// Self-check of the math: black on white is 21:1.
assert(Math.abs(ratio('#000000', '#FFFFFF') - 21) < 1e-9);
assert.equal(failed, 0, `${failed} contrast pair(s) below minimum`);
