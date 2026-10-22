// Pure display helpers for the calculator's price row. Presentation only: nothing here feeds a calculation.
import type { FuelPrices, Octane } from './tripCost';

/** Line above the price. Only 95 self-service is price-controlled; 98 is the 95 price plus an estimate, diesel is computed. */
export function priceLabel(field: keyof FuelPrices, octane: Octane): string {
  if (field === 'Electric') return 'חשמל · תעריף ביתי';
  if (field === 'Diesel') return 'סולר · מחיר משוער';
  return octane === '98' ? 'בנזין 98 · מחיר משוער' : 'בנזין 95 · מחיר מפוקח';
}
