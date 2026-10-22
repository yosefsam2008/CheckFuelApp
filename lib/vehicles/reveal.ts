// Pure helpers for the add-vehicle reveal. Presentation only: derived from the screen's state, never stored.

const digitsOf = (text: string) => text.replace(/\D/g, '');

/** 7 digits: 12-345-67, 8 digits: 123-45-678, anything shorter stays as typed */
export const formatPlate = (text: string) => {
  const d = digitsOf(text).slice(0, 8);
  if (d.length === 7) return `${d.slice(0, 2)}-${d.slice(2, 5)}-${d.slice(5)}`;
  if (d.length === 8) return `${d.slice(0, 3)}-${d.slice(3, 5)}-${d.slice(5)}`;
  return d;
};

/**
 * Registry names arrive in caps ("GLC 43 AMG", "COROLLA"). Title-case each word (each part of a hyphenated one),
 * except all-caps words of up to 3 letters (GLC, AMG, BMW) and words with a digit (EV6, X5), which stay uppercase.
 */
export const titleCase = (s: string) =>
  s.replace(/[^\s-]+/g, (w) =>
    /\d/.test(w) ? w.toUpperCase() : w.length <= 3 && w === w.toUpperCase() ? w : w[0].toUpperCase() + w.slice(1).toLowerCase(),
  );

export type LookupStatus = 'idle' | 'searching' | 'found' | 'notfound' | 'offline' | 'duplicate';
export type RevealPhase = 'idle' | 'typing' | 'searching' | 'found' | 'notFound' | 'error' | 'duplicate';

export function derivePhase({ plate, status, hasResult }: { plate: string; status: LookupStatus; hasResult: boolean }): RevealPhase {
  if (status === 'searching') return 'searching';
  if (status === 'found') return hasResult ? 'found' : 'idle';
  if (status === 'notfound') return 'notFound';
  if (status === 'offline') return 'error';
  if (status === 'duplicate') return 'duplicate';
  return digitsOf(plate) ? 'typing' : 'idle';
}

/** Gauge top end: at least 20 km/l, and 25% headroom so a hybrid at 16.1 never pins the needle */
export const gaugeScaleMax = (value: number) => Math.max(20, Math.ceil((value * 1.25) / 5) * 5);

/** 0..1 needle position; empty, invalid or non-positive values rest at 0 */
export const gaugeFraction = (value: number | null) => (value && value > 0 && isFinite(value) ? Math.min(value / gaugeScaleMax(value), 1) : 0);

/** Text direction from the first strong character: Hebrew reveals right to left, Latin left to right */
export const isRtlText = (s: string) => {
  const m = s.match(/[A-Za-zÀ-ɏ֐-׿؀-ۿ]/);
  return !!m && /[֐-ۿ]/.test(m[0]);
};
