// Display-only formatting for the vehicles screen.
import type { Vehicle } from '../data/vehiclesData';
import { priceFor, type FuelPrices, type Vehicle as TripVehicle } from '../tripCost';
import { toDisplay } from './consumption';

/** 7 digits -> 12-345-67, 8 digits -> 123-45-678, anything else as stored */
export function formatPlate(plate: string): string {
  const d = plate.replace(/\D/g, '');
  if (d !== plate.replace(/[-\s]/g, '')) return plate;
  if (d.length === 7) return `${d.slice(0, 2)}-${d.slice(2, 5)}-${d.slice(5)}`;
  if (d.length === 8) return `${d.slice(0, 3)}-${d.slice(3, 5)}-${d.slice(5)}`;
  return plate;
}

/** "MERCEDES-BENZ" -> "Mercedes-Benz", "toyota" -> "Toyota" */
export const titleCase = (s: string) => s.toLowerCase().replace(/(^|[\s-])(\p{L})/gu, (_, sep, c) => sep + c.toUpperCase());

/** Shown consumption: km/L, or kWh per 100 km for Electric and PHEV; null when unknown */
export const shownConsumption = (v: Pick<Vehicle, 'avgConsumption' | 'fueltype'>) => (v.avgConsumption ? toDisplay(v.avgConsumption, v.fueltype) : null);

/** Fuel cost per 100 km at today's price. PHEV stores kWh but is priced as gasoline, so it gets none. */
export function costPer100(v: Pick<Vehicle, 'avgConsumption' | 'fueltype' | 'type'>, prices: FuelPrices): number | null {
  if (!v.avgConsumption || v.fueltype === 'PHEV') return null;
  const price = priceFor({ fueltype: v.fueltype ?? '', type: v.type } as TripVehicle, prices);
  return v.fueltype === 'Electric' ? v.avgConsumption * 100 * price : (100 / v.avgConsumption) * price;
}

const YEAR_TAIL = /\s+\d{4}$/;
const bare = (s: string) => s.replace(YEAR_TAIL, '').trim().toLowerCase();

/** "COROLLA HSD SDN 2021" -> "Corolla HSD SDN"; mixed-case text is kept, only the trailing year goes */
export function cleanModel(model: string): string {
  const s = model.replace(YEAR_TAIL, '').trim();
  if (s !== s.toUpperCase()) return s;
  return s.split(/\s+/).map((w) => (/^\p{L}{1,3}$/u.test(w) ? w : titleCase(w))).join(' ');
}

/**
 * Title + subline without repeating a token. A saved name that is only the model (+ year) or the brand is the
 * add-flow default, not a nickname. Nickname: "Brand · Model · Year"; otherwise the model is the title: "Brand · Year".
 */
export function vehicleLabels(v: Pick<Vehicle, 'name' | 'brand' | 'model' | 'year'>) {
  const name = v.name?.trim() ?? '';
  const brand = v.brand ? titleCase(v.brand) : '';
  const model = v.model ? cleanModel(v.model) : '';
  const nick = !!name && ![v.model, v.brand].some((x) => x && bare(x) === bare(name));
  const title = nick ? name : model || brand || name;
  const parts = [brand, nick ? model : '', v.year ? String(v.year) : ''].filter((t) => t && t !== title);
  return { title, brand: parts[0] === brand ? brand : '', subline: parts.join(' · ') };
}
