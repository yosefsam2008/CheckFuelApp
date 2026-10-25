// Trip cost: the calculator's formula, extracted unchanged from the old wizard's handleCalculate
import { calculateAdjustedConsumption, calculateVehicleAge } from './data/fuelConsumptionAdjustments';
import { LEGAL_UI_STRINGS } from '../legal/LEGAL_UI_STRINGS_HE';

export interface Vehicle {
  id: string;
  name: string;
  brand?: string; // maker, English
  model: string;
  engine: string;
  fueltype: string;
  avgConsumption?: number; // km/L, or kWh/km for Electric
  type?: string;
  tankCapacity?: number;
  year?: number;
}

export type DriveMode = 'eco' | 'normal' | 'sport';
export interface TripPrefs {
  mode: DriveMode;
  ac: boolean;
}
export const DEFAULT_PREFS: TripPrefs = { mode: 'normal', ac: true };

// Multipliers on fuel/energy used, applied on top of the formula's own result
export const MODE_FACTOR: Record<DriveMode, number> = { eco: 0.93, normal: 1, sport: 1.12 };
export const AC_FACTOR = 1.04;

export interface CalculationResult {
  totalCost: number;
  consumption: number; // km/L, or kWh/km for Electric
  costPerKm: number;
  fuelConsumed: number; // liters, or kWh for Electric
  energyType: 'fuel' | 'electricity';
  distance: number;
}

export interface FuelPrices {
  Gasoline: number;
  Diesel: number;
  Electric: number;
}

export function computeTrip(vehicle: Vehicle, km: number, price: number, prefs: TripPrefs): CalculationResult {
  const isElectric = vehicle.fueltype === 'Electric';
  const avg = vehicle.avgConsumption ?? 0;
  const base = isElectric ? avg * 100 : avg; // the formula takes kWh/100km for EVs
  // road type is not asked (factor 1), style and AC are applied below as the owner's mode multipliers
  const adjusted = calculateAdjustedConsumption(base, {
    vehicleAge: calculateVehicleAge(vehicle.year || new Date().getFullYear()),
    fuelType: isElectric ? 'Electric' : vehicle.fueltype === 'Diesel' ? 'Diesel' : 'Gasoline',
    drivingStyle: 'normal',
    climate: 'hot',
    tripType: 'mixed',
    vehicleCondition: 'good',
    useAC: false,
    shortTrips: false,
  }).adjustedConsumption;

  const mult = MODE_FACTOR[prefs.mode] * (prefs.ac ? AC_FACTOR : 1);
  const fuelConsumed = (isElectric ? (km / 100) * adjusted : km / Math.max(adjusted, 0.1)) * mult;
  const totalCost = fuelConsumed * price;
  return {
    totalCost,
    consumption: isElectric ? fuelConsumed / km : km / fuelConsumed, // kWh/km, or km/L
    costPerKm: totalCost / km,
    fuelConsumed,
    energyType: isElectric ? 'electricity' : 'fuel',
    distance: km,
  };
}

// shortcut: the price feed has no 98 price, so 98 is shown as the 95 price plus this estimate; replace when the feed has it
export const OCTANE_98_PREMIUM = 0.5;
export type Octane = '95' | '98';

/** Same price pick as the old wizard's auto-fill; 98 only applies to petrol. */
export function priceFor(vehicle: Vehicle, prices: FuelPrices, octane: Octane = '95'): number {
  const field = priceField(vehicle);
  return prices[field] + (field === 'Gasoline' && octane === '98' ? OCTANE_98_PREMIUM : 0);
}

/** Which price feed field a vehicle uses; trucks count as diesel. */
export function priceField(vehicle: Vehicle): keyof FuelPrices {
  if (vehicle.fueltype === 'Electric') return 'Electric';
  const isTruck = /truck|lorry/i.test(vehicle.type ?? '');
  return vehicle.fueltype === 'Diesel' || isTruck ? 'Diesel' : 'Gasoline';
}

export const MAX_KM = 5000;
export const PRICE_HINT = 'הזן מחיר דלק תקין';

export interface TripInputs {
  vehicle: Vehicle | null;
  manual: boolean;
  manualText: string;
  routeKm: number | null; // one way, from the route provider
  routeLoading: boolean;
  roundTrip: boolean;
  fuelPrice: string;
}

/** The calculator's input checks: trip km, price, and the one hint that blocks "calculate" (vehicle first). */
export function tripInputs({ vehicle, manual, manualText, routeKm, routeLoading, roundTrip, fuelPrice }: TripInputs) {
  const manualValue = parseFloat(manualText);
  const manualError = !manualText ? null : isNaN(manualValue) ? 'המרחק חייב להיות מספר' : manualValue <= 0 ? 'המרחק חייב להיות גדול מ-0' : manualValue > MAX_KM ? `המרחק חייב להיות עד ${MAX_KM} ק״מ` : null;
  const oneWayKm = manual ? manualValue : (routeKm ?? 0);
  const kmValid = oneWayKm > 0 && oneWayKm <= MAX_KM;
  const km = kmValid ? oneWayKm * (roundTrip ? 2 : 1) : 0;
  const price = parseFloat(fuelPrice);
  const missing: { hint: string; target: 'vehicle' | 'route' } | null = !vehicle
    ? { hint: 'בחר רכב כדי לחשב', target: 'vehicle' }
    : !kmValid
      ? { hint: routeLoading && !manual ? 'מחשב מרחק…' : manual ? 'הקלד מרחק כדי לחשב' : 'בחר יעד כדי לחשב', target: 'route' }
      : !((vehicle.avgConsumption ?? 0) > 0)
        ? { hint: LEGAL_UI_STRINGS.errors.invalidConsumption, target: 'vehicle' }
        : !(price > 0 && price <= 100)
          ? { hint: PRICE_HINT, target: 'vehicle' }
          : null;
  return { manualError, km, kmValid, price, missing };
}
