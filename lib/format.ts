/** 1234.5 -> "1,234.50" */
export function formatAmount(n: number, decimals = 2) {
  const [int, frac] = n.toFixed(decimals).split('.');
  const grouped = int.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return frac ? `${grouped}.${frac}` : grouped;
}

/**
 * The one money format: 30.75 -> "₪30.75", sign first, wrapped in LRI…PDI so surrounding RTL text can't flip it.
 * `isolate: false` only for SVG text, where react-native-svg draws the isolate marks as glyphs.
 */
export function formatMoney(v: number, { decimals = 2, isolate = true }: { decimals?: number; isolate?: boolean } = {}) {
  const s = `₪${formatAmount(v, decimals)}`;
  return isolate ? `⁦${s}⁩` : s;
}

/** nearest half shekel, for splitting a trip: 33.26 -> 33.5 */
export const roundHalf = (n: number) => Math.round(n * 2) / 2;

/** a split share: 33.26 -> "33.5", 33 -> "33" */
export const formatShare = (total: number, people: number) => {
  const v = roundHalf(total / people);
  return formatAmount(v, Number.isInteger(v) ? 0 : 1);
};

/** a split share as money: 33.26 -> "₪33.5" (isolated) */
export const formatShareMoney = (total: number, people: number) => {
  const v = roundHalf(total / people);
  return formatMoney(v, { decimals: Number.isInteger(v) ? 0 : 1 });
};

/** Share text for "חלק עם הנוסעים". `from`/`to` are empty in manual-distance mode. */
export function splitMessage(t: { total: number; km: number; roundTrip: boolean; from: string; to: string }, people: number) {
  const trip = t.from && t.to ? `${t.from} ← ${t.to}` : 'נסיעה';
  return [
    `🚗 ${trip}${t.roundTrip ? ' (הלוך-חזור)' : ''}`,
    `${Math.round(t.km)} ק"מ | ${formatMoney(t.total)}`,
    `כל אחד מ-${people} הנוסעים: ${formatShareMoney(t.total, people)}`,
    'חושב ב-CheckFuel',
  ].join('\n');
}
