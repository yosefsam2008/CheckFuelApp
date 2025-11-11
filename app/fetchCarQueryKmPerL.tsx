// app/api/fetchCarQueryKmPerL.ts
import { FuelType } from "./fuelData";

const baseUrl = process.env.EXPO_PUBLIC_API_URL || "https://checkfuel-server.onrender.com";

const cache = new Map<string, number>();

export async function fetchCarQueryKmPerL(
  brand: string,
  model: string,
  year?: string | number,
  fuelType?: FuelType | string
): Promise<number | undefined> {
  if (!brand || !model) return undefined;

  const key = `${brand}-${model}-${year}-${fuelType}`;
  if (cache.has(key)) return cache.get(key);

  try {
    const yearParam = year ? `&year=${encodeURIComponent(String(year))}` : "";
    const url = `${baseUrl}/api/carquery?brand=${encodeURIComponent(
      brand
    )}&model=${encodeURIComponent(model)}${yearParam}`;

    const response = await fetch(url);
    if (!response.ok) throw new Error("API request failed");

    const data = await response.json();
    const trims: any[] = data?.Trims ?? [];
    if (!trims.length) throw new Error("No trims returned");

    const bestTrim =
      trims.find((t) => t.model_lkm_city && t.model_lkm_hwy) ||
      trims.find((t) => t.model_lkm_city || t.model_lkm_hwy) ||
      trims[0];

    const cityRaw = Number(bestTrim.model_lkm_city);
    const hwyRaw = Number(bestTrim.model_lkm_hwy);

    const toKmPerL = (l?: number) => (l && l > 0 ? 100 / l : undefined);
    const cityKm = toKmPerL(cityRaw);
    const hwyKm = toKmPerL(hwyRaw);

    let avgKmPerL = cityKm && hwyKm ? (cityKm + hwyKm) / 2 : cityKm ?? hwyKm;

    const lowerFuel = (fuelType || bestTrim.model_engine_fuel || "").toLowerCase();
    if (lowerFuel.includes("electric")) {
      const batteryCapacityKwh = Number(bestTrim.battery_kwh) || 60;
      const rangeKm = Number(bestTrim.range_km) || 400;
      const kmPerPercent = rangeKm / 100;
      cache.set(key, kmPerPercent);
      return kmPerPercent;
    }
    if (lowerFuel.includes("hybrid")) avgKmPerL = avgKmPerL! * 1.2;

    if (avgKmPerL !== undefined) {
    cache.set(key, avgKmPerL);
}

    return avgKmPerL;
  } catch (err) {
    console.warn("⚠️ fetchCarQueryKmPerL error:", err);
    return undefined;
  }
}
