// Pure helpers for RollingNumber's digit columns. A column is rows 0-29: the digits 0-9 three times over.

const mod10 = (x: number) => ((x % 10) + 10) % 10;

/** Row to roll to so `digit` shows, moving only in `dir` (+1 up, -1 down) from row `pos`; the shortest such path. */
export function rollTarget(pos: number, digit: number, dir: 1 | -1) {
  'worklet';
  return dir > 0 ? pos + mod10(digit - pos) : pos - mod10(pos - digit);
}

/** The same digit in the middle copy (rows 10-19), so a roll either way stays inside the column. */
export function centerRow(pos: number) {
  'worklet';
  const r = Math.abs(pos - Math.round(pos)) < 0.01 ? Math.round(pos) : pos;
  return mod10(r) + 10;
}

/** The digit at `place` (units = 0, tenths = -1) of n, for the count-up. */
export function digitAt(n: number, place: number) {
  'worklet';
  return Math.floor(n / Math.pow(10, place) + 1e-6) % 10;
}

export interface Glyph {
  ch: string;
  /** units = 0, tens = 1, tenths = -1; a separator gets the place of the digit to its right */
  place: number;
  digit: boolean;
  key: string;
}

/** "1,234.5" -> glyphs keyed by place from the decimal point, so units keep their key when the digit count changes. */
export function glyphs(text: string): Glyph[] {
  const dot = text.indexOf('.');
  const intEnd = dot < 0 ? text.length : dot;
  const digitsIn = (a: number, b: number) => text.slice(a, b).replace(/\D/g, '').length;
  return text.split('').map((ch, i) => {
    const digit = /\d/.test(ch);
    const place = i < intEnd ? digitsIn(i + 1, intEnd) - (digit ? 0 : 1) : -digitsIn(dot + 1, i + 1) - (digit ? 0 : 1);
    return { ch, place, digit, key: digit ? `d${place}` : `s${place}${ch}` };
  });
}
