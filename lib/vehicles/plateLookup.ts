// Plate lookup against data.gov.il plus the consumption estimate pipeline. Moved out of
// the former add-by-plate screen; the fallbacks and estimates are unchanged.
import { calculateEVConsumptionAdvanced } from "../data/advancedEvConsumption";
import { getKnownEngineCCs, lookupEngineCC } from "../data/engineDatabase";
import {
  calculateICEConsumptionEnhanced,
  estimateWeightBySegment,
  fetchFallbackVehicleData,
  fetchWLTPData,
  getSmartCCFallback,
  translateBrandToEnglish
} from "../data/fuelData";
import { Vehicle } from "../data/vehiclesData";
import { estimateVehicleWeight } from "../data/vehicleWeightLookup";

const VEHICLE_APIS = [
  { type: "car", id: "053cea08-09bc-40ec-8f7a-156f0677aff3" },
  { type: "motorcycle", id: "bf9df4e2-d90d-4c0a-a400-19e15af8e95f" },
  { type: "truck", id: "cd3acc5c-03c3-4c89-9c54-d40f93c0d790" },
] as const;

type VehicleType = typeof VEHICLE_APIS[number]["type"];
type FuelType = "Electric" | "Gasoline" | "Diesel" | "PHEV" | "Unknown";
const MAX_WIDTH = 480;

function detectFuelTypeCanonical(record: any): FuelType {
  const raw = (record?.sug_delek_nm || "").toString().trim().toLowerCase();
  if (!raw) return "Unknown";

  if ((raw.includes('חשמל') && raw.includes('בנזין')) ||
       raw.includes('phev') ||
       raw.includes('plug-in') ||
       raw.includes('פלאג')) {
        console.log('---------------------- Detected PHEV fuel type based on:', raw);
    return "PHEV";
  }

  const tokens = raw.split(/[\s,\/\-()]+/).filter(Boolean);
  const evKeywords = ["חשמל","אלקטרי","ev","electric","battery","bev"];
  const dieselKeywords = ["דיזל","diesel","dsl"];
  const gasKeywords = ["בנזין","gasoline","petrol","gas","כ״א","כחול לבן"];

  if (tokens.some((t: string) => evKeywords.includes(t))) return "Electric";
  if (tokens.some((t: string) => dieselKeywords.includes(t))) return "Diesel";
  if (tokens.some((t: string) => gasKeywords.includes(t))) return "Gasoline";

  if (raw.includes("ev") || raw.includes("battery")) return "Electric";
  if (raw.includes("diesel")) return "Diesel";
  if (raw.includes("benz") || raw.includes("benzin") || raw.includes("gas")) return "Gasoline";

  return "Unknown";
}

function parseIntSafeLocal(value: any): number | undefined {
  if (value === null || value === undefined || value === '') return undefined;
  const n = parseInt(String(value), 10);
  return Number.isFinite(n) ? n : undefined;
}

function parseFloatSafeLocal(value: any): number | undefined {
  if (value === null || value === undefined || value === '') return undefined;

  const str = String(value).trim();

  if (/[a-zA-Z]/.test(str)) {
    if (__DEV__) {
      console.warn(`⚠️  Weight field contains letters, likely VIN or text: "${str}"`);
      console.warn(`   Rejecting this value - will try fallback weight sources`);
    }
    return undefined;
  }

  const n = parseFloat(str.replace(',', '.'));

  if (Number.isFinite(n)) {
    const isWeightField = str.length >= 3 && n >= 100;
    if (isWeightField && (n < 80 || n > 15000)) {
      if (__DEV__) {
        console.warn(`Invalid weight value detected: ${n}kg (outside 80-15000kg range)`);
      }
      return undefined;
    }
    return n;
  }

  return undefined;
}

type DataGovResult = { record: Record<string, any>; type: VehicleType; degem_nm?: string } | null;
type Search = { status: 'found'; found: NonNullable<DataGovResult> } | { status: 'notfound' } | { status: 'offline' };

export const plateDigits = (plate: string) => plate.replace(/\D/g, '');

async function searchPlate(plate: string, fetchImpl: typeof fetch, timeoutMs: number): Promise<Search> {
  const ctrl = new AbortController();
  const aborted = new Promise<never>((_, reject) => {
    ctrl.signal.addEventListener('abort', () => reject(new Error('timeout')));
  });
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  let threw = 0;
  const promises = VEHICLE_APIS.map(async (api) => {
    const filtersJson = JSON.stringify({ mispar_rechev: plate });
    const url = `https://data.gov.il/api/3/action/datastore_search?resource_id=${api.id}&filters=${encodeURIComponent(filtersJson)}&limit=1`;
    try {
      // race the abort so a fetch that ignores the signal still ends at the timeout
      const res = await Promise.race([fetchImpl(url, { signal: ctrl.signal }), aborted]);
      if (!res.ok) return null;
      const json = await res.json();
      const rec = json?.result?.records?.[0];
      if (rec) {
        const degem_nm = rec.degem_nm || rec.degem || rec.model_code;
        return { record: rec, type: api.type, degem_nm: degem_nm ? String(degem_nm).trim() : undefined };
      }
      return null;
    } catch {
      threw++;
      if (__DEV__) console.warn('fetchRecordByPlate error for', api.id);
      return null;
    }
  });

  const results = await Promise.all(promises);
  clearTimeout(timer);
  const found = results.find(r => r !== null);
  if (found) return { status: 'found', found };
  return threw === VEHICLE_APIS.length ? { status: 'offline' } : { status: 'notfound' };
}

export async function fetchRecordByPlate(plate: string): Promise<DataGovResult> {
  const r = await searchPlate(plateDigits(plate), fetch, 8000);
  return r.status === 'found' ? r.found : null;
}

export async function parseRelevantFields(record: Record<string, any>, _degem_nm?: string, vehicleType?: VehicleType) {
  const fuelTypeRaw = record.sug_delek_nm ?? record.fuel ?? '';
  const fuelType = detectFuelTypeCanonical({ sug_delek_nm: fuelTypeRaw });

  const rawBrand = (record.tozeret_nm || record.tozeret || '').toString().trim();
  // 🧹 GLOBAL SANITIZATION: Strip geographic suffixes immediately so the whole app uses the clean name
  const brand = rawBrand.replace(/\s*(יפן|קוריאה|דרום קוריאה|צפון קוריאה|קנדה|ארה"ב|גרמניה|צ'כיה|סלובקיה|טורקיה|ספרד|צרפת|אנגליה|בריטניה|איטליה|שוודיה|סין)\s*$/i, '').trim();

  const model = (record.kinuy_mishari || record.degem_nm || '').toString().trim();
  const year = parseIntSafeLocal(record.shnat_yitzur) ?? undefined;

  if (__DEV__) {
    console.log('\n⚖️  WEIGHT EXTRACTION STRATEGY:');
    console.log(`   Vehicle Type: ${vehicleType || 'unknown'}`);
  }

  let mishkal_kolel: number | undefined;

  if (vehicleType === 'motorcycle') {
    if (__DEV__) {
      console.log('🏍️  Motorcycle detected: using primary API for mishkal_kolel');
    }
    mishkal_kolel = parseFloatSafeLocal(
      record.mishkal_kolel ??
      record.mishkal_atzmi ??
      record.total_weight ??
      record.gross_weight ??
      record.gvwr ??
      record.mishkal
    );

    if (mishkal_kolel) {
      if (__DEV__) console.log(`✅ mishkal_kolel (gross weight) from primary API: ${mishkal_kolel}kg`);
    } else {
      if (__DEV__) console.log('⚠️  mishkal_kolel not found in primary API');
    }
  } else {
    if (__DEV__) {
      console.log('🚗 Car/Truck detected: extracting weight from primary API');
      console.log('   (Fallback via fetchFallbackVehicleData will be used in main flow if needed)');
    }

    let temp_mishkal = parseFloatSafeLocal(
      record.mishkal_kolel ??
      record.mishkal_atzmi ??
      record.total_weight ??
      record.gross_weight ??
      record.gvwr ??
      record.mishkal
    );

    // 🚨 ELEVATED QA GATE: Filter out ghost weights (like Mazda 3's 711kg) right at the source!
    if (temp_mishkal && (temp_mishkal < 800 || temp_mishkal > 4000)) {
      if (__DEV__) console.log(`⚠️ QA GATE TRIGGERED: Rejected impossible primary API weight of ${temp_mishkal}kg. Forcing fallback.`);
      temp_mishkal = undefined;
    }

    mishkal_kolel = temp_mishkal;

    if (mishkal_kolel) {
      if (__DEV__) console.log(`✅ mishkal_kolel (gross weight) from primary API: ${mishkal_kolel}kg`);
      if (__DEV__) console.log(`📊 FINAL WEIGHT: mishkal_kolel=${mishkal_kolel || 'N/A'}kg\n`);
    }
  }

  const weightKg = mishkal_kolel ?? parseFloatSafeLocal(record.weight_kg ?? record.mass_kg) ?? undefined;
  const batteryCapacity = parseFloatSafeLocal(record.battery_capacity ?? record.battery_kwh ?? record.batt_kwh ?? record.battery) ?? undefined;
  const rangeKm = parseFloatSafeLocal(record.range_km ?? record.range) ?? undefined;

  return {
    fuelType,
    brand,
    model,
    year,
    mishkal_kolel,
    weightKg,
    batteryCapacity,
    rangeKm,
  } as const;
}

const engineCodeCache = new Map<string, number | null>();

function extractCCDirect(record: Record<string, any>): number | undefined {
  const ccFields = [
    'nefach_manoa',
    'kobah_pnimiyt',
    'nefach',
    'volume_cm3',
    'displacement_cc',
    'engine_displacement',
    'engine_cc',
    'cubic_capacity',
    'displacement',
    'cc',
  ];

  for (const field of ccFields) {
    const value = record[field];
    if (!value || value === '0' || value === 0) continue;

    const strValue = String(value).trim();
    if (strValue === '') continue;

    if (/[a-zA-Z]/.test(strValue) && strValue.length > 6) continue;

    const cleanedValue = strValue.replace(/[^\d]/g, '');
    if (cleanedValue === '') continue;

    const cc = parseInt(cleanedValue, 10);
    if (Number.isFinite(cc) && cc >= 50 && cc <= 15000) {
      if (__DEV__) console.log(`   ✅ ${field}: ${cc}cc`);
      return cc;
    }
  }

  return undefined;
}

async function searchCCByEngineCode(
  engineCode: string,
  vehicleType: VehicleType
): Promise<number | undefined> {
  if (__DEV__) console.log(`🔍 Searching API for engine: "${engineCode}"`);

  const apiId = VEHICLE_APIS.find(api => api.type === vehicleType)?.id;
  if (!apiId) return undefined;

  const filtersJson = JSON.stringify({ degem_manoa: engineCode });
  const url = `https://data.gov.il/api/3/action/datastore_search?resource_id=${apiId}&filters=${encodeURIComponent(filtersJson)}&limit=10`;

  try {
    const response = await fetch(url);
    if (!response.ok) return undefined;

    const data = await response.json();
    const records = data?.result?.records || [];

    for (const record of records) {
      const cc = extractCCDirect(record);
      if (cc) return cc;
    }
    return undefined;
  } catch (error) {
    return undefined;
  }
}

async function searchCCByEngineCodeCached(
  engineCode: string,
  vehicleType: VehicleType
): Promise<number | undefined> {
  const cacheKey = `${vehicleType}:${engineCode}`;

  if (engineCodeCache.has(cacheKey)) {
    return engineCodeCache.get(cacheKey) || undefined;
  }

  const cc = await searchCCByEngineCode(engineCode, vehicleType);
  engineCodeCache.set(cacheKey, cc || null);
  return cc;
}

export async function extractEngineCC(
  record: Record<string, any>,
  vehicleType: VehicleType
): Promise<number | undefined> {
  if (__DEV__) console.log('\n🔍 CC Extraction - Engine:', record.degem_manoa ?? 'N/A');

  const engineCode = record.degem_manoa || record.engine_model || record.engine_type;
  const brand = record.tozeret_nm || record.brand;
  const model = record.kinuy_mishari || record.degem_nm || record.model;

  const directCC = extractCCDirect(record);
  if (directCC) return directCC;

  if (engineCode && String(engineCode).trim().length > 1) {
    const apiCC = await searchCCByEngineCodeCached(String(engineCode).trim(), vehicleType);
    if (apiCC) return apiCC;
  }

  if (engineCode && String(engineCode).trim().length > 1) {
    const staticCC = lookupEngineCC(String(engineCode).trim());
    if (staticCC) return staticCC;
  }

  if (brand && model) {
    const brandModelCCs = getKnownEngineCCs(brand, model);
    if (brandModelCCs && brandModelCCs.length > 0) {
      const sorted = [...brandModelCCs].sort((a, b) => a - b);
      const midIndex = Math.floor(sorted.length / 2);
      return sorted.length % 2 === 0
        ? Math.round((sorted[midIndex - 1] + sorted[midIndex]) / 2)
        : sorted[midIndex];
    }
  }

  return undefined;
}

export type LookupResult =
  | { status: 'found'; vehicle: Vehicle }
  | { status: 'notfound' }
  | { status: 'offline' };

export async function lookupPlate(
  rawPlate: string,
  opts: { timeoutMs?: number; fetchImpl?: typeof fetch } = {},
): Promise<LookupResult> {
  const plateTrimmed = plateDigits(rawPlate);
  const search = await searchPlate(plateTrimmed, opts.fetchImpl ?? fetch, opts.timeoutMs ?? 8000);
  if (search.status !== 'found') return search;
  const found = search.found;

      if (__DEV__) {
        console.log(`\n✅ Found: ${found.record.tozeret_nm || found.record.tozeret} ${found.record.degem_nm || found.record.kinuy_mishari}`);
        console.log(`   Type: ${found.type} | Engine: ${found.record.degem_manoa} | Year: ${found.record.shnat_yitzur}`);
      }

      const parsed = await parseRelevantFields(found.record, found.degem_nm, found.type);

      let effectiveMishkalKolel = parsed.mishkal_kolel;
      let cc = parsed.fuelType !== "Electric" ? await extractEngineCC(found.record, found.type) : undefined;

      const needsFallbackWeight = !effectiveMishkalKolel;
      const needsFallbackCC = parsed.fuelType !== "Electric" && !cc;

      if (needsFallbackWeight || needsFallbackCC) {
        const fallbackData = await fetchFallbackVehicleData({
          brand: parsed.brand, 
          model: parsed.model,
          year: parsed.year,
          engineCode: found.record.degem_manoa,
          plateNumber: plateTrimmed,
          degem_nm: found.degem_nm,
          isElectric: parsed.fuelType === "Electric",
        });

        if (fallbackData) {
          if (needsFallbackWeight && fallbackData.mishkal_kolel) {
            effectiveMishkalKolel = fallbackData.mishkal_kolel;
          }
          if (needsFallbackCC && fallbackData.nefach_manoa) {
            cc = fallbackData.nefach_manoa;
          }
        }
      }

      if (!effectiveMishkalKolel && parsed.brand && parsed.model) {
        const estimatedWeight = estimateVehicleWeight(parsed.brand, parsed.model, parsed.year);
        if (estimatedWeight) {
          effectiveMishkalKolel = estimatedWeight.gross;
        }
      }

      let officialSUV = false;
      let officialHybrid = false;

      if (found.type === 'car' && (!parsed.year || parsed.year >= 2018)) {
        const wltpData = await fetchWLTPData(found.record, found.degem_nm);
        if (wltpData) {
          officialSUV = wltpData.isOfficialSUV;
          officialHybrid = wltpData.isOfficialHybrid;
        }
      }

      let kwhPerKm: number | undefined;
      let avgConsumption: number | undefined;

      const isElectricOrPhev = parsed.fuelType === "Electric" || parsed.fuelType === "PHEV";
      const isPhev = parsed.fuelType === "PHEV";

      if (isElectricOrPhev) {
        const evData = await calculateEVConsumptionAdvanced({
          brand: parsed.brand,
          model: parsed.model,
          year: parsed.year || new Date().getFullYear(),
          vehicleType: found.type,
          mishkal_kolel: effectiveMishkalKolel,
          isPhev,                    
        });
        kwhPerKm = Number((evData.kwhPer100Km / 100).toFixed(4));
        
      } else {
        if (!effectiveMishkalKolel && parsed.brand && parsed.model) {
          effectiveMishkalKolel = estimateWeightBySegment(parsed.model, parsed.brand, officialSUV);
        }

        if (!cc && parsed.brand && effectiveMishkalKolel) {
          cc = getSmartCCFallback(parsed.brand, parsed.model || '', effectiveMishkalKolel, found.type);
        }

        const modelStr = typeof parsed.model === 'string' ? parsed.model.toUpperCase() : '';
        const brandStr = typeof parsed.brand === 'string' ? parsed.brand.toUpperCase() : '';

        let isHybridCar = officialHybrid;
        if (!officialHybrid) {
          const hybridKeywords = ['PRIUS', 'HYBRID', 'IONIQ', 'INSIGHT', 'HSD', 'CT200H', 'NIRO'];
          const isHybridBrand = brandStr === 'TOYOTA' || brandStr === 'LEXUS' || brandStr === 'HONDA' || brandStr === 'HYUNDAI';
          isHybridCar = hybridKeywords.some(keyword => modelStr.includes(keyword)) || (isHybridBrand && /[A-Z]{2,3}\d{2,3}H/i.test(modelStr));
        }

        let isActualSUV = officialSUV;
        if (!officialSUV) {
          const suvKeywords = ['RAV4', 'PRADO', 'LAND CRUISER', 'CHEROKEE', 'GRAND', 'TUCSON', 'SPORTAGE', 'IX35', 'CR-V', 'CAYENNE', 'VITARA', 'SUV', 'CROSS'];
          const isSUVBrand = brandStr === 'JEEP' || brandStr === 'LAND ROVER';
          isActualSUV = suvKeywords.some(keyword => modelStr.includes(keyword)) || isSUVBrand;
        }

        const rawAvgConsumption = calculateICEConsumptionEnhanced({
          mishkal_kolel: effectiveMishkalKolel,
          engineCC: cc,
          year: parsed.year,
          fuelType: parsed.fuelType === 'Diesel' ? 'Diesel' : 'Gasoline',
          vehicleType: found.type,
          isHybrid: isHybridCar,
          isOfficialSUV: isActualSUV,
          brand: parsed.brand,
          model: parsed.model,
        });

        if (rawAvgConsumption) {
           avgConsumption = Number(rawAvgConsumption.toFixed(1)); 
        }
      }

      const vehicleName = translateBrandToEnglish(parsed.brand || "לא ידוע");
      const newVehicle: Vehicle = {
        id: String(found.record._id ?? Date.now()),
        plate: String(found.record.mispar_rechev ?? plateTrimmed).toUpperCase(),
        name: vehicleName,
        brand: parsed.brand ? vehicleName : undefined,
        model: parsed.model || "לא ידוע",
        engine: String(found.record.degem_manoa ?? found.record.engine_type ?? "לא ידוע"),
        type: found.type,
        avgConsumption: (parsed.fuelType === "Electric" || parsed.fuelType === "PHEV") ? kwhPerKm : avgConsumption,
        fueltype: parsed.fuelType, 
        year: parsed.year ?? new Date().getFullYear(),
        mishkal_kolel: effectiveMishkalKolel,
      };

  return { status: 'found', vehicle: newVehicle };
}
