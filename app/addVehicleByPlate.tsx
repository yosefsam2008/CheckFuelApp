// app/AddVehicleByPlate.tsx 
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import 'expo-router/entry';
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { calculateEVConsumptionAdvanced } from "../lib/data/advancedEvConsumption";
import { getKnownEngineCCs, lookupEngineCC } from "../lib/data/engineDatabase";
import {
  calculateICEConsumptionEnhanced,
  estimateWeightBySegment,
  fetchFallbackVehicleData,
  fetchWLTPData,
  getSmartCCFallback,
  translateBrandToEnglish
} from "../lib/data/fuelData";
import { Vehicle } from "../lib/data/vehiclesData";
import { estimateVehicleWeight } from "../lib/data/vehicleWeightLookup";
import Toast from "./Toast";

// Conditional import for ads - only load on native platforms
let AdBannerComponent: any = null;
const AdBanner = ({ style }: { style?: any }) => {
  if (Platform.OS === 'web') return null;
  
  // Lazy load on first render (native only)
  if (!AdBannerComponent) {
    AdBannerComponent = require("../components/BannerAd").default;
  }
  
  return <AdBannerComponent style={style} />;
};

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

  // ⚡ PHEV MUST be checked BEFORE EV — "חשמל\בנזין" contains "חשמל"
  // which would otherwise be caught by the EV branch
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

  // ✅ ENHANCED: Detect VIN numbers that might be in weight fields
  // VIN format: 17 alphanumeric characters (e.g., "WBA8E310XHA055062")
  if (/[a-zA-Z]/.test(str)) {
    if (__DEV__) {
      console.warn(`⚠️  Weight field contains letters, likely VIN or text: "${str}"`);
      console.warn(`   Rejecting this value - will try fallback weight sources`);
    }
    return undefined;
  }

  const n = parseFloat(str.replace(',', '.'));

  // Validate reasonable weight range for vehicles (500-10000 kg)
  // This prevents invalid data from corrupting calculations
  if (Number.isFinite(n)) {
    // If this looks like weight data, validate the range
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

export async function fetchRecordByPlate(plate: string): Promise<DataGovResult> {
  // ✅ PERFORMANCE OPTIMIZATION: Query all 3 APIs in parallel instead of sequentially
  // Before: 3-6 seconds (sequential)
  // After: 1-2 seconds (parallel - limited by slowest API)

  const promises = VEHICLE_APIS.map(async (api) => {
    const filtersJson = JSON.stringify({ mispar_rechev: plate });
    const url = `https://data.gov.il/api/3/action/datastore_search?resource_id=${api.id}&filters=${encodeURIComponent(filtersJson)}&limit=1`;
    try {
      const res = await fetch(url);
      if (!res.ok) return null;
      const json = await res.json();
      const rec = json?.result?.records?.[0];
      if (rec) {
        // Extract degem_nm (vehicle model code) for potential weight fallback lookup
        const degem_nm = rec.degem_nm || rec.degem || rec.model_code;
        return { record: rec, type: api.type, degem_nm: degem_nm ? String(degem_nm).trim() : undefined };
      }
      return null;
    } catch {
      console.warn('fetchRecordByPlate error for', api.id);
      return null;
    }
  });

  // Wait for all APIs to respond in parallel
  const results = await Promise.all(promises);

  // Return the first successful result (car > motorcycle > truck order)
  return results.find(r => r !== null) ?? null;
}

export async function parseRelevantFields(record: Record<string, any>, _degem_nm?: string, vehicleType?: VehicleType) {
  const fuelTypeRaw = record.sug_delek_nm ?? record.fuel ?? '';
  const fuelType = detectFuelTypeCanonical({ sug_delek_nm: fuelTypeRaw });

  const brand = (record.tozeret_nm || record.tozeret || '').toString().trim();
  const model = (record.kinuy_mishari || record.degem_nm || '').toString().trim();
  const year = parseIntSafeLocal(record.shnat_yitzur) ?? undefined;

  // ⚠️  MISGERET NOT USED - unreliable in Israeli API (often contains VIN)
  // We use only mishkal_kolel (gross weight) for all calculations

  if (__DEV__) {
    console.log('\n⚖️  WEIGHT EXTRACTION STRATEGY:');
    console.log(`   Vehicle Type: ${vehicleType || 'unknown'}`);
    console.log('   NOTE: misgeret (curb weight) is NOT used - unreliable in Israeli API');
  }

  // mishkal_kolel strategy depends on vehicle type
  let mishkal_kolel: number | undefined;

  if (vehicleType === 'motorcycle') {
    // 🏍️ MOTORCYCLES: Get mishkal_kolel from PRIMARY API only
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
      if (__DEV__) {
        console.log(`✅ mishkal_kolel (gross weight) from primary API: ${mishkal_kolel}kg`);
      }
    } else {
      if (__DEV__) {
        console.log('⚠️  mishkal_kolel not found in primary API');
      }
    }
  } else {
    // 🚗 CARS/TRUCKS: Extract from PRIMARY API first, fallback handled in main flow
    if (__DEV__) {
      console.log('🚗 Car/Truck detected: extracting weight from primary API');
      console.log('   (Fallback via fetchFallbackVehicleData will be used in main flow if needed)');
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
      if (__DEV__) {
        console.log(`✅ mishkal_kolel (gross weight) from primary API: ${mishkal_kolel}kg`);
      }
    } else {
      if (__DEV__) {
        console.log('⚠️  mishkal_kolel not found in primary API - will use fallback');
      }
    }
  }

  if (__DEV__) {
    console.log(`📊 FINAL WEIGHT: mishkal_kolel=${mishkal_kolel || 'N/A'}kg\n`);
  }

  // Use mishkal_kolel directly for weight
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

// DEPRECATED: Replaced by calculateEVConsumptionEnhanced from fuelData.ts
// Kept for reference only - no longer used in production code

async function saveVehicle(vehicle: Vehicle): Promise<void> {
  try {
    const existing = await AsyncStorage.getItem("vehicles");
    const list: Vehicle[] = existing ? JSON.parse(existing) : [];
    list.push(vehicle);
    await AsyncStorage.setItem("vehicles", JSON.stringify(list));
  } catch (error) {
    console.error("Failed to save vehicle:", error);
    throw new Error("Failed to save vehicle to storage");
  }
}

function validateKmPerL(value?: number, vehicleType?: VehicleType): number | undefined {
  if (!value || value <= 0) return undefined;
  if (vehicleType === "motorcycle" && value > 60) return 60;
  if (vehicleType === "truck" && value > 20) return 20;
  if (value > 30) return 30;
  return value;
}

// DEPRECATED: Replaced by calculateICEConsumptionEnhanced from fuelData.ts
// Kept for reference only - no longer used in production code

// ==================== INTELLIGENT CC EXTRACTION SYSTEM ====================

// In-memory cache for engine code lookups (resets on app restart)
const engineCodeCache = new Map<string, number | null>();

/**
 * Phase 1: Direct CC extraction from vehicle record
 * Tries multiple field names to maximize coverage
 *
 * Field priority (Israeli Gov API → International → English):
 * 1. nefach_manoa - Primary Israeli API field (most common)
 * 2. kobah_pnimiyt - Alternative Hebrew field name
 * 3. nefach - Short form Hebrew
 * 4. volume_cm3 - International standard field
 * 5. displacement_cc - Alternative international
 * 6. engine_displacement - English field name
 * 7. engine_cc - Alternative English
 * 8. cubic_capacity - Another English variant
 * 9. cc - Short form
 */
function extractCCDirect(record: Record<string, any>): number | undefined {
  const ccFields = [
    // Israeli Government API fields (Hebrew)
    'nefach_manoa',        // נפח מנוע (primary)
    'kobah_pnimiyt',       // קובה פנימית (alternative)
    'nefach',              // נפח (short form)

    // International standard fields
    'volume_cm3',          // cm³ standard
    'displacement_cc',     // Displacement in CC

    // English field names
    'engine_displacement', // Full English name
    'engine_cc',           // CC variant
    'cubic_capacity',      // Another English variant
    'displacement',        // Generic displacement
    'cc',                  // Short form
  ];

  for (const field of ccFields) {
    const value = record[field];

    // Skip empty, null, undefined, or "0" values
    if (!value || value === '0' || value === 0) {
      continue;
    }

    // Convert to string for parsing
    const strValue = String(value).trim();

    // Skip if empty string after trim
    if (strValue === '') {
      continue;
    }

    // Check if this might be a VIN or other non-numeric data
    if (/[a-zA-Z]/.test(strValue) && strValue.length > 6) {
      continue;
    }

    // Clean and parse the value (remove non-digits)
    const cleanedValue = strValue.replace(/[^\d]/g, '');

    if (cleanedValue === '') {
      continue;
    }

    const cc = parseInt(cleanedValue, 10);

    // Validate: CC should be between 50cc (tiny motorcycle) and 15000cc (massive truck)
    if (Number.isFinite(cc) && cc >= 50 && cc <= 15000) {
      if (__DEV__) {
        console.log(`   ✅ ${field}: ${cc}cc`);
      }
      return cc;
    }
  }

  return undefined;
}

/**
 * Phase 2: API lookup by engine code (smart fallback)
 * Searches for other vehicles with the same engine code
 */
async function searchCCByEngineCode(
  engineCode: string,
  vehicleType: VehicleType
): Promise<number | undefined> {

  if (__DEV__) {
    console.log(`🔍 Searching API for engine: "${engineCode}"`);
  }

  // Build API search query
  const apiId = VEHICLE_APIS.find(api => api.type === vehicleType)?.id;
  if (!apiId) {
    if (__DEV__) {
      console.log('❌ No API ID found for vehicle type:', vehicleType);
    }
    return undefined;
  }

  const filtersJson = JSON.stringify({ degem_manoa: engineCode });
  const url = `https://data.gov.il/api/3/action/datastore_search?resource_id=${apiId}&filters=${encodeURIComponent(filtersJson)}&limit=10`;

  try {
    const response = await fetch(url);
    if (!response.ok) {
      if (__DEV__) {
        console.log(`⚠️ API request failed with status: ${response.status}`);
      }
      return undefined;
    }

    const data = await response.json();
    const records = data?.result?.records || [];

    if (__DEV__) {
      console.log(`📊 Found ${records.length} vehicles with engine "${engineCode}"`);
    }

    // Try to extract CC from ANY of the matching vehicles
    for (const record of records) {
      const cc = extractCCDirect(record);
      if (cc) {
        if (__DEV__) {
          console.log(`✅ CC found: ${cc} (from matching vehicle with same engine)`);
        }
        return cc;
      }
    }

    if (__DEV__) {
      console.log('⚠️ No CC found in any matching vehicles');
    }
    return undefined;
  } catch (error) {
    if (__DEV__) {
      console.error('❌ API lookup failed:', error);
    }
    return undefined;
  }
}

/**
 * Phase 2 (Cached): API lookup with caching to avoid redundant requests
 */
async function searchCCByEngineCodeCached(
  engineCode: string,
  vehicleType: VehicleType
): Promise<number | undefined> {

  const cacheKey = `${vehicleType}:${engineCode}`;

  // Check cache
  if (engineCodeCache.has(cacheKey)) {
    const cached = engineCodeCache.get(cacheKey);
    if (__DEV__) {
      console.log(`💾 Using cached CC for "${engineCode}": ${cached ?? 'not found'}`);
    }
    return cached || undefined;
  }

  // Not cached - fetch from API
  const cc = await searchCCByEngineCode(engineCode, vehicleType);

  // Store result (even if null, to avoid re-querying)
  engineCodeCache.set(cacheKey, cc || null);

  return cc;
}

/**
 * Phase 3: Combined extraction function (main orchestrator)
 * PRIORITY ORDER (most accurate → least accurate):
 * 1. Direct API field extraction (nefach_manoa, etc.)
 * 2. API search by engine code (searches other vehicles with same engine)
 * 3. Static lookup table by engine code
 * 4. Brand-model database lookup (from extracted government data)
 */
export async function extractEngineCC(
  record: Record<string, any>,
  vehicleType: VehicleType
): Promise<number | undefined> {

  if (__DEV__) {
    console.log('\n🔍 CC Extraction - Engine:', record.degem_manoa ?? 'N/A');
  }

  const engineCode = record.degem_manoa || record.engine_model || record.engine_type;
  const brand = record.tozeret_nm || record.brand;
  const model = record.kinuy_mishari || record.degem_nm || record.model;

  // Phase 1: Direct API fields
  if (__DEV__) {
    console.log('Phase 1: API fields');
  }
  const directCC = extractCCDirect(record);
  if (directCC) {
    if (__DEV__) {
      console.log(`✅ Found: ${directCC}cc (API)`);
    }
    return directCC;
  }

  // Phase 2: API search by engine code
  if (engineCode && String(engineCode).trim().length > 1) {
    if (__DEV__) {
      console.log(`Phase 2: Search "${engineCode}"`);
    }
    const apiCC = await searchCCByEngineCodeCached(
      String(engineCode).trim(),
      vehicleType
    );
    if (apiCC) {
      if (__DEV__) {
        console.log(`✅ Found: ${apiCC}cc (API search)`);
      }
      return apiCC;
    }
  }

  // Phase 3: Static lookup by engine code
  if (engineCode && String(engineCode).trim().length > 1) {
    if (__DEV__) {
      console.log(`Phase 3: Lookup "${engineCode}"`);
    }
    const staticCC = lookupEngineCC(String(engineCode).trim());
    if (staticCC) {
      if (__DEV__) {
        console.log(`✅ Found: ${staticCC}cc (engine code lookup)`);
      }
      return staticCC;
    }
  }

  // Phase 4: Brand-model database lookup
  if (brand && model) {
    if (__DEV__) {
      console.log(`Phase 4: Brand-model lookup "${brand}" + "${model}"`);
    }
    const brandModelCCs = getKnownEngineCCs(brand, model);
    if (brandModelCCs && brandModelCCs.length > 0) {
      // Return median value for best estimate
      const sorted = [...brandModelCCs].sort((a, b) => a - b);
      const midIndex = Math.floor(sorted.length / 2);
      const medianCC = sorted.length % 2 === 0
        ? Math.round((sorted[midIndex - 1] + sorted[midIndex]) / 2)
        : sorted[midIndex];
      if (__DEV__) {
        console.log(`✅ Found: ${medianCC}cc (brand-model database, options: [${brandModelCCs.join(', ')}])`);
      }
      return medianCC;
    }
  }

  if (__DEV__) {
    console.log('❌ CC not found in any source\n');
  }
  return undefined;
}

// ==================== END CC EXTRACTION SYSTEM ====================

// ==================== DYNAMIC ENGINE CC ESTIMATION ====================

/**
 * חישוב נפח מנוע משוער על בסיס משקל הרכב
 * משמש כ-fallback כאשר לא ניתן לקבוע את נפח המנוע מה-API או מטבלת lookup
 *
 * @param weight - משקל הרכב בק"ג (mishkal_kolel)
 * @param vehicleType - סוג הרכב (אופנוע/משאית/רכב פרטי)
 * @returns נפח מנוע משוער ב-CC
 */
function estimateEngineCCFromWeight(
  weight: number | undefined,
  vehicleType: VehicleType
): number {
  // אם אין משקל - החזר ברירת מחדל לפי סוג רכב
  if (!weight) {
    if (vehicleType === 'motorcycle') return 250;
    if (vehicleType === 'truck') return 3000;
    return 1600; // רכב פרטי
  }

  // אופנוע - קשר ישיר בין משקל לנפח מנוע
  if (vehicleType === 'motorcycle') {
    if (weight < 150) return 125;   // אופנוע קטן
    if (weight < 200) return 150;   // אופנוע בינוני-קטן
    if (weight < 250) return 250;   // אופנוע בינוני
    if (weight < 350) return 400;   // אופנוע בינוני-גדול
    return 650;                     // אופנוע גדול
  }

  // משאית - קשר ליניארי בין משקל לנפח מנוע
  if (vehicleType === 'truck') {
    if (weight < 4000) return 3000;  // משאית קלה
    if (weight < 6000) return 4000;  // משאית בינונית-קלה
    if (weight < 8000) return 5000;  // משאית בינונית
    if (weight < 10000) return 7000; // משאית בינונית-כבדה
    return 9000;                     // משאית כבדה
  }

  // רכב פרטי - קשר ליניארי בין משקל לנפח מנוע
  if (weight < 1000) return 1000;  // רכב קטן (Smart, Fiat 500)
  if (weight < 1200) return 1200;  // רכב קומפקטי (Yaris, Polo)
  if (weight < 1400) return 1400;  // רכב בינוני-קטן (Corolla, Golf)
  if (weight < 1600) return 1600;  // רכב בינוני (Civic, Mazda 3)
  if (weight < 1800) return 2000;  // רכב בינוני-גדול (Accord, Camry)
  if (weight < 2200) return 2500;  // רכב גדול (BMW 5, Mercedes E)
  return 3000;                     // רכב גדול מאוד (BMW 7, Mercedes S, SUV)
}

/**
 * התאמת נפח מנוע לפי שנת ייצור
 * מנועים חדשים יותר יעילים יותר - downsizing trend
 *
 * @param baseCC - נפח מנוע בסיסי
 * @param year - שנת ייצור הרכב
 * @returns נפח מנוע מותאם לשנת הייצור
 */
export function adjustCCByYear(baseCC: number, year: number | undefined): number {
  if (!year) return baseCC;

  // מגמת downsizing - מנועים חדשים יותר קטנים ויעילים יותר
  if (year >= 2020) {
    // רכבים מ-2020 ואילך - הפחתה של 10% (טורבו קטן במקום מנוע גדול)
    return Math.round(baseCC * 0.85);
  } else if (year >= 2010) {
    // רכבים מ-2010-2019 - הפחתה של 5% (תחילת מגמת downsizing)
    return Math.round(baseCC * 0.95);
  }

  // רכבים ישנים יותר - ללא שינוי
  return baseCC;
}

/**
 * חישוב חכם של נפח מנוע - משלב את כל המקורות
 *
 * סדר עדיפויות:
 * 1. נפח מנוע מה-API (אם קיים)
 * 2. חישוב דינמי על בסיס משקל ושנה
 *
 * @param params - פרמטרים לחישוב
 * @returns נפח מנוע סופי ב-CC
 */
function calculateSmartEngineCC(params: {
  apiCC?: number;
  weight?: number;
  year?: number;
  vehicleType: VehicleType;
}): number {
  const { apiCC, weight, year, vehicleType } = params;

  if (__DEV__) {
    console.log('\n🧮 SMART CC CALCULATION:');
  }

  // אם יש נפח מנוע מה-API - השתמש בו ישירות
  if (apiCC) {
    if (__DEV__) {
      console.log(`   ✅ Using API CC: ${apiCC}cc [SOURCE: API DATA]`);
    }
    return apiCC;
  }

  // חישוב דינמי על בסיס משקל ושנה
  if (__DEV__) {
    console.log(`   ⚠️  No API CC found - using FALLBACK calculation`);
  }
  if (__DEV__) {
    console.log(`   Weight: ${weight || 'N/A'}kg | Year: ${year || 'N/A'} | Type: ${vehicleType}`);
  }

  // שלב 1: אמידה לפי משקל
  const estimatedCC = estimateEngineCCFromWeight(weight, vehicleType);

  // בדיקה אם נעשה שימוש בברירת מחדל
  const usedDefault = !weight;
  if (usedDefault) {
    if (__DEV__) {
      console.log(`   ⚠️  No weight data - using DEFAULT CC: ${estimatedCC}cc`);
    }
  } else {
    if (__DEV__) {
      console.log(`   📏 Estimated from weight (${weight}kg): ${estimatedCC}cc`);
    }
  }

  // שלב 2: התאמה לפי שנה
  const adjustedCC = adjustCCByYear(estimatedCC, year);

  if (adjustedCC !== estimatedCC) {
    if (__DEV__) {
      console.log(`   📅 Adjusted for year (${year}): ${adjustedCC}cc (downsizing applied)`);
    }
  } else if (year) {
    if (__DEV__) {
      console.log(`   📅 Year ${year}: No adjustment needed (pre-2010)`);
    }
  } else {
    if (__DEV__) {
      console.log(`   ⚠️  No year data - skipping downsizing adjustment`);
    }
  }

  if (usedDefault) {
    if (__DEV__) {
      console.log(`   ✅ Final CC: ${adjustedCC}cc [SOURCE: DEFAULT VALUE]\n`);
    }
  } else {
    if (__DEV__) {
      console.log(`   ✅ Final CC: ${adjustedCC}cc [SOURCE: WEIGHT-BASED CALCULATION]\n`);
    }
  }

  return adjustedCC;
}

// ==================== END DYNAMIC CC ESTIMATION ====================

export default function AddVehicleByPlate() {
  const insets = useSafeAreaInsets();
  const [isKeyboardVisible, setKeyboardVisible] = useState(false);

  const [plate, setPlate] = useState("");
  const [loading, setLoading] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [focusAnim] = useState(new Animated.Value(0));
  const [pulseAnim] = useState(new Animated.Value(1));
  const router = useRouter();

  useEffect(() => {
    const showSubscription = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      () => setKeyboardVisible(true)
    );
    const hideSubscription = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => setKeyboardVisible(false)
    );

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, []);

  const handleFocus = () => {
    Animated.spring(focusAnim, {
      toValue: 1,
      useNativeDriver: false,
      tension: 40,
      friction: 7,
    }).start();
  };

  const handleBlur = () => {
    Animated.spring(focusAnim, {
      toValue: 0,
      useNativeDriver: false,
      tension: 40,
      friction: 7,
    }).start();
  };

  React.useEffect(() => {
    if (loading) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.05,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      pulseAnim.setValue(1);
    }
  }, [loading, pulseAnim]);

  const handleAddVehicleByPlate = async () => {
    const plateTrimmed = plate.trim();
    if (!plateTrimmed) {
      setToastMessage("❌ אנא הזן מספר רכב");
      return;
    }

    // ✅ בדיקת כפילות לפני החיפוש
    try {
      const existing = await AsyncStorage.getItem("vehicles");
      const vehicles: Vehicle[] = existing ? JSON.parse(existing) : [];
      
      const isDuplicate = vehicles.some(
        (v) => v.plate.toUpperCase() === plateTrimmed.toUpperCase()
      );
      
      if (isDuplicate) {
        setToastMessage("⚠️ רכב עם לוחית רישוי זו כבר קיים במערכת");
        return;
      }
    } catch (error) {
      console.error("Error checking duplicates:", error);
    }

    setLoading(true);

    if (__DEV__) {
      console.log('\n╔════════════════════════════════════════════════════════╗');
    }
    if (__DEV__) {
      console.log('║  🚗 ADD VEHICLE BY LICENSE PLATE - PROCESS STARTED     ║');
    }
    if (__DEV__) {
      console.log('╚════════════════════════════════════════════════════════╝');
    }
    if (__DEV__) {
      console.log(`🔍 Searching for plate: ${plateTrimmed}`);
    }

    try {
      const found = await fetchRecordByPlate(plateTrimmed);
      if (!found) {
        if (__DEV__) {
          console.log('❌ No data found in any API');
        }
        setToastMessage("❌ לא נמצאו נתונים עבור מספר זה באף מאגר");
        return;
      }


        if (__DEV__) {
          console.log(`\n✅ Found: ${found.record.tozeret_nm || found.record.tozeret} ${found.record.degem_nm || found.record.kinuy_mishari}`);
        }
        if (__DEV__) {
          console.log(`   Type: ${found.type} | Engine: ${found.record.degem_manoa} | Year: ${found.record.shnat_yitzur}`);
        }
        if (found.degem_nm) {
          if (__DEV__) {
            console.log(`   Model Code (degem_nm): ${found.degem_nm}`);
          }
        }

        const parsed = await parseRelevantFields(found.record, found.degem_nm, found.type);

        let kwhPerKm: number | undefined;
        let avgConsumption: number | undefined = undefined;

        // ============================================
        // UNIFIED PHASE 1-3: FETCH ONCE & REUSE
        // ✅ OPTIMIZED: Single fallback fetch, reusable across EV/ICE
        // ============================================
        let effectiveMishkalKolel = parsed.mishkal_kolel;
        let cc = parsed.fuelType !== "Electric" ? await extractEngineCC(found.record, found.type) : undefined;

        // Cache fallback data to avoid double-fetch
        let fallbackData: any = null;
        const needsFallbackWeight = !effectiveMishkalKolel;
        const needsFallbackCC = parsed.fuelType !== "Electric" && !cc;

        if (needsFallbackWeight || needsFallbackCC) {
          if (__DEV__) {
            console.log('\n🔄 Missing data - trying fallback API...');
          }

          fallbackData = await fetchFallbackVehicleData({
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
              if (__DEV__) console.log(`   ✅ Weight from fallback: ${effectiveMishkalKolel}kg`);
            }
            if (needsFallbackCC && fallbackData.nefach_manoa) {
              cc = fallbackData.nefach_manoa;
              if (__DEV__) console.log(`   ✅ CC from fallback: ${cc}cc`);
            }
          }
        }

        // ============================================
        // PHASE 3: BRAND/MODEL WEIGHT ESTIMATION
        // ============================================
        if (!effectiveMishkalKolel && parsed.brand && parsed.model) {
          const estimatedWeight = estimateVehicleWeight(parsed.brand, parsed.model, parsed.year);
          if (estimatedWeight) {
            effectiveMishkalKolel = estimatedWeight.gross;
            if (__DEV__) console.log(`📊 Weight estimated from DB: ${effectiveMishkalKolel}kg (gross)`);
          }
        }

        // ============================================
        // PHASE 4 SETUP: FETCH OFFICIAL WLTP DATA
        // ============================================
        let officialSUV = false;
        let officialHybrid = false;

        // Fetch official WLTP data for cars (year >= 2018 or unknown)
        if (found.type === 'car' && (!parsed.year || parsed.year >= 2018)) {
        const wltpData = await fetchWLTPData(found.record, found.degem_nm);
                  if (wltpData) {
            officialSUV = wltpData.isOfficialSUV;
            officialHybrid = wltpData.isOfficialHybrid;
            if (__DEV__) {
              console.log(`\n📋 WLTP Official Classification Retrieved:`);
              console.log(`   isOfficialSUV: ${officialSUV ? 'YES 🚙' : 'NO'}`);
              console.log(`   isOfficialHybrid: ${officialHybrid ? 'YES 🔋' : 'NO'}`);
            }
          }
        }

        // ============================================
        // PHASE 4: SPLIT BY FUEL TYPE FOR FINAL CALCULATION
        // ============================================
        const isElectricOrPhev = parsed.fuelType === "Electric" || parsed.fuelType === "PHEV";
const isPhev = parsed.fuelType === "PHEV";

        if (isElectricOrPhev) {
          if (__DEV__) console.log(`⚡ ${isPhev ? 'PHEV' : 'Electric'} vehicle calculation...`);
          
          const evData = await calculateEVConsumptionAdvanced({
            brand: parsed.brand,
            model: parsed.model,
            year: parsed.year || new Date().getFullYear(),
            vehicleType: found.type,
            mishkal_kolel: effectiveMishkalKolel,
            isPhev,                    // 👈 NEW FLAG
          });
  kwhPerKm = Number((evData.kwhPer100Km / 100).toFixed(4));
          
        } else {
          if (__DEV__) console.log('⛽ ICE vehicle calculation - Fuel:', parsed.fuelType);
          // ✅ cc & effectiveMishkalKolel already populated from unified PHASE 1-3 above
          // ✅ NO RE-DECLARATION, NO DOUBLE-FETCH

          // ============================================
          // PHASE 4: SMART FALLBACK HEURISTICS
          // ============================================
          // Apply intelligent weight and CC estimation if still missing after all previous phases

          if (!effectiveMishkalKolel && parsed.brand && parsed.model) {
            if (__DEV__) {
              console.log('\n🤖 PHASE 4: Applying Smart Fallback Heuristics');
            }

            // Use smart segment-based weight estimation
            const smartWeight = estimateWeightBySegment(parsed.model, parsed.brand, officialSUV);
            effectiveMishkalKolel = smartWeight;
            if (__DEV__) {
              console.log(`   ✅ Weight from estimateWeightBySegment: ${effectiveMishkalKolel}kg`);
            }
          }

          if (!cc && parsed.brand && effectiveMishkalKolel) {
            // Use smart brand/weight-based CC estimation
            const smartCC = getSmartCCFallback(parsed.brand, effectiveMishkalKolel);
            cc = smartCC;
            if (__DEV__) {
              console.log(`   ✅ CC from getSmartCCFallback: ${cc}cc`);
            }
          }

          // ============================================
          // PHASE 5: DATA SOURCING SUMMARY (for debugging)
          // ============================================
          if (__DEV__) {
            console.log('\n📊 DATA SOURCING SUMMARY:');
            const weightSource = needsFallbackWeight 
              ? (fallbackData?.mishkal_kolel ? 'Fallback API ✅' : 'Smart Heuristic 🤖')
              : 'Primary API ✅';
            const ccSource = needsFallbackCC
              ? (fallbackData?.nefach_manoa ? 'Fallback API ✅' : 'Smart Heuristic 🤖')
              : 'Primary API ✅';
            console.log(`   Weight (${effectiveMishkalKolel}kg): ${weightSource}`);
            console.log(`   CC (${cc}cc): ${ccSource}`);
          }

          // ============================================
          // PHASE 6: ADVANCED PHYSICS CALCULATION
          // ============================================

          // 🔥 זיהוי רכב היברידי משופר (לוכד גם היברידיות סמויות)
          const modelStr = typeof parsed.model === 'string' ? parsed.model.toUpperCase() : '';
          const brandStr = typeof parsed.brand === 'string' ? parsed.brand.toUpperCase() : '';

          // 1. Official WLTP data takes priority
          let isHybridCar = officialHybrid;

          // 2. If no official data, use heuristic fallbacks
          if (!officialHybrid) {
            // Keyword arrays for hybrid detection
            const hybridKeywords = ['PRIUS', 'HYBRID', 'IONIQ', 'INSIGHT', 'HSD', 'CT200H', 'NIRO'];
            
            // Check if model name includes any hybrid keywords
            const isHybridByKeyword = hybridKeywords.some(keyword => modelStr.includes(keyword));
            
            // Check brand for hybrid-heavy manufacturers
            const isHybridBrand = brandStr === 'TOYOTA' || brandStr === 'LEXUS' || brandStr === 'HONDA' || brandStr === 'HYUNDAI';
            
            // Hidden hybrid detection: Lexus/Toyota models ending with H or H+ (e.g., NX450H+, RX550H)
            const isToyotaLexusHybridCode = isHybridBrand && /[A-Z]{2,3}\d{2,3}H/i.test(modelStr);

            isHybridCar = isHybridByKeyword || isToyotaLexusHybridCode;
          }

          // 🚙 SUV Detection Enhancement with Keyword Arrays
          let isActualSUV = officialSUV;

          if (!officialSUV) {
            // Keyword arrays for SUV detection
            const suvKeywords = ['RAV4', 'PRADO', 'LAND CRUISER', 'CHEROKEE', 'GRAND', 'TUCSON', 'SPORTAGE', 'IX35', 'CR-V', 'CAYENNE', 'VITARA', 'SUV', 'CROSS'];
            
            // Check if model name includes any SUV keywords
            const isSUVByKeyword = suvKeywords.some(keyword => modelStr.includes(keyword));
            
            // Check if brand is JEEP or LAND ROVER
            const isSUVBrand = brandStr === 'JEEP' || brandStr === 'LAND ROVER';

            isActualSUV = isSUVByKeyword || isSUVBrand;
          }

          if (__DEV__) {
            console.log('\n🔧 PHASE 7: ICE Calculation Input:');
            console.log(`   mishkal_kolel (gross): ${effectiveMishkalKolel || 'N/A'}kg`);
            console.log(`   engineCC: ${cc || 'N/A'}cc`);
            console.log(`   year: ${parsed.year || 'N/A'}`);
            console.log(`   fuelType: ${parsed.fuelType}`);
            console.log(`   isHybrid (Official: ${officialHybrid ? 'YES 🔋' : 'NO'}, Fallback: ${isHybridCar ? 'YES 🔋' : 'NO'})`);
            console.log(`   isActualSUV (Official: ${officialSUV ? 'YES 🚙' : 'NO'}, Fallback: ${isActualSUV ? 'YES 🚙' : 'NO'})`);
          }

          avgConsumption = calculateICEConsumptionEnhanced({
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

          if (__DEV__) {
            console.log(`\n✅ ICE Result: ${avgConsumption} km/L`);
          }
        }

        const vehicleName = translateBrandToEnglish(parsed.brand || "לא ידוע");
        const newVehicle: Vehicle = {
          id: String(found.record._id ?? Date.now()),
          plate: String(found.record.mispar_rechev ?? plateTrimmed).toUpperCase(),
          name: vehicleName,
          model: parsed.model || "לא ידוע",
          engine: String(found.record.degem_manoa ?? found.record.engine_type ?? "לא ידוע"),
          type: found.type,
          avgConsumption: (parsed.fuelType === "Electric" || parsed.fuelType === "PHEV") ? kwhPerKm : avgConsumption,
          
          fueltype: parsed.fuelType, 
          year: parsed.year ?? new Date().getFullYear(),
          mishkal_kolel: parsed.mishkal_kolel,
        };

        if (__DEV__) {
          console.log(`\n✅ ${newVehicle.name} ${newVehicle.model} (${newVehicle.plate})
          ${newVehicle.avgConsumption} ${parsed.fuelType === "Electric" ? 'kWh/km' : 'km/L'} | ${newVehicle.year} | ${newVehicle.fueltype}`);
        }

        await saveVehicle(newVehicle);
        if (__DEV__) {
          console.log('Saved!\n');
        }

        setToastMessage(`✅ ${newVehicle.name} (${newVehicle.plate}) נוסף בהצלחה — סוג דלק: ${newVehicle.fueltype} — דגם: ${newVehicle.model}`);
        setTimeout(() => router.back(), 1400);

    } catch (error) {
      console.error('\n❌ ERROR in AddVehicleByPlate:', error);
      if (__DEV__) {
        console.log('╚════════════════════════════════════════════════════════╝\n');
      }
      setToastMessage("❌ אירעה שגיאה בעת הוספת הרכב");
    } finally {
      setLoading(false);
    }
  };

  const borderColor = focusAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['#d1d5db', '#009688'],
  });

  const shadowOpacity = focusAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.1, 0.25],
  });

  return (
    <View style={styles.mainContainer}>
      <KeyboardAvoidingView 
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        {/* Back Button - Fixed Position */}
        <TouchableOpacity 
          style={styles.backBtn} 
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <View style={styles.backBtnInner}>
            <Text style={styles.backBtnText}>←</Text>
          </View>
        </TouchableOpacity>

        {/* Scrollable Content */}
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.contentWrapper}>
            {/* Header Section */}
            <View style={styles.header}>
              <View style={styles.iconContainer}>
                <View style={styles.iconCircle}>
                  <Text style={styles.iconText}>🚗</Text>
                </View>
              </View>
              <Text style={styles.title}>זיהוי אוטומטי של רכב</Text>
              <Text style={styles.subtitle}>הזן מספר רישוי לאיתור מיידי ממאגרי הממשלה</Text>
            </View>

            {/* Toast */}
            {toastMessage && <Toast message={toastMessage} onHide={() => setToastMessage(null)} />}

            {/* Main Content Card */}
            <View style={styles.card}>
              {/* License Plate Input */}
              <View style={styles.inputSection}>
                <Text style={styles.inputLabel}>מספר רישוי</Text>
                <Animated.View
                  style={[
                    styles.inputWrapper,
                    {
                      borderColor,
                      shadowOpacity,
                    },
                  ]}
                >
                  <View style={styles.plateFrame}>
                    <View style={styles.plateInner}>
                      <TextInput
                        style={styles.input}
                        placeholder="12-345-67"
                        placeholderTextColor="#9ca3af"
                        keyboardType="numeric"
                        value={plate}
                        onChangeText={setPlate}
                        autoCapitalize="characters"
                        onFocus={handleFocus}
                        onBlur={handleBlur}
                        editable={!loading}
                      />
                    </View>
                  </View>
                </Animated.View>
                <Text style={styles.inputHint}>תתבצע חיפוש אוטומטי במאגרי רכב, אופנוע ומשאית</Text>
              </View>

              {/* Search Button */}
              <TouchableOpacity
                style={[styles.searchBtn, loading && styles.searchBtnDisabled]}
                onPress={handleAddVehicleByPlate}
                disabled={loading || !plate.trim()}
                activeOpacity={0.85}
              >
                {loading ? (
                  <Animated.View style={[styles.searchBtnContent, { transform: [{ scale: pulseAnim }] }]}>
                    <ActivityIndicator color="#fff" size="small" />
                    <Text style={styles.searchBtnText}>מאתר רכב...</Text>
                  </Animated.View>
                ) : (
                  <View style={styles.searchBtnContent}>
                    <Text style={styles.searchBtnIcon}>✨</Text>
                    <Text style={styles.searchBtnText}>חפש והוסף אוטומטית</Text>
                  </View>
                )}
              </TouchableOpacity>

              {/* Features List */}
              <View style={styles.featuresContainer}>
                <FeatureItem icon="🔍" text="זיהוי מיידי מבסיס נתונים ממשלתי" />
                <FeatureItem icon="⚡" text="ניתוח אוטומטי של סוג דלק וצריכה" />
                <FeatureItem icon="📊" text="חישוב חכם של יעילות הרכב" />
              </View>
            </View>

            {/* Trust Badge */}
            <View style={styles.trustBadge}>
              <Text style={styles.trustBadgeText}>🔒 נתונים מאומתים ממשרד התחבורה</Text>
            </View>

            {/* Bottom Spacer */}
            <View style={{ height: 40 }} />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Banner Ad at the bottom (Hidden when keyboard is open) */}
      <View style={[
        styles.adContainer, 
        { 
          paddingBottom: Math.max(insets.bottom + 10, 16),
          display: isKeyboardVisible ? 'none' : 'flex'
        }
      ]}>
        <AdBanner style={styles.bottomBanner} />
      </View>
    </View>
  );
}

// Feature Item Component
function FeatureItem({ icon, text }: { icon: string; text: string }) {
  return (
    <View style={styles.featureItem}>
      <Text style={styles.featureIcon}>{icon}</Text>
      <Text style={styles.featureText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  mainContainer: {
    flex: 1,
    backgroundColor: '#f0f9ff',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: 20,
    ...Platform.select({
      web: {
        alignItems: 'center',
      },
    }),
  },
  contentWrapper: {
    width: '100%',
    maxWidth: MAX_WIDTH,
    paddingHorizontal: 20,
    ...Platform.select({
      web: {
        alignSelf: 'center',
      },
    }),
  },
  backBtn: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 50 : 30,
    left: 20,
    zIndex: 10,
  },
  backBtnInner: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  backBtnText: {
    fontSize: 24,
    color: '#374151',
    fontWeight: '600',
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
    marginTop: 20,
  },
  iconContainer: {
    marginBottom: 16,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#009688',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 5,
    borderWidth: 3,
    borderColor: '#e0f2f1',
  },
  iconText: {
    fontSize: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1f2937',
    textAlign: 'center',
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 15,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 20,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
    marginBottom: 20,
  },
  inputSection: {
    marginBottom: 24,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 12,
    textAlign: 'right',
  },
  inputWrapper: {
    borderRadius: 16,
    borderWidth: 2,
    backgroundColor: '#f9fafb',
    shadowColor: '#009688',
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 8,
    elevation: 2,
    overflow: 'hidden',
  },
  plateFrame: {
    padding: 4,
  },
  plateInner: {
    backgroundColor: '#fff',
    borderRadius: 12,
    overflow: 'hidden',
  },
  input: {
    padding: 18,
    fontSize: 24,
    fontWeight: '700',
    color: '#1f2937',
    textAlign: 'center',
    letterSpacing: 2,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  inputHint: {
    fontSize: 13,
    color: '#9ca3af',
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 18,
  },
  searchBtn: {
    backgroundColor: '#009688',
    borderRadius: 16,
    paddingVertical: 18,
    paddingHorizontal: 24,
    shadowColor: '#009688',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
    marginBottom: 24,
  },
  searchBtnDisabled: {
    opacity: 0.7,
  },
  searchBtnContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  searchBtnIcon: {
    fontSize: 20,
  },
  searchBtnText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    letterSpacing: 0.3,
  },
  featuresContainer: {
    gap: 12,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 8,
  },
  featureIcon: {
    fontSize: 20,
  },
  featureText: {
    fontSize: 14,
    color: '#6b7280',
    flex: 1,
    textAlign: 'right',
    lineHeight: 20, 
  },
  trustBadge: {
    backgroundColor: '#e0f2f1',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#b2dfdb',
  },
  trustBadgeText: {
    fontSize: 13,
    color: '#00695c',
    fontWeight: '600',
    textAlign: 'center',
  },
  adContainer: {
    width: '100%',
    alignItems: 'center',
    backgroundColor: '#f0f9ff',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  bottomBanner: {
    ...Platform.select({
      web: {
        maxWidth: MAX_WIDTH,
        alignSelf: 'center',
        width: '100%',
      },
    }),
  },
});