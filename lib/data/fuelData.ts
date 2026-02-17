
// lib/data/fuelData.ts

// ============================================================================
// FETCH WITH TIMEOUT - Network protection
// ============================================================================

/**
 * Fetch with timeout protection
 * Prevents indefinite hangs on slow networks
 */
const fetchWithTimeout = async (
  url: string,
  options?: RequestInit,
  timeout = 10000
): Promise<Response> => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('Request timeout - please check your internet connection');
    }
    throw error;
  }
};

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

/**
 * Type definition for fallback API response
 */
export interface FallbackVehicleData {
  mishkal_kolel?: number;   // Gross weight (kg)
  nefach_manoa?: number;    // Engine CC
  shnat_yitzur?: number;    // Year
  tozeret_nm?: string;      // Brand name
  degem_nm?: string;        // Model name
  sug_delek_nm?: string;    // Fuel type
}

/**
 * Vehicle type for calculations
 */
type VehicleType = 'motorcycle' | 'car' | 'truck';

// ============================================================================
// CONSTANTS
// ============================================================================

// Fallback APIs for missing vehicle data
// Weight API - כלי רכב שירדו מהכביש ובסטטוס ביטול סופי
const WEIGHT_API_RESOURCE_ID = '851ecab1-0622-4dbe-a6c7-f950cf82abf9';
// Engine CC API - כלי רכב ביבוא אישי
const ENGINE_CC_API_RESOURCE_ID = '03adc637-b6fe-402b-9937-7c3d3afc9140';
const DATA_GOV_IL_BASE = 'https://data.gov.il/api/3/action/datastore_search';

// Aerodynamic parameters by vehicle type
const AERO_PARAMS: Record<VehicleType, { Cd: number; A: number; Crr: number }> = {
  motorcycle: { Cd: 0.50, A: 0.6, Crr: 0.010 },
  car: { Cd: 0.30, A: 2.4, Crr: 0.009 },
  truck: { Cd: 0.38, A: 3.0, Crr: 0.011 },
};

// Engine thermal efficiency - base values for reference years
const THERMAL_EFFICIENCY_BASE = {
  gasoline: {
    baseYear: 2026,           // שנת בסיס (השנה הנוכחית)
    baseEfficiency: 0.36,     // יעילות מקסימלית למנועי בנזין מודרניים
    degradationPerYear: 0.003, // ירידה של 0.3% יעילות לכל שנה אחורה
    minEfficiency: 0.26,      // יעילות מינימלית (רכבים ישנים מאוד)
  },
  diesel: {
    baseYear: 2026,           // שנת בסיס (השנה הנוכחית)
    baseEfficiency: 0.42,     // יעילות מקסימליתני דיזל מודרניים
    degradationPerYear: 0.0025, // דיזל מתדרדר לאט יותר (0.25% לשנה)
    minEfficiency: 0.32,      // יעילות מינימלית
  },
};

// Fuel energy content (MJ/L)
const FUEL_ENERGY_MJ: Record<string, number> = {
  diesel: 38.6,
  gasoline: 34.2,
};

// Consumption bounds by vehicle type (km/L)
const CONSUMPTION_BOUNDS: Record<VehicleType, { min: number; max: number }> = {
  motorcycle: { min: 15, max: 50 },
  car: { min: 6, max: 25 },
  truck: { min: 3, max: 12 },
};

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Safe integer parsing (returns undefined on invalid input)
 */
function parseIntSafe(value: any): number | undefined {
  if (value === null || value === undefined || value === '') {
    return undefined;
  }
  const parsed = parseInt(value, 10);
  if (isNaN(parsed)) {
    return undefined;
  }
  return parsed;
}

/**
 * Safe float parsing (returns undefined on invalid input)
 */
function parseFloatSafe(value: any): number | undefined {
  if (value === null || value === undefined || value === '') {
    return undefined;
  }
  const parsed = parseFloat(value);
  if (isNaN(parsed)) {
    return undefined;
  }
  return parsed;
}

/**
 * Extract, validate, and average numeric values from API records
 *
 * This helper reduces code duplication in fetchWeightFromAPI and fetchEngineCCFromAPI
 * by centralizing the common pattern of:
 * 1. Extracting a field from multiple records
 * 2. Parsing values using a safe parser
 * 3. Filtering values within a valid range
 * 4. Calculating the rounded average
 *
 * @param records - Array of API records to process
 * @param fieldName - Field name to extract from each record (e.g., 'mishkal_kolel', 'nefach_manoa')
 * @param min - Minimum valid value (inclusive) - values below are filtered out
 * @param max - Maximum valid value (inclusive) - values above are filtered out
 * @param parser - Parser function to convert raw values (parseIntSafe or parseFloatSafe)
 * @returns Averaged value (rounded) or undefined if no valid values found
 */
function extractAndAverageField(
  records: Record<string, any>[],
  fieldName: string,
  min: number,
  max: number,
  parser: (value: any) => number | undefined
): number | undefined {
  // Step 1: Extract and parse values from records
  // Step 2: Filter to only valid numbers within the specified range
  const values = records
    .map(r => parser(r[fieldName]))
    .filter((v): v is number => v !== undefined && v >= min && v <= max);

  // Step 3: Calculate average if we have valid values
  if (values.length > 0) {
    const avg = Math.round(values.reduce((a, b) => a + b, 0) / values.length);

    if (__DEV__) {
      console.log(`   📊 extractAndAverageField: Found ${values.length} valid ${fieldName} values`);
      console.log(`   Values: [${values.join(', ')}]`);
      console.log(`   Average (rounded): ${avg}`);
    }

    return avg;
  }

  if (__DEV__) {
    console.log(`   ⚠️  extractAndAverageField: No valid ${fieldName} values in range [${min}, ${max}]`);
  }

  return undefined;
}

/**
 * Calculate vehicle thermal efficiency based on year and fuel type
 */
function getThermalEfficiency(year: number | undefined, fuelType: 'Gasoline' | 'Diesel'): number {
  const fuel = fuelType.toLowerCase() as 'gasoline' | 'diesel';
  const config = THERMAL_EFFICIENCY_BASE[fuel];

  if (__DEV__) {
    console.log(`\n   🔬 Thermal Efficiency Calculation (${fuelType})`);
    console.log(`   Base year: ${config.baseYear}`);
    console.log(`   Base efficiency: ${(config.baseEfficiency * 100).toFixed(2)}%`);
    console.log(`   Degradation per year: ${(config.degradationPerYear * 100).toFixed(2)}%`);
    console.log(`   Min efficiency: ${(config.minEfficiency * 100).toFixed(2)}%`);
  }

  // אם אין שנה - נחזיר ברירת מחדל (רכב בן 10 שנים)
  if (!year) {
    const defaultYear = config.baseYear - 10;
    const yearsDiff = config.baseYear - defaultYear;
    const efficiency = Math.max(
      config.minEfficiency,
      config.baseEfficiency - (yearsDiff * config.degradationPerYear)
    );

    if (__DEV__) {
      console.log(`   ⚠️  No year provided - using default (10 years old)`);
      console.log(`   Default year: ${defaultYear}`);
      console.log(`   Degradation: ${yearsDiff} years × ${(config.degradationPerYear * 100).toFixed(2)}% = -${(yearsDiff * config.degradationPerYear * 100).toFixed(2)}%`);
      console.log(`   → Result: ${(efficiency * 100).toFixed(2)}%`);
    }

    return efficiency;
  }

  // חישוב הפרש שנים מהשנה הבסיסית
  const yearsDiff = config.baseYear - year;

  // אם הרכב חדש יותר משנת הבסיס - תיתן את היעילות המקסימלית
  if (yearsDiff <= 0) {
    if (__DEV__) {
      console.log(`   Vehicle year: ${year} (newer or equal to base year)`);
      console.log(`   → Using maximum efficiency: ${(config.baseEfficiency * 100).toFixed(2)}%`);
    }
    return config.baseEfficiency;
  }

  // חישוב יעילות: יעילות_בסיס - (שנים_אחורה × ירידה_לשנה)
  const calculatedEfficiency = config.baseEfficiency - (yearsDiff * config.degradationPerYear);
  const finalEfficiency = Math.max(config.minEfficiency, calculatedEfficiency);
  const isAtMinimum = finalEfficiency === config.minEfficiency;

  if (__DEV__) {
    console.log(`   Vehicle year: ${year}`);
    console.log(`   Years difference: ${yearsDiff} years`);
    console.log(`   Degradation: ${yearsDiff} × ${(config.degradationPerYear * 100).toFixed(2)}% = -${(yearsDiff * config.degradationPerYear * 100).toFixed(2)}%`);
    console.log(`   Calculated efficiency: ${(calculatedEfficiency * 100).toFixed(2)}%`);
    if (isAtMinimum) {
      console.log(`   ⚠️  Capped at minimum: ${(config.minEfficiency * 100).toFixed(2)}%`);
    }
    console.log(`   → Final efficiency: ${(finalEfficiency * 100).toFixed(2)}%`);
  }

  // החזרת היעילות עם הגבלה מינימלית
  return finalEfficiency;
}

// ============================================================================
// FALLBACK API FUNCTIONS
// ============================================================================

/**
 * Query a data.gov.il API with filters
 * @param resourceId - The API resource ID
 * @param filters - Query filters
 * @param limit - Maximum number of records to return
 * @returns Array of matching records
 */
async function queryDataGovAPI(
  resourceId: string,
  filters: Record<string, any>,
  limit: number = 10
): Promise<Record<string, any>[]> {
  try {
    const filtersJson = JSON.stringify(filters);
    const url = `${DATA_GOV_IL_BASE}?resource_id=${resourceId}&filters=${encodeURIComponent(filtersJson)}&limit=${limit}`;

    if (__DEV__) {  
      console.log(`   🔍 Querying fallback API with filters:`, filters);
      console.log(`   📡 URL:`, url);
    }

    const response = await fetchWithTimeout(url, undefined, 10000);

    if (!response.ok) {
      if (__DEV__) {
        console.log(`   ❌ Fallback API returned status: ${response.status}`);
      }
      return [];
    }

    const json = await response.json();
    const records = json?.result?.records || [];

    if (__DEV__) {
      console.log(`   📊 Found ${records.length} matching records`);
    }

    return records;
  } catch (error) {
    if (__DEV__) {
      console.error(`   ❌ Fallback API query failed:`, error);
    }
    return [];
  }
}

/**
  * Fetch vehicle weight (mishkal_kolel) from ביטול סופי API
 */
async function fetchWeightFromAPI(params: {
  brand?: string;
  model?: string;
  plateNumber?: string;
  degem_nm?: string;
}): Promise<number | undefined> {
  const { brand, model, degem_nm } = params;

  if (__DEV__) {
    console.log('\n   📦 WEIGHT API (ביטול סופי)');
    console.log(`   🔍 Search parameters: degem_nm="${degem_nm || 'N/A'}", brand="${brand || 'N/A'}", model="${model || 'N/A'}"`);
  }

  // ========================================
  // STRATEGY 0: degem_nm ONLY (HIGHEST PRIORITY)
  // ========================================
  if (degem_nm) {
    if (__DEV__) {
      console.log(`\n   📌 STRATEGY 0: Searching by degem_nm="${degem_nm}" ONLY`);
    }

    const records = await queryDataGovAPI(WEIGHT_API_RESOURCE_ID, {
      degem_nm: degem_nm,
    }, 20);

    if (records.length > 0) {
      const avgWeight = extractAndAverageField(
        records,
        'mishkal_kolel',
        500,    // min: 500kg
        10000,  // max: 10000kg
        parseFloatSafe
      );

      if (avgWeight !== undefined) {
        if (__DEV__) {
          console.log(`   ✅ SUCCESS: Found weight for degem_nm "${degem_nm}"`);
          console.log(`   Average weight: ${avgWeight}kg`);
        }
          const curb = Math.round(avgWeight * 0.9); // GVW → curb
          return curb;
      }
    }

    if (__DEV__) {
      console.log(`   ❌ No valid weight found for degem_nm "${degem_nm}"`);
    }
  }

  // Strategy 1: brand + model (NO YEAR FILTER - to get more results)
  if (brand && model) {
    if (__DEV__) {
      console.log(`\n   📌 STRATEGY 1: Searching by brand + model (no year filter)`);
    }

    const records = await queryDataGovAPI(WEIGHT_API_RESOURCE_ID, {
      tozeret_nm: brand,
      degem_nm: model,
    }, 20);

    if (records.length > 0) {
      const avgWeight = extractAndAverageField(
        records,
        'mishkal_kolel',
        500,    // min: 500kg (reasonable minimum vehicle weight)
        10000,  // max: 10000kg (reasonable maximum vehicle weight)
        parseFloatSafe
      );

      if (avgWeight !== undefined) {
        if (__DEV__) {
          console.log(`   ✅ SUCCESS: Found weight for ${brand} ${model}`);
          console.log(`   Average weight: ${avgWeight}kg`);
        }
        return avgWeight;
      }
    }

    if (__DEV__) {
      console.log(`   ❌ No valid weight found for ${brand} ${model}`);
    }
  }

  return undefined;
}

/**
 * Fetch engine CC (nefach_manoa) from יבוא אישי API
 * Searches by degem_manoa (engine code) or kinuy_mishari (commercial name)
 */
async function fetchEngineCCFromAPI(params: {
  engineCode?: string;
  brand?: string;
  model?: string;
  kinuyMishari?: string;
  degem_nm?: string;
}): Promise<number | undefined> {
  const { engineCode, brand, model, kinuyMishari, degem_nm } = params;

  if (__DEV__) {
    console.log('\n   🔧 ENGINE CC API (יבוא אישי)');
    console.log(`   🔍 Search parameters:`, { engineCode, brand, model, kinuyMishari, degem_nm });
  }

  // ========================================
  // STRATEGY 0: degem_nm ONLY (NEW - HIGHEST PRIORITY)
  // ========================================
  if (degem_nm) {
    if (__DEV__) {
      console.log(`\n   📌 STRATEGY 0: Searching by degem_nm="${degem_nm}"`);
    }

    const records = await queryDataGovAPI(ENGINE_CC_API_RESOURCE_ID, {
      degem_nm: degem_nm,
    }, 20);

    if (records.length > 0) {
      const avgCC = extractAndAverageField(
        records,
        'nefach_manoa',
        50,     // min: 50cc
        15000,  // max: 15000cc
        parseIntSafe
      );

      if (avgCC !== undefined) {
        if (__DEV__) {
          console.log(`   ✅ SUCCESS: Found CC for degem_nm "${degem_nm}"`);
          console.log(`   Average CC: ${avgCC}cc`);
        }
        return avgCC;
      }
    }

    if (__DEV__) {
      console.log(`   ❌ No valid CC found for degem_nm "${degem_nm}"`);
    }
  }

  // Strategy 1: Search by engine code (degem_manoa)
  if (engineCode) {
    if (__DEV__) {
      console.log(`\n   📌 STRATEGY 1: Searching by engine code (degem_manoa)`);
      console.log(`   Search term: "${engineCode}"`);
    }

    const records = await queryDataGovAPI(ENGINE_CC_API_RESOURCE_ID, {
      degem_manoa: engineCode,
    }, 10);

    if (records.length > 0) {
      const avgCC = extractAndAverageField(
        records,
        'nefach_manoa',
        50,     // min: 50cc (small motorcycles)
        15000,  // max: 15000cc (large trucks/heavy vehicles)
        parseIntSafe
      );

      if (avgCC !== undefined) {
        if (__DEV__) {
          console.log(`   ✅ SUCCESS: Found CC for engine code "${engineCode}"`);
          console.log(`   Average CC: ${avgCC}cc`);
        }
        return avgCC;
      }
    }

    if (__DEV__) {
      console.log(`   ❌ No valid CC found for engine code "${engineCode}"`);
    }
  }

  // Strategy 2: Search by kinuy_mishari (commercial name like "CIVIC TOURER")
  // Uses full-text search (q parameter) since kinuy_mishari is not indexed for exact filtering
  if (kinuyMishari) {
    if (__DEV__) {
      console.log(`\n   📌 STRATEGY 2: Searching by commercial name (kinuy_mishari)`);
      console.log(`   Search term: "${kinuyMishari}"`);
    }

    try {
      const url = `${DATA_GOV_IL_BASE}?resource_id=${ENGINE_CC_API_RESOURCE_ID}&q=${encodeURIComponent(kinuyMishari)}&limit=20`;

      if (__DEV__) {
        console.log(`   📡 Full-text search URL:`, url);
      }

      const response = await fetchWithTimeout(url, undefined, 10000);
      if (response.ok) {
        const json = await response.json();
        const records = json?.result?.records || [];

        if (records.length > 0) {
          const avgCC = extractAndAverageField(
            records,
            'nefach_manoa',
            50,     // min: 50cc (small motorcycles)
            15000,  // max: 15000cc (large trucks/heavy vehicles)
            parseIntSafe
          );

          if (avgCC !== undefined) {
            if (__DEV__) {
              console.log(`   ✅ SUCCESS: Found CC for kinuy_mishari "${kinuyMishari}"`);
              console.log(`   Average CC: ${avgCC}cc`);
            }
            return avgCC;
          }
        }

        if (__DEV__) {
          console.log(`   ❌ No valid CC found for kinuy_mishari "${kinuyMishari}"`);
        }
      }
    } catch (error) {
      if (__DEV__) {
        console.log(`   ❌ kinuy_mishari search failed:`, error);
      }
    }
  }

  // Strategy 3: Search by brand + model
  if (brand && model) {
    if (__DEV__) {
      console.log(`\n   📌 STRATEGY 3: Searching by brand + model`);
      console.log(`   Search terms: brand="${brand}", model="${model}"`);
    }

    const records = await queryDataGovAPI(ENGINE_CC_API_RESOURCE_ID, {
      tozeret_nm: brand,
      degem_nm: model,
    }, 20);

    if (records.length > 0) {
      const avgCC = extractAndAverageField(
        records,
        'nefach_manoa',
        50,     // min: 50cc (small motorcycles)
        15000,  // max: 15000cc (large trucks/heavy vehicles)
        parseIntSafe
      );

      if (avgCC !== undefined) {
        if (__DEV__) {
          console.log(`   ✅ SUCCESS: Found CC for ${brand} ${model}`);
          console.log(`   Average CC: ${avgCC}cc`);
        }
        return avgCC;
      }
    }

    if (__DEV__) {
      console.log(`   ❌ No valid CC found for ${brand} ${model}`);
    }
  }

  if (__DEV__) {
    console.log('\n   ❌ FAILED: No engine CC found from any strategy');
  }
  return undefined;
}

/**
 * Fetch vehicle data from TWO separate government APIs:
 * - Weight (mishkal_kolel) from ביטול סופי API
 * - Engine CC (nefach_manoa) from יבוא אישי API (searched by degem_manoa or kinuy_mishari)
 *
 * @param params - Search parameters from primary API
 * @returns Weight and engine CC data, or undefined
 */
export async function fetchFallbackVehicleData(params: {
  brand?: string;
  model?: string;
  year?: number;
  engineCode?: string;
  plateNumber?: string;
  kinuyMishari?: string;  // Commercial name from primary API (e.g., "CIVIC TOURER")
  degem_nm?: string;      // Vehicle model code from primary API (e.g., "FK28")
}): Promise<FallbackVehicleData | undefined> {
  const { brand, model, year, engineCode, plateNumber, kinuyMishari, degem_nm } = params;

  if (__DEV__) {
    console.log('\n🔄 FALLBACK APIs - Dual Search');
    console.log(`   degem_nm: ${degem_nm || 'N/A'}`);
    console.log(`   Brand: ${brand || 'N/A'}`);
    console.log(`   Model: ${model || 'N/A'}`);
    console.log(`   Year: ${year || 'N/A'}`);
    console.log(`   Engine Code: ${engineCode || 'N/A'}`);
    console.log(`   Kinuy Mishari: ${kinuyMishari || 'N/A'}`);
  }

  // Query both APIs in parallel for efficiency
  const [weight, engineCC] = await Promise.all([
    fetchWeightFromAPI({ brand, model, plateNumber, degem_nm }),
    fetchEngineCCFromAPI({ engineCode, brand, model, kinuyMishari, degem_nm }),
  ]);

  if (weight || engineCC) {
    const result: FallbackVehicleData = {};
    if (weight) result.mishkal_kolel = weight;
    if (engineCC) result.nefach_manoa = engineCC;

    if (__DEV__) {
      console.log(`\n   ✅ FALLBACK RESULT: weight=${weight || 'N/A'}kg, cc=${engineCC || 'N/A'}cc`);
    }
    return result;
  }

  if (__DEV__) {
    console.log('\n   ❌ No fallback data found');
  }
  return undefined;
}

// ============================================================================
// ADVANCED EV CONSUMPTION CALCULATION - PHYSICS-BASED MODEL
// ============================================================================

/**
 * Vehicle body type categories for aerodynamic estimation
 */
type VehicleBodyType = 'compact_sedan' | 'sedan' | 'suv' | 'crossover' | 'truck' | 'van' | 'sport';

/**
 * Aerodynamic data for vehicle energy calculation
 */
interface AeroData {
  dragCoefficient: number;  // Cd (dimensionless)
  frontalArea: number;      // A (m²)
  rollingResistance: number; // Crr (dimensionless)
}

/**
 * Estimates vehicle body type from weight
 * @param weight - Vehicle weight in kg
 * @returns Estimated body type
 */
function estimateBodyType(weight: number): VehicleBodyType {
  if (weight < 1300) return 'compact_sedan';
  if (weight < 1600) return 'sedan';
  if (weight < 1900) return 'crossover';
  if (weight < 2400) return 'suv';
  if (weight < 3000) return 'van';
  return 'truck';
}

/**
 * Estimates aerodynamic parameters based on vehicle characteristics
 * Uses real-world data from EPA and WLTP tests
 *
 * @param weight - Vehicle weight in kg
 * @param year - Manufacturing year (newer = better aero)
 * @returns Aerodynamic coefficients
 */
function estimateAeroData(weight: number, year: number): AeroData {
  const bodyType = estimateBodyType(weight);

  // Base aerodynamic values by vehicle type (2020 baseline)
  const baseAero: Record<VehicleBodyType, AeroData> = {
    compact_sedan: { dragCoefficient: 0.28, frontalArea: 2.2, rollingResistance: 0.008 },
    sedan: { dragCoefficient: 0.30, frontalArea: 2.4, rollingResistance: 0.009 },
    crossover: { dragCoefficient: 0.32, frontalArea: 2.6, rollingResistance: 0.010 },
    suv: { dragCoefficient: 0.35, frontalArea: 2.8, rollingResistance: 0.011 },
    van: { dragCoefficient: 0.36, frontalArea: 3.0, rollingResistance: 0.011 },
    truck: { dragCoefficient: 0.40, frontalArea: 3.2, rollingResistance: 0.012 },
    sport: { dragCoefficient: 0.25, frontalArea: 2.1, rollingResistance: 0.009 },
  };

  let aero = { ...baseAero[bodyType] };

  // Aerodynamic improvements over time (modern EVs have better Cd)
  const yearsSince2020 = Math.max(0, year - 2020);
  const aeroImprovement = yearsSince2020 * 0.005; // 0.5% improvement per year
  aero.dragCoefficient *= (1 - aeroImprovement);

  // Modern tires have lower rolling resistance
  const tiresImprovement = yearsSince2020 * 0.003; // 0.3% improvement per year
  aero.rollingResistance *= (1 - tiresImprovement);

  return aero;
}

/**
 * Advanced EV energy consumption calculation using physics-based model
 *
 * @param params - Configuration object
 * @param params.mishkal_kolel - Gross vehicle weight (kg) - OPTIONAL
 * @param params.year - Manufacturing year - OPTIONAL
 * @returns Energy consumption with floating point precision fixed
 */
export function calculateEVConsumptionEnhanced(params: {
  mishkal_kolel?: number;
  // misgeret removed - not reliable
  year?: number;
}): { kwhPer100Km: number; kmPerKwh: number } {

  // STEP 1: DETERMINE EFFECTIVE OPERATING WEIGHT
  const effectiveWeight = getEffectiveWeight(params.mishkal_kolel);
  const year = params.year || new Date().getFullYear();

  // Default to typical compact EV if no weight data (e.g., Nissan Leaf, BYD Dolphin)
  const weight = effectiveWeight || 1600;

  if (__DEV__) {
    console.log(`\n⚡ ADVANCED EV CALCULATION`);
    console.log(`   Weight: ${weight}kg (${effectiveWeight ? 'measured' : 'estimated'})`);
    console.log(`   Year: ${year}`);
  }

  // STEP 2: ESTIMATE AERODYNAMIC CHARACTERISTICS
  const aero = estimateAeroData(weight, year);

  if (__DEV__) {
    console.log(`   Body Type: ${estimateBodyType(weight)}`);
    console.log(`   Drag Coefficient (Cd): ${aero.dragCoefficient.toFixed(3)}`);
    console.log(`   Frontal Area: ${aero.frontalArea.toFixed(2)} m²`);
    console.log(`   Rolling Resistance: ${aero.rollingResistance.toFixed(4)}`);
  }

  // STEP 3: PHYSICS-BASED ENERGY CALCULATION
  const AIR_DENSITY = 1.225; // kg/m³ at sea level, 15°C
  const GRAVITY = 9.81; // m/s²
  const AVG_SPEED_KMH = 50; // Mixed city/highway driving
  const AVG_SPEED_MS = AVG_SPEED_KMH / 3.6; // Convert to m/s

  // Component 1: Rolling Resistance Energy
  const rollingEnergyMJ = aero.rollingResistance * weight * GRAVITY * 100000 / 1000000;
  const rollingEnergyKwh = rollingEnergyMJ / 3.6;

  // Component 2: Aerodynamic Drag Energy
  const dragPower = 0.5 * aero.dragCoefficient * aero.frontalArea * AIR_DENSITY * Math.pow(AVG_SPEED_MS, 3);
  const timeHours = 100 / AVG_SPEED_KMH;
  const dragEnergyKwh = (dragPower * timeHours * 3600) / 1000 / 3600;

  // Component 3: Acceleration/Deceleration Energy
  const accelerationEnergyKwh = (weight / 1000) * 4.5;

  // Component 4: Auxiliary systems
  const auxiliaryEnergyKwh = 1.0;

  if (__DEV__) {
    console.log(`\n   Energy Components (at wheels):`);
    console.log(`   - Rolling Resistance: ${rollingEnergyKwh.toFixed(2)} kWh/100km`);
    console.log(`   - Aerodynamic Drag: ${dragEnergyKwh.toFixed(2)} kWh/100km`);
    console.log(`   - Acceleration Cycles: ${accelerationEnergyKwh.toFixed(2)} kWh/100km`);
    console.log(`   - Auxiliary Systems: ${auxiliaryEnergyKwh.toFixed(2)} kWh/100km`);
  }

  let totalEnergyKwh = rollingEnergyKwh + dragEnergyKwh + accelerationEnergyKwh + auxiliaryEnergyKwh;

  // STEP 4: APPLY SYSTEM EFFICIENCY & REGENERATIVE BRAKING
  const SYSTEM_EFFICIENCY = 0.84;
  const energyFromBattery = totalEnergyKwh / SYSTEM_EFFICIENCY;

  const REGEN_RECOVERY = 0.20;
  totalEnergyKwh = energyFromBattery * (1 - REGEN_RECOVERY);

  if (__DEV__) {
    console.log(`   - After System Losses: ${energyFromBattery.toFixed(2)} kWh/100km`);
    console.log(`   - After Regen Recovery (${(REGEN_RECOVERY * 100).toFixed(0)}%): ${totalEnergyKwh.toFixed(2)} kWh/100km`);
  }

  // STEP 5: BATTERY DEGRADATION ADJUSTMENT
  const currentYear = new Date().getFullYear();
  const vehicleAge = Math.max(0, currentYear - year);
  const degradationPercent = Math.min(vehicleAge / 10, 1.0) * 0.10;
  totalEnergyKwh *= (1 + degradationPercent);

  if (__DEV__ && vehicleAge > 0) {
    console.log(`   - Battery Degradation (${vehicleAge}y): +${(degradationPercent * 100).toFixed(1)}%`);
  }

  // STEP 6: APPLY REALISTIC BOUNDS & FIX PRECISION
  let kwhPer100Km = Math.max(12, Math.min(35, totalEnergyKwh));
  kwhPer100Km = parseFloat(kwhPer100Km.toFixed(2));
  const kwhPerKm = parseFloat((kwhPer100Km / 100).toFixed(4));
  const kmPerKwh = parseFloat((100 / kwhPer100Km).toFixed(2));

  if (__DEV__) {
    console.log(`\n   ✅ FINAL RESULT: ${kwhPer100Km} kWh/100km (${kmPerKwh} km/kWh)`);
    console.log(`   kWh/km: ${kwhPerKm} (for AddVehicleByPlate compatibility)\n`);
  }

  return {
    kwhPer100Km,
    kmPerKwh,
  };
}

/**
 * Extract effective operational weight from mishkal_kolel (gross weight)
 *
 * SIMPLIFIED STRATEGY:
 * - Israeli API's 'misgeret' field is unreliable (contains VIN codes)
 * - Use only mishkal_kolel and convert using accurate 0.85 multiplier
 * - If no API data: return undefined (will trigger estimation by brand/model)
 *
 * @param mishkal_kolel - Gross vehicle weight (kg) from API
 * @param misgeret - DEPRECATED: Not used (kept for backward compatibility)
 * @returns Effective operational weight in kg, or undefined if no weight data
 */
export function getEffectiveWeight(
  mishkal_kolel?: number,
  _misgeret?: number
): number | undefined {

  if (mishkal_kolel) {
    const effectiveWeight = mishkal_kolel * 0.9;
    
    if (__DEV__) {
      console.log(`📐 Weight calculation: ${mishkal_kolel}kg × 0.95 = ${effectiveWeight.toFixed(0)}kg`);
    }

    return Math.round(effectiveWeight);
  }

  return undefined;
}

// ============================================================================
// ADVANCED ICE CONSUMPTION CALCULATION - PHYSICS-BASED MODEL
// ============================================================================

/**
 * Calculate ICE fuel consumption using comprehensive physics-based model
 *
 * FORMULA BREAKDOWN:
 * Total Energy = Rolling Resistance + Aerodynamic Drag + Acceleration Energy
 *
 * 1. ROLLING RESISTANCE ENERGY:
 *    E_rolling = Crr × mass × gravity × distance
 *
 * 2. AERODYNAMIC DRAG ENERGY:
 *    E_drag = 0.5 × Cd × A × ρ × v² × distance
 *
 * 3. ACCELERATION ENERGY:
 *    E_accel = (mass / 1000) × empirical_factor
 *
 * @param params - Configuration object
 * @returns Fuel efficiency in km/L
 */
export function calculateICEConsumptionEnhanced(params: {
  mishkal_kolel?: number;
  // misgeret removed - not reliable in Israeli API
  engineCC?: number;
  year?: number;
  fuelType: 'Gasoline' | 'Diesel';
  vehicleType?: VehicleType;
}): number {
  const { fuelType, vehicleType = 'car' } = params;

  if (__DEV__) {
    console.log('\n🔧 ADVANCED ICE PHYSICS CALCULATION');
    console.log('═══════════════════════════════════════');
  }

  // ============================================
  // STEP 1: DETERMINE EFFECTIVE WEIGHT
  // ============================================
  const effectiveWeight = getEffectiveWeight(params.mishkal_kolel);

  // Default weights by vehicle type
  const defaultWeights: Record<VehicleType, number> = {
    motorcycle: 200,
    car: 1500,
    truck: 3500,
  };

  const weight = effectiveWeight || defaultWeights[vehicleType];

  if (__DEV__) {
    console.log(`\n📊 STEP 1: Weight Determination`);
    console.log(`   mishkal_kolel: ${params.mishkal_kolel || 'N/A'}kg`);
    console.log(`   Effective weight: ${weight}kg (${effectiveWeight ? 'calculated' : 'default'})`);
    console.log(`   Vehicle type: ${vehicleType}`);
  }

  // ============================================
  // STEP 2: DETERMINE ENGINE CC
  // ============================================
  // Estimate engineCC if missing - based on weight
  // Typical ratio: 1500kg vehicle ≈ 1350cc engine
  let estimatedCC: number;
  let ccSource: string;

  if (params.engineCC && params.engineCC > 0) {
    estimatedCC = params.engineCC;
    ccSource = 'from API/Database';
  } else {
    estimatedCC = Math.round(weight * 0.9);
    ccSource = `estimated from weight (${weight}kg × 0.9)`;
  }

  if (__DEV__) {
    console.log(`\n📊 STEP 2: Engine CC Determination`);
    console.log(`   Provided CC from API: ${params.engineCC || 'N/A'}cc`);
    if (!params.engineCC || params.engineCC <= 0) {
      console.log(`   ⚠️  No valid CC from API - using estimation`);
      console.log(`   Estimation formula: weight × 0.9`);
      console.log(`   Calculation: ${weight}kg × 0.9 = ${estimatedCC}cc`);
    }
    console.log(`   ✅ Final CC: ${estimatedCC}cc (${ccSource})`);
  }

  // ============================================
  // STEP 3: GET AERODYNAMIC PARAMETERS
  // ============================================
  const aero = AERO_PARAMS[vehicleType];

  if (__DEV__) {
    console.log(`\n📊 STEP 3: Aerodynamic Parameters`);
    console.log(`   Drag coefficient (Cd): ${aero.Cd}`);
    console.log(`   Frontal area (A): ${aero.A} m²`);
    console.log(`   Rolling resistance (Crr): ${aero.Crr}`);
  }

  // ============================================
  // STEP 4: PHYSICS-BASED ENERGY CALCULATION
  // ============================================
  const AIR_DENSITY = 1.225; // kg/m³
  const GRAVITY = 9.81; // m/s²
  const DISTANCE = 100000; // 100 km in meters

  // Average speed varies by vehicle type
  const avgSpeedKmh: Record<VehicleType, number> = {
    motorcycle: 60,
    car: 50,
    truck: 45,
  };
  const avgSpeedMs = avgSpeedKmh[vehicleType] / 3.6;

  // Rolling Resistance Energy (MJ/100km)
  const rollingEnergyMJ = (aero.Crr * weight * GRAVITY * DISTANCE) / 1000000;

  // Aerodynamic Drag Energy (MJ/100km)
  // E = 0.5 × Cd × A × ρ × v² × distance
  const dragEnergyMJ = (0.5 * aero.Cd * aero.A * AIR_DENSITY * Math.pow(avgSpeedMs, 2) * DISTANCE) / 1000000;

  // Acceleration energy calibrated from real-world driving data
  // Accounts for: multiple cycles, kinetic energy, braking losses, drivetrain friction
  // Values derived from EPA/WLTP test cycle analysis
  const accelFactor: Record<VehicleType, number> = {
    motorcycle: 8.5,   // Lighter vehicle, more aggressive riding style, frequent stops
    car: 12.0,         // Mixed urban/highway driving, moderate acceleration
    truck: 10.0,       // Heavier vehicle, fewer stops, gentler acceleration
  };
  const accelerationEnergyMJ = (weight / 1000) * accelFactor[vehicleType];

  // Auxiliary systems power consumption
  // ICE vehicles consume extra fuel for: alternator, A/C, power steering, water pump, oil pump
  // Typical range: 10-15% of mechanical energy
  const auxiliaryFactor: Record<VehicleType, number> = {
    motorcycle: 0.08,  // Minimal accessories (lights, ignition)
    car: 0.12,         // Full accessories (A/C, alternator, power steering, etc.)
    truck: 0.15,       // Heavy-duty accessories (air brakes, larger alternator)
  };
  const auxiliaryEnergyMJ = (rollingEnergyMJ + dragEnergyMJ + accelerationEnergyMJ) * auxiliaryFactor[vehicleType];

  const totalEnergyMJ = rollingEnergyMJ + dragEnergyMJ + accelerationEnergyMJ + auxiliaryEnergyMJ;

  if (__DEV__) {
    console.log(`\n📊 STEP 4: Energy Components (MJ/100km)`);
    console.log(`   Rolling resistance: ${rollingEnergyMJ.toFixed(2)} MJ`);
    console.log(`   Aerodynamic drag: ${dragEnergyMJ.toFixed(2)} MJ`);
    console.log(`   Acceleration: ${accelerationEnergyMJ.toFixed(2)} MJ`);
    console.log(`   Auxiliary systems: ${auxiliaryEnergyMJ.toFixed(2)} MJ`);
    console.log(`   Total at wheels: ${totalEnergyMJ.toFixed(2)} MJ`);
  }

  // ============================================
  // STEP 5: GET THERMAL EFFICIENCY
  // ============================================
  const baseEfficiency = getThermalEfficiency(params.year, fuelType);

  if (__DEV__) {
  const BASE_YEAR = 2026;
  const DEG_PER_YEAR = fuelType === 'Diesel' ? 0.25 : 0.30;

  console.log(`\n📊 STEP 5: Thermal Efficiency (חישוב שנתי רציף)`);
  console.log(`   Year: ${params.year || 'N/A'}`);
  console.log(`   Fuel type: ${fuelType}`);
  console.log(`   Base efficiency: ${(baseEfficiency * 100).toFixed(2)}%`);
  if (params.year) {
    const yearsDiff = BASE_YEAR - params.year;
    if (yearsDiff > 0) {
      console.log(`   Years old: ${yearsDiff} → Efficiency degradation: -${(yearsDiff * DEG_PER_YEAR).toFixed(2)}%`);
    }
  }
}

  // ============================================
  // STEP 6: POWER-TO-WEIGHT RATIO ADJUSTMENT
  // ============================================
  const expectedCC = weight * 0.9; // Expected ratio
  const ccRatio = estimatedCC / expectedCC;

  let efficiencyMultiplier = 1.0;
  let adjustmentReason = 'Optimal engine-to-weight ratio';

  if (ccRatio > 1.3) {
    // Oversized engine (sport car) - less efficient due to excess power
    efficiencyMultiplier = 0.95;
    adjustmentReason = 'Oversized engine penalty (-5%)';
  } else if (ccRatio < 0.8) {
    // Undersized engine (eco/turbo)
    if (params.year && params.year >= 2015) {
      // Modern turbos are efficient
      efficiencyMultiplier = 0.98;
      adjustmentReason = 'Modern turbo/downsized engine (slight penalty)';
    } else {
      // Older undersized engines work harder
      efficiencyMultiplier = 0.92;
      adjustmentReason = 'Older undersized engine penalty (-8%)';
    }
  }

  const finalEfficiency = baseEfficiency * efficiencyMultiplier;

  if (__DEV__) {
    console.log(`\n📊 STEP 6: Power-to-Weight Adjustment`);
    console.log(`   Expected CC for ${weight}kg: ${expectedCC.toFixed(0)}cc (formula: weight × 0.9)`);
    console.log(`   Actual CC used: ${estimatedCC}cc (${ccSource})`);
    console.log(`   CC ratio: ${ccRatio.toFixed(2)} ${ccRatio > 1.3 ? '(oversized ⚠️)' : ccRatio < 0.8 ? '(undersized ⚠️)' : '(optimal ✅)'}`);
    console.log(`   Adjustment: ${adjustmentReason}`);
    console.log(`   Base efficiency: ${(baseEfficiency * 100).toFixed(2)}%`);
    console.log(`   Efficiency multiplier: ${efficiencyMultiplier.toFixed(2)}`);
    console.log(`   ✅ Final thermal efficiency: ${(finalEfficiency * 100).toFixed(2)}%`);
  }

  // ============================================
  // STEP 7: CALCULATE FUEL CONSUMPTION
  // ============================================
  const fuelEnergyMJ = FUEL_ENERGY_MJ[fuelType.toLowerCase()];

  // Fuel needed = Energy required / (Fuel energy × Efficiency)
  const fuelLitersPer100Km = totalEnergyMJ / (fuelEnergyMJ * finalEfficiency);
  let kmPerL = 100 / fuelLitersPer100Km;

  if (__DEV__) {
    console.log(`\n📊 STEP 7: Fuel Calculation`);
    console.log(`   Fuel energy content: ${fuelEnergyMJ} MJ/L`);
    console.log(`   Fuel needed: ${fuelLitersPer100Km.toFixed(2)} L/100km`);
    console.log(`   Raw result: ${kmPerL.toFixed(2)} km/L`);
  }

  // ============================================
  // STEP 8: APPLY REALISTIC BOUNDS
  // ============================================
  const bounds = CONSUMPTION_BOUNDS[vehicleType];
  const finalKmPerL = Math.max(bounds.min, Math.min(bounds.max, kmPerL));

  if (finalKmPerL !== kmPerL && __DEV__) {
    console.log(`\n📊 STEP 8: Bounds Applied`);
    console.log(`   Bounds for ${vehicleType}: ${bounds.min}-${bounds.max} km/L`);
    console.log(`   Adjusted from ${kmPerL.toFixed(2)} to ${finalKmPerL.toFixed(2)} km/L`);
  }

  if (__DEV__) {
    console.log('\n═══════════════════════════════════════');
    console.log(`✅ FINAL RESULT: ${finalKmPerL.toFixed(2)} km/L`);
    console.log(`   (${(100 / finalKmPerL).toFixed(2)} L/100km)`);
    console.log('\n📋 CALCULATION SUMMARY:');
    console.log(`   1. Engine CC: ${estimatedCC}cc (${ccSource})`);
    console.log(`   2. Vehicle Year: ${params.year || 'N/A'}`);
    console.log(`   3. Base Thermal Efficiency: ${(baseEfficiency * 100).toFixed(2)}%`);
    console.log(`   4. Age/Power Adjustment: ${efficiencyMultiplier.toFixed(2)}x`);
    console.log(`   5. Final Thermal Efficiency: ${(finalEfficiency * 100).toFixed(2)}%`);
    console.log(`   → Result: ${finalKmPerL.toFixed(2)} km/L`);
    console.log('═══════════════════════════════════════\n');
  }

  return parseFloat(finalKmPerL.toFixed(2));
}

// ============================================================================
// BRAND TRANSLATION
// ============================================================================

/**
 * Hebrew to English brand translation map
 */
export function translateBrandToEnglish(hebrewBrand: string): string {
  const brandMap: Record<string, string> = {
    // Japanese brands
    'טויוטה': 'Toyota',
    'טויוטה טורקיה': 'Toyota',
    'הונדה': 'Honda',
    'מאזדה': 'Mazda',
    'ניסאן': 'Nissan',
    'סובארו': 'Subaru',
    'מיצובישי': 'Mitsubishi',
    'לקסוס': 'Lexus',
    'אקורה': 'Acura',
    'אינפיניטי': 'Infiniti',

    // Korean brands
    'קיא': 'Kia',
    'יונדאי': 'Hyundai',
    'ג\'נסיס': 'Genesis',

    // German brands
    'פולקסווגן': 'Volkswagen',
    'אאודי': 'Audi',
    'מרצדס': 'Mercedes-Benz',
    'מרצדס בנץ גרמנ': 'Mercedes-Benz',
    'ב.מ.וו': 'BMW',
    'פורשה': 'Porsche',
    'מיני': 'Mini',

    // European brands
    'סקודה': 'Skoda',
    'סיאט': 'Seat',
    'רנו': 'Renault',
    'פיג\'ו': 'Peugeot',
    'סיטרואן': 'Citroen',
    'פיאט': 'Fiat',
    'אלפא רומיאו': 'Alfa Romeo',
    'יגואר': 'Jaguar',
    'לנד רובר': 'Land Rover',
    'וולוו': 'Volvo',
    'מזראטי': 'Maserati',
    'למבורגיני': 'Lamborghini',
    'פרארי': 'Ferrari',
    'בנטלי': 'Bentley',
    'אסטון מרטין': 'Aston Martin',
    'רולס רויס': 'Rolls-Royce',
    'לוטוס': 'Lotus',
    'בוגאטי': 'Bugatti',
    'פולסטאר': 'Polestar',

    // American brands
    'פורד': 'Ford',
    'פורד גרמניה': 'Ford',
    'שברולט': 'Chevrolet',
    'ג\'פ': 'Jeep',
    'קדילק': 'Cadillac',
    'לינקולן': 'Lincoln',
    'ביואיק': 'Buick',
    'ראם': 'Ram',
    'קרייזלר': 'Chrysler',
    'דודג\'': 'Dodge',
    'ג\'י אם סי': 'GMC',
    'ריביאן': 'Rivian',

    // Electric brands
    'טסלה': 'Tesla',
    'לוסיד': 'Lucid',
    'פיסקר': 'Fisker',
    'וינפאסט': 'Vinfast',

    // Chinese and other brands
    'צ\'רי סין': 'Chery',
    'בי ווי די': 'BYD',
    'סקיוול סין': 'Skywell',
    'דאן הולנד': 'DAF',
    'ימהה צרפת': 'Yamaha',
    'אינאוס': 'INEOS Automotive',
    "דאף-הולנד": "DAF",
    "סקודה צ'כיה": "Skoda",
    "יונדאי קוריאה": "Hyundai",
    "קיה קוריאה": "Kia",
    "יונדאי צ'כיה": "Hyundai",
    "סוזוקי-יפן": "Suzuki",
    "רנו צרפת": "Renault",
    "ב מ וו גרמניה": "BMW",
    "מ.ג סין": "MG",
    "סיטרואן צרפת": "Citroen",
    "פיג'ו איטליה": "Peugeot",
    "איווקו איטליה": "Iveco",
    "מרצדס בנץ ארהב": "Mercedes-Benz",
    "מיצובישי יפן": "Mitsubishi",
    "פולקסווגן ארהב": "Volkswagen",
  };

  return brandMap[hebrewBrand] || hebrewBrand;
}
