// Consumption input helpers. Electric and PHEV avgConsumption is stored as kWh per km,
// but shown and typed as kWh per 100 km.
export type Fuel = 'Gasoline' | 'Diesel' | 'Electric' | 'PHEV' | 'Unknown' | undefined;

const isEv = (fuel: Fuel) => fuel === 'Electric' || fuel === 'PHEV';

/** Accepts "6,5" and "6.5"; null for anything that is not a number. */
export function parseDecimal(text: string): number | null {
  const t = text.trim().replace(',', '.');
  if (!/^\d*\.?\d+$|^\d+\.$/.test(t)) return null;
  return Number(t);
}

/** A usable consumption is a number above zero. */
export const isValidConsumption = (n: number | null): n is number => n !== null && n > 0;

export const toStored = (shown: number, fuel: Fuel) => (isEv(fuel) ? Number((shown / 100).toFixed(4)) : shown);
export const toDisplay = (stored: number, fuel: Fuel) => (isEv(fuel) ? Number((stored * 100).toFixed(1)) : stored);
