/**
 * Energy consumption factors for motorcycles by engine size
 * Used in fuel economy calculations for electric vehicles
 *
 * These factors represent the average kWh consumption per 100km
 * based on motorcycle engine displacement (CC)
 */

export const MOTORCYCLE_ENERGY_FACTORS = [
  { maxCC: 200, factor: 5.0, category: 'SCOOTER_SMALL' },
  { maxCC: 400, factor: 5.2, category: 'SCOOTER_MEDIUM' },
  { maxCC: 800, factor: 5.5, category: 'MOTORCYCLE_LIGHT' },
  { maxCC: 1200, factor: 5.8, category: 'MOTORCYCLE_MEDIUM' },
  { maxCC: 1600, factor: 6.0, category: 'MOTORCYCLE_HEAVY' },
  { maxCC: Infinity, factor: 6.2, category: 'MOTORCYCLE_LARGE' },
] as const;

export type MotorcycleCategory = typeof MOTORCYCLE_ENERGY_FACTORS[number]['category'];

/**
 * Get the energy consumption factor for a given engine displacement
 * @param cc Engine displacement in cubic centimeters
 * @returns Energy consumption factor (kWh/100km)
 */
export function getEnergyFactorForCC(cc: number): number {
  const match = MOTORCYCLE_ENERGY_FACTORS.find(range => cc < range.maxCC);
  return match?.factor ?? 6.2;
}

/**
 * Get the motorcycle category based on engine displacement
 * @param cc Engine displacement in cubic centimeters
 * @returns Motorcycle category string
 */
export function getMotorcycleCategory(cc: number): MotorcycleCategory {
  const match = MOTORCYCLE_ENERGY_FACTORS.find(range => cc < range.maxCC);
  return match?.category ?? 'MOTORCYCLE_LARGE';
}

/**
 * Energy content constants for different fuel types (MJ/L)
 */
export const FUEL_ENERGY_CONTENT = {
  GASOLINE: 32, // MJ/L
  DIESEL: 36,   // MJ/L
} as const;
