
// lib/data/fuelData.ts



// ============================================================================
// FETCH WITH TIMEOUT - Network protection
// ============================================================================



/**

 * Fetch with timeout protection

 * Prevents indefinite hangs on slow networks

 */

// הוסף את השורה הזו בראש הקובץ, מתחת ליבואים (Imports)

const IS_DEV = typeof process !== 'undefined' && process.env.NODE_ENV !== 'production';



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
  is_hybrid?: boolean; 

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

// WLTP API - נתוני צריכת דלק רשמיים לפי תקן WLTP (to know if this is SUV or HIBRID)
const WLTP_API_RESOURCE_ID = '142afde2-6228-49f9-8a29-9b6c3a0cbe40';
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
    baseYear: 2026,           // Base year
    baseEfficiency: 0.215,     // Average efficiency for modern gasoline engines (~19% combined)
    degradationPerYear: 0.0015, // Loss of 0.25% efficiency per year
    minEfficiency: 0.14,      // Minimum efficiency floor
  },
  diesel: {
    baseYear: 2026,           // Base year
    baseEfficiency: 0.36,     // CORRECTED: Diesels are much more efficient (~36% combined)
    degradationPerYear: 0.0020, // Diesels degrade slightly slower than gasoline (0.20% per year)
    minEfficiency: 0.25,      // CORRECTED: Minimum efficiency floor for old diesels
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

 * Calculate engine displacement efficiency factor.

 * Larger engines suffer from higher internal friction and pumping losses,

 * regardless of the vehicle's weight.

 */

function getEngineDisplacementFactor(cc: number): number {
  // קטגוריה 1-5: מנועים קטנים ובינוניים (יעילים)
  if (cc <= 1050) return 1.09; 
  if (cc <= 1250) return 1.08; 
  if (cc <= 1550) return 1.08; 
  if (cc <= 1850) return 1.07; 
  if (cc <= 2050) return 1.05; 
  
  // קטגוריה 6: מנהלים/פנאי קטן
  if (cc <= 2550) return 0.98; // במקום 0.97
  
  // קטגוריה 7: מנועי V6 מודרניים/דיזל (עד 3.0L)
  if (cc <= 3050) return 0.95; 
  
  // קטגוריה 8: רכבי שטח כבדים/V6 גדול (כמו הגרנד צ'ירוקי 3.6L)
  if (cc <= 4050) return 0.91; // במקום 0.81 - שינוי קריטי! מנוע מודרני, פחות חיכוך.
  
  // קטגוריה 9: V8 (עד 5.2L)
  if (cc <= 5200) return 0.85; 
  
  // קטגוריה 10: משאיות/טנדרים ענקיים
  if (cc <= 6800) return 0.75; 
  return 0.60;
}

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



    if (IS_DEV) {

      console.log(`   📊 extractAndAverageField: Found ${values.length} valid ${fieldName} values`);

      console.log(`   Values: [${values.join(', ')}]`);

      console.log(`   Average (rounded): ${avg}`);

    }



    return avg;

  }



  if (IS_DEV) {

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



  if (IS_DEV) {

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



    if (IS_DEV) {

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

    if (IS_DEV) {

      console.log(`   Vehicle year: ${year} (newer or equal to base year)`);

      console.log(`   → Using maximum efficiency: ${(config.baseEfficiency * 100).toFixed(2)}%`);

    }

    return config.baseEfficiency;

  }



  // חישוב יעילות: יעילות_בסיס - (שנים_אחורה × ירידה_לשנה)

  const calculatedEfficiency = config.baseEfficiency - (yearsDiff * config.degradationPerYear);

  const finalEfficiency = Math.max(config.minEfficiency, calculatedEfficiency);

  const isAtMinimum = finalEfficiency === config.minEfficiency;



  if (IS_DEV) {

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



    if (IS_DEV) {  

      console.log(`   🔍 Querying fallback API with filters:`, filters);

      console.log(`   📡 URL:`, url);

    }



    const response = await fetchWithTimeout(url, undefined, 10000);



    if (!response.ok) {

      if (IS_DEV) {

        console.log(`   ❌ Fallback API returned status: ${response.status}`);

      }

      return [];

    }



    const json = await response.json();

    const records = json?.result?.records || [];



    if (IS_DEV) {

      console.log(`   📊 Found ${records.length} matching records`);

    }



    return records;

  } catch (error) {

    if (IS_DEV) {

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



  if (IS_DEV) {

    console.log('\n   📦 WEIGHT API (ביטול סופי)');

    console.log(`   🔍 Search parameters: degem_nm="${degem_nm || 'N/A'}", brand="${brand || 'N/A'}", model="${model || 'N/A'}"`);

  }



  // ========================================

  // STRATEGY 0: degem_nm ONLY (HIGHEST PRIORITY)

  // ========================================

  if (degem_nm) {

    if (IS_DEV) {

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

        if (IS_DEV) {

          console.log(`   ✅ SUCCESS: Found weight for degem_nm "${degem_nm}"`);

          console.log(`   Average weight: ${avgWeight}kg`);

        }

          return avgWeight;

      }

    }



    if (IS_DEV) {

      console.log(`   ❌ No valid weight found for degem_nm "${degem_nm}"`);

    }

  }



  // Strategy 1: brand + model (NO YEAR FILTER - to get more results)

  if (brand && model) {

    if (IS_DEV) {

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

        if (IS_DEV) {

          console.log(`   ✅ SUCCESS: Found weight for ${brand} ${model}`);

          console.log(`   Average weight: ${avgWeight}kg`);

        }

        return avgWeight;

      }

    }



    if (IS_DEV) {

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



  if (IS_DEV) {

    console.log('\n   🔧 ENGINE CC API (יבוא אישי)');

    console.log(`   🔍 Search parameters:`, { engineCode, brand, model, kinuyMishari, degem_nm });

  }



  // ========================================

  // STRATEGY 0: degem_nm ONLY (NEW - HIGHEST PRIORITY)

  // ========================================

  if (degem_nm) {

    if (IS_DEV) {

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

        if (IS_DEV) {

          console.log(`   ✅ SUCCESS: Found CC for degem_nm "${degem_nm}"`);

          console.log(`   Average CC: ${avgCC}cc`);

        }

        return avgCC;

      }

    }



    if (IS_DEV) {

      console.log(`   ❌ No valid CC found for degem_nm "${degem_nm}"`);

    }

  }



  // Strategy 1: Search by engine code (degem_manoa)

  if (engineCode) {

    if (IS_DEV) {

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

        if (IS_DEV) {

          console.log(`   ✅ SUCCESS: Found CC for engine code "${engineCode}"`);

          console.log(`   Average CC: ${avgCC}cc`);

        }

        return avgCC;

      }

    }



    if (IS_DEV) {

      console.log(`   ❌ No valid CC found for engine code "${engineCode}"`);

    }

  }



  // Strategy 2: Search by kinuy_mishari (commercial name like "CIVIC TOURER")

  // Uses full-text search (q parameter) since kinuy_mishari is not indexed for exact filtering

  if (kinuyMishari) {

    if (IS_DEV) {

      console.log(`\n   📌 STRATEGY 2: Searching by commercial name (kinuy_mishari)`);

      console.log(`   Search term: "${kinuyMishari}"`);

    }



    try {

      const url = `${DATA_GOV_IL_BASE}?resource_id=${ENGINE_CC_API_RESOURCE_ID}&q=${encodeURIComponent(kinuyMishari)}&limit=20`;



      if (IS_DEV) {

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

            if (IS_DEV) {

              console.log(`   ✅ SUCCESS: Found CC for kinuy_mishari "${kinuyMishari}"`);

              console.log(`   Average CC: ${avgCC}cc`);

            }

            return avgCC;

          }

        }



        if (IS_DEV) {

          console.log(`   ❌ No valid CC found for kinuy_mishari "${kinuyMishari}"`);

        }

      }

    } catch (error) {

      if (IS_DEV) {

        console.log(`   ❌ kinuy_mishari search failed:`, error);

      }

    }

  }



  // Strategy 3: Search by brand + model

  if (brand && model) {

    if (IS_DEV) {

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

        if (IS_DEV) {

          console.log(`   ✅ SUCCESS: Found CC for ${brand} ${model}`);

          console.log(`   Average CC: ${avgCC}cc`);

        }

        return avgCC;

      }

    }



    if (IS_DEV) {

      console.log(`   ❌ No valid CC found for ${brand} ${model}`);

    }

  }



  if (IS_DEV) {

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
  kinuyMishari?: string;
  degem_nm?: string;
  isElectric?: boolean;
}): Promise<FallbackVehicleData | undefined> {

  const { brand, model, year, engineCode, plateNumber, kinuyMishari, degem_nm } = params;



  if (IS_DEV) {

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
    params.isElectric 
      ? Promise.resolve(undefined) 
      : fetchEngineCCFromAPI({ engineCode, brand, model, kinuyMishari, degem_nm }),
  ]);



  if (weight || engineCC) {

    const result: FallbackVehicleData = {};

    if (weight) result.mishkal_kolel = weight;

    if (engineCC) result.nefach_manoa = engineCC;



    if (IS_DEV) {

      console.log(`\n   ✅ FALLBACK RESULT: weight=${weight || 'N/A'}kg, cc=${engineCC || 'N/A'}cc`);

    }

    return result;

  }



  if (IS_DEV) {

    console.log('\n   ❌ No fallback data found');

  }

  return undefined;

}

/**

 * Extract effective operational weight from mishkal_kolel (gross weight)

 *
//51318403
 * SIMPLIFIED STRATEGY:
 * - Israeli API's 'misgeret' field is unreliable (contains VIN codes)
* - Use only mishkal_kolel and convert using accurate 0.73 multiplier * 
* - If no API data: return undefined (will trigger estimation by brand/model)
 *

 * @param mishkal_kolel - Gross vehicle weight (kg) from API

 * @param misgeret - DEPRECATED: Not used (kept for backward compatibility)

 * @returns Effective operational weight in kg, or undefined if no weight data

 */

export function getEffectiveWeight(
  mishkal_kolel?: number,
  isEV: boolean = false,
  vehicleType: VehicleType = 'car'
): number | undefined {
  if (mishkal_kolel) {
    let effectiveWeight: number;

    if (vehicleType === 'motorcycle') {
      // אופנוע: משקל כולל פחות 150 ק"ג (מטען מורשה ממוצע: שני רוכבים) + 80 ק"ג (רוכב יחיד ממוצע)
      // מינימום 120 ק"ג כדי לשמור על היגיון פיזיקלי גם לכלים קלים
      effectiveWeight = Math.max(120, mishkal_kolel - 70);
    }
    else {
      // רכב פרטי / משאית
      const multiplier = isEV ? 0.85 : 0.76;
      effectiveWeight = mishkal_kolel * multiplier;
    }
    
    if (IS_DEV) {
      console.log(`📐 Weight calculation: ${mishkal_kolel}kg → ${effectiveWeight.toFixed(0)}kg (type: ${vehicleType})`);
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

/**
 * Fetch official WLTP data to classify vehicle as SUV or Hybrid
 * Queries the official Israeli vehicle taxonomy database
 * * @param record - Vehicle record from primary Data.gov API
 * @param fallbackDegemNm - Extracted degem_nm from the primary API
 */
export async function fetchWLTPData(record: any, fallbackDegemNm?: string): Promise<{
  isOfficialSUV: boolean;
  isOfficialHybrid: boolean;
} | null> {
  try {
    const tozeret_cd = record?.tozeret_cd;
    const degem_cd = record?.degem_cd;
    const ramat_gimur = record?.ramat_gimur;
    
    // 🌟 שולפים את degem_nm גם מהרשומה וגם מהפרמטר שהעברנו
    const degem_nm = fallbackDegemNm || record?.degem_nm || record?.degem || record?.model_code;

    // חובה לפחות קודי יצרן/דגם או קוד דגם טקסטואלי כדי לחפש
    if (!tozeret_cd && !degem_cd && !degem_nm) return null;

    if (IS_DEV) {
      console.log(`\n📋 WLTP Lookup`);
      console.log(`   tozeret_cd: ${tozeret_cd || 'N/A'}, degem_cd: ${degem_cd || 'N/A'}`);
      console.log(`   ramat_gimur: ${ramat_gimur || 'N/A'}, degem_nm: ${degem_nm || 'N/A'}`);
    }

    // פונקציית עזר פנימית לביצוע שאילתות נקיות למאגר ה-WLTP
    const executeWLTPQuery = async (filters: any) => {
      const filterQuery = JSON.stringify(filters);
      const url = `${DATA_GOV_IL_BASE}?resource_id=${WLTP_API_RESOURCE_ID}&filters=${encodeURIComponent(filterQuery)}&limit=1`;
      const response = await fetchWithTimeout(url, undefined, 4000);
      if (!response.ok) return null;
      const data = await response.json();
      return data.result?.records || [];
    };

    let records: any[] = [];

    // 📌 אסטרטגיה 1: חיפוש מדויק (יצרן + דגם + רמת גימור)
    if (tozeret_cd && degem_cd && ramat_gimur) {
      records = await executeWLTPQuery({ tozeret_cd, degem_cd, ramat_gimur });
    }

    // 📌 אסטרטגיה 2: חיפוש רחב (יצרן + דגם) - פותר בעיות של שגיאות כתיב ברמת הגימור
    if ((!records || records.length === 0) && tozeret_cd && degem_cd) {
      if (IS_DEV && ramat_gimur) console.log(`   ⚠️ Exact trim not found. Retrying with broad model code only...`);
      records = await executeWLTPQuery({ tozeret_cd, degem_cd });
    }

    // 📌 אסטרטגיה 3: חיפוש לפי degem_nm (הרעיון המעולה שלך!)
    if ((!records || records.length === 0) && degem_nm) {
      if (IS_DEV) console.log(`   ⚠️ Retrying WLTP using degem_nm: "${degem_nm}"...`);
      records = await executeWLTPQuery({ degem_nm });
    }

    // אם כל 3 האסטרטגיות נכשלו
    if (!records || records.length === 0) {
      if (IS_DEV) console.log('   ℹ️ WLTP lookup: No matching records found after all strategies');
      return null;
    }

    const wltpRecord = records[0];

    // ⚡ זיהוי היברידי מורחב (מתואם לערכי WLTP הממשלתיים)
    // ממירים לאותיות גדולות כדי לתפוס "PLUG-IN" או "plug-in" בלי בעיות
    const technologyField = (wltpRecord.technologiat_hanaa_nm || '').toString().toUpperCase();
    
    // מזהה "היברידי רגיל", "PLUG-IN", וגיבויים נוספים ליתר ביטחון
    const isOfficialHybrid = 
      technologyField.includes('היברידי') || 
      technologyField.includes('PLUG-IN') || 
      technologyField.includes('PLUG IN') || 
      technologyField.includes('PHEV') || 
      technologyField.includes('MHEV');

    // 🚙 זיהוי SUV מורחב
    const vehicleCategory = (wltpRecord.qvutzat_rechev_nm || '').toString().toLowerCase();
    const vehicleType = (wltpRecord.merkav || '').toString().toLowerCase();
    
    const isOfficialSUV =
      vehicleCategory.includes('פנאי') ||
      vehicleCategory.includes('שטח') ||
      vehicleType.includes('פנאי') ||
      vehicleType.includes('שטח');

    if (IS_DEV) {
      console.log(`   ✅ WLTP Result Success:`);
      console.log(`      Category: ${vehicleCategory || 'N/A'} / ${vehicleType || 'N/A'}`);
      console.log(`      Technology: ${technologyField || 'N/A'}`);
      console.log(`      → isOfficialHybrid: ${isOfficialHybrid ? 'YES 🔋' : 'NO'}`);
      console.log(`      → isOfficialSUV: ${isOfficialSUV ? 'YES 🚙' : 'NO'}`);
    }

    return { isOfficialSUV, isOfficialHybrid };
  } catch (error) {
    if (IS_DEV) console.log(`   ❌ WLTP fetch error: ${error instanceof Error ? error.message : String(error)}`);
    return null;
  }
}

/**
 * Estimate vehicle curb weight by segment based on model keywords and specifications
 * 
 * @param model - Vehicle model name (uppercase expected)
 * @param brand - Vehicle brand name (uppercase expected)
 * @param isSUV - Whether the vehicle is classified as an SUV
 * @returns Estimated curb weight in kg
 */
export function estimateWeightBySegment(
  model: string,
  brand: string,
  isSUV: boolean
): number {
  const modelUpper = model.toUpperCase();
  const brandUpper = brand.toUpperCase();

  // Mini/Supermini vehicles (up to 1000kg)
  // Examples: Aygo, i10, i20, Picanto, Fiat 500, Spark, Micra
  const miniModels = ['AYGO', 'I10', 'I20', 'PICANTO', '500', 'SPARK', 'MICRA', 'ALTO'];
  if (miniModels.some(m => modelUpper.includes(m))) {
    return 950;
  }

  // Compact/Sedan vehicles (~1320kg)
  // Examples: Corolla, Forte, Civic, Golf, Mazda 3, Octavia
  const compactModels = ['COROLLA', 'FORTE', 'CIVIC', 'GOLF', 'MAZDA 3', 'OCTAVIA', 'FOCUS', 'HYUNDAI I30', 'ELANTRA', 'SENTRA'];
  if (compactModels.some(m => modelUpper.includes(m))) {
    return 1320;
  }

  // SUV/Heavy classification
  if (isSUV) {
    // Massive SUVs (~2100kg)
    // Examples: Prado, Cherokee, Explorer, Pajero, Cayenne, Land Cruiser
    const massiveSUVs = ['PRADO', 'CHEROKEE', 'EXPLORER', 'PAJERO', 'CAYENNE', 'LAND CRUISER', 'SEQUOIA', 'TUNDRA', 'GRAND CHEROKEE', 'QX60'];
    if (massiveSUVs.some(m => modelUpper.includes(m)) || brandUpper === 'LAND ROVER') {
      return 2100;
    }

    // Average SUVs (~1650kg)
    // Default for SUV classification
    return 1650;
  }

  // Default fallback for non-classified vehicles
  return 1450;
}

/**
 * Get smart engine CC fallback based on brand and weight characteristics
 * Replaces the flawed weight × 0.9 logic with brand-aware estimation
 * 
 * @param brand - Vehicle brand name (uppercase expected)
 * @param weight - Effective vehicle weight in kg
 * @returns Estimated engine displacement in cc
 */
export function getSmartCCFallback(brand: string, weight: number): number {
  const brandUpper = brand.toUpperCase();

  // Luxury/Sports brands (high CC per kg ratio)
  // Examples: Porsche, Ferrari, Maserati
  const luxurySportsBrands = ['PORSCHE', 'FERRARI', 'MASERATI', 'LAMBORGHINI', 'ROLLS', 'BENTLEY'];
  if (luxurySportsBrands.some(b => brandUpper.includes(b))) {
    return 3600;
  }

  // Heavy Duty brands (typically larger engines for torque)
  // Examples: Land Rover, Jeep
  const heavyDutyBrands = ['LAND ROVER', 'JEEP'];
  if (heavyDutyBrands.some(b => brandUpper.includes(b))) {
    return 3000;
  }

  // Mini/lightweight vehicles
  if (weight < 1100) {
    return 1100;
  }

  // Default estimation for regular vehicles
  // Uses a slightly adjusted ratio: ~1.1 cc/kg instead of 0.9
  return Math.round(weight * 1.1);
}

export function calculateICEConsumptionEnhanced(params: {

  mishkal_kolel?: number;
  engineCC?: number;
  year?: number;
  fuelType: 'Gasoline' | 'Diesel';
  vehicleType?: VehicleType;
  isHybrid?: boolean;
  isOfficialSUV?: boolean;
  brand?: string;
  model?: string;

}): number {

  const { fuelType, vehicleType = 'car' } = params;



  if (IS_DEV) {

    console.log('\n🔧 ADVANCED ICE PHYSICS CALCULATION');

    console.log('═══════════════════════════════════════');

  }



// ============================================
  // STEP 1: DETERMINE EFFECTIVE WEIGHT
  // ============================================
  const effectiveWeight = getEffectiveWeight(params.mishkal_kolel, false, vehicleType);



  // Default weights by vehicle type

  const defaultWeights: Record<VehicleType, number> = {

    motorcycle: 200,

    car: 1500,

    truck: 3500,

  };



  const weight = effectiveWeight || defaultWeights[vehicleType];



  if (IS_DEV) {

    console.log(`\n📊 STEP 1: Weight Determination`);

    console.log(`   mishkal_kolel: ${params.mishkal_kolel || 'N/A'}kg`);

    console.log(`   Effective weight: ${weight}kg (${effectiveWeight ? 'calculated' : 'default'})`);

    console.log(`   Vehicle type: ${vehicleType}`);

  }



  // ============================================

  // STEP 2: DETERMINE ENGINE CC

  // ============================================

  // Estimate engineCC if missing - using smart brand/weight-aware fallback

  let estimatedCC: number;

  let ccSource: string;



  if (params.engineCC && params.engineCC > 0) {

    estimatedCC = params.engineCC;

    ccSource = 'from API/Database';

  } else {

    // Use smart fallback: brand-aware + weight-based estimation
    estimatedCC = getSmartCCFallback(params.brand || '', weight);

    ccSource = `estimated from brand/weight (getSmartCCFallback)`;

  }



  if (IS_DEV) {

    console.log(`\n📊 STEP 2: Engine CC Determination`);

    console.log(`   Provided CC from API: ${params.engineCC || 'N/A'}cc`);

    if (!params.engineCC || params.engineCC <= 0) {

      console.log(`   ⚠️  No valid CC from API - using smart estimation`);

      console.log(`   Smart fallback: brand="${params.brand}", weight=${weight}kg`);

    }

    console.log(`   ✅ Final CC: ${estimatedCC}cc (${ccSource})`);

  }



  // ============================================

  // STEP 3: SUV CLASSIFICATION & AERODYNAMIC PARAMETERS

  // ============================================

  // Determine if this is an SUV at top level (needed for both aero params and drivetrain efficiency)
  const modelLower = (params.model || '').toLowerCase();

  // Fallback SUV detection heuristics
  // True if: (heavy weight AND not explicitly sedan) OR (explicit SUV keywords)
  const isFallbackSUV =
    (weight >= 1650 && !modelLower.includes('sedan')) ||
    modelLower.includes('suv') ||
    modelLower.includes('cross') ||
    modelLower.includes('xc');

  // Final determination: Official data takes priority, fallback applies if no official data
  // If isOfficialSUV is true → SUV. If false or undefined → use fallback heuristics.
  const isActualSUV = vehicleType === 'car' && (params.isOfficialSUV || isFallbackSUV);

  if (IS_DEV) {
    if (vehicleType === 'car') {
      console.log(`\n📊 STEP 3: SUV Classification`);
      console.log(`   Official WLTP: ${params.isOfficialSUV !== undefined ? (params.isOfficialSUV ? 'YES' : 'NO') : 'N/A'}`);
      console.log(`   Fallback heuristics: ${isFallbackSUV ? 'YES' : 'NO'} (weight: ${weight}kg, model: "${params.model}")`);
      console.log(`   → Final classification: ${isActualSUV ? 'SUV 🚙' : 'Sedan/Regular'}`);
    }
  }

  // Apply aerodynamic parameters based on vehicle type and SUV classification
  const aero = { ...AERO_PARAMS[vehicleType] };

  if (vehicleType === 'car') {
    if (weight < 1150) {
      // Mini vehicles (Kia Picanto, Chevrolet Spark)
      aero.A = 2.15;
      aero.Cd = 0.33;
      aero.Crr = 0.010;
    } else if (isActualSUV) {
      // SUV/Crossover properties: massive, tall, wide, non-aerodynamic block (fixes artificially good MPG)
      // Penalizes vehicles like Prado and Cayenne which are physically bulky
      aero.A = 2.8;
      aero.Cd = 0.36;
      aero.Crr = 0.010;
    } else {
      // Sedans and family cars: long, low, excellent aerodynamics
      aero.A = 2.30;
      aero.Cd = 0.29;
      aero.Crr = 0.009;
    }
  }

  // Motorcycle aerodynamic parameters
  if (vehicleType === 'motorcycle') {
    // Smart detection of motorcycle configuration by weight/displacement ratio
    if (weight > 220 && estimatedCC > 600) {
      // Adventure / Touring (heavy, tall, side panniers) - large frontal area & drag
      aero.Cd = 0.55;
      aero.A = 0.70;
    } else if (weight < 210 && estimatedCC > 550) {
      // Sport motorcycle (light, large engine, fairing cuts air excellently)
      aero.Cd = 0.45;
      aero.A = 0.55;
    } else {
      // Naked / Scooters / Classic (rider exposed, acts as "sail")
      aero.Cd = 0.60;
      aero.A = 0.65;
    }
  }

  // Truck aerodynamic parameters
  if (vehicleType === 'truck') {
    if (weight < 4000) {
      // Commercial vehicles & pickups (Chevrolet Silverado, Fiat Ducato)
      aero.A = 3.5;
      aero.Cd = 0.42;
    } else if (weight < 10000) {
      // Medium distribution trucks with cargo (Iveco 7-ton, Isuzu Somo) - large air resistance
      aero.A = 5.5;
      aero.Cd = 0.55;
    } else {
      // Heavy trucks / Semi-trailers
      aero.A = 8.0;
      aero.Cd = 0.65;
    }
  }

  if (IS_DEV) {

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
    motorcycle: 75,
    car: 70,
    truck: 50,
  };

  const avgSpeedMs = avgSpeedKmh[vehicleType] / 3.6;



  // Rolling Resistance Energy (MJ/100km)

  const rollingEnergyMJ = (aero.Crr * weight * GRAVITY * DISTANCE) / 1000000;



  // Aerodynamic Drag Energy (MJ/100km)

  // E = 0.5 × Cd × A × ρ × v² × distance

  const dragEnergyMJ = (0.5 * aero.Cd * aero.A * AIR_DENSITY * Math.pow(avgSpeedMs, 2) * DISTANCE) / 1000000;



 // Acceleration energy calibrated from real-world driving data
  const accelFactor: Record<VehicleType, number> = {
   motorcycle: 10.0,  
    car: 11.2,
    truck: 12.2,      
  };

  const accelerationEnergyMJ = (weight / 1000) * accelFactor[vehicleType];


  // Auxiliary systems power consumption

  // ICE vehicles consume extra fuel for: alternator, A/C, power steering, water pump, oil pump

  // Typical range: 10-15% of mechanical energy

  const auxiliaryFactor: Record<VehicleType, number> = {
    motorcycle: 0.10,  
    car: 0.14,         // Full A/C, infotainment, lights
    truck: 0.18,       // Heavy-duty accessories (air brakes, larger alternator)
    };

  const auxiliaryEnergyMJ = (rollingEnergyMJ + dragEnergyMJ + accelerationEnergyMJ) * auxiliaryFactor[vehicleType];



  // Base energy required at wheels

  let totalEnergyMJ = rollingEnergyMJ + dragEnergyMJ + accelerationEnergyMJ + auxiliaryEnergyMJ;

  

  // Drivetrain & transmission losses (~10-15% lost between engine output and wheels)
  // SUVs have higher friction due to all-wheel-drive systems and heavier components
  const DRIVETRAIN_EFFICIENCY = isActualSUV ? 0.86 : 0.90; // 86% for SUVs, 90% for regular cars

  totalEnergyMJ = totalEnergyMJ / DRIVETRAIN_EFFICIENCY;



  if (IS_DEV) {

    console.log(`\n📊 STEP 4: Energy Components (MJ/100km)`);

    console.log(`   Drivetrain efficiency: ${(DRIVETRAIN_EFFICIENCY * 100).toFixed(0)}% (${isActualSUV ? 'SUV' : 'Regular vehicle'})`);

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



  if (IS_DEV) {

  const fuel = fuelType.toLowerCase() as 'gasoline' | 'diesel';

  const config = THERMAL_EFFICIENCY_BASE[fuel];
  console.log(`\n📊 STEP 5: Thermal Efficiency (חישוב שנתי רציף)`);
  console.log(`   Year: ${params.year || 'N/A'}`);
  console.log(`   Fuel type: ${fuelType}`);
  console.log(`   Base efficiency: ${(baseEfficiency * 100).toFixed(2)}%`);

  if (params.year) {

    const yearsDiff = config.baseYear - params.year;

    if (yearsDiff > 0) {
      console.log(`   Years old: ${yearsDiff} → Efficiency degradation: -${(yearsDiff * config.degradationPerYear * 100).toFixed(2)}%`);
    }

  }

}



  // ============================================
  // STEP 6: POWER-TO-WEIGHT & TECH ADJUSTMENT
  // ============================================

  let expectedCC: number;
  if (vehicleType === 'motorcycle') {
    expectedCC = weight * 2.5; 
  } else if (vehicleType === 'truck') {
    expectedCC = 1500 + (weight * 0.35); 
  } else if (isActualSUV) {
    expectedCC = weight * 1.4; 
  } else {
    expectedCC = weight < 1200 ? weight * 1.15 : weight * 0.9;
  }
  
  const ccRatio = estimatedCC / expectedCC;

  let efficiencyMultiplier = 1.0;
  let adjustmentReason = 'Optimal engine-to-weight ratio';

  if (vehicleType !== 'motorcycle') {
    if (ccRatio > 2.0) {
      efficiencyMultiplier = 0.88; 
      adjustmentReason = 'Massively oversized engine penalty (-12%)';
    } else if (ccRatio > 1.55) {
      efficiencyMultiplier = 0.95;
      adjustmentReason = 'Oversized engine penalty (-5%)';
    } else if (ccRatio < 0.8) {
      efficiencyMultiplier = 0.92;
      adjustmentReason = 'Undersized engine working hard (-8%)';
    }
} else { // vehicleType === 'motorcycle'
    // אופנועי ספורט מרובעי צילינדרים עובדים בסל"ד גבוה מאוד (מעל 6000 בשיוט) ומאבדים המון יעילות תרמית.
    // מנועי קטנועים וטווינים קטנים רגועים יותר.
    if (estimatedCC > 550 && weight < 230) {
      // אופנועי ספורט/נייקד (מנוע גדול על משקל קל)
      efficiencyMultiplier *= 0.55; 
      adjustmentReason = 'Sport Motorcycle High-RPM penalty (-45%)';
    } else if (estimatedCC > 900 && weight >= 230) {
      // אדוונצ'ר או ספורט-תיור כבדים גדולים (למשל BMW GS, אפריקה טווין)
      efficiencyMultiplier *= 0.60;
      adjustmentReason = 'Heavy Motorcycle drag & RPM penalty (-40%)';
    } else {
      // קטנועים, אופנועי מתחילים (A1), נייקדים קטנים (כמו Voge 500)
      efficiencyMultiplier *= 0.65; 
      adjustmentReason = 'Standard Motorcycle RPM penalty (-35%)';
    }
  }

  if (
    params.year && 
    params.year >= 2016 && 
    estimatedCC >= 950 && 
    estimatedCC <= 1550 &&
    weight >= 1200
  ) {
    efficiencyMultiplier *= 1.08; // 8% bonus for modern downsized turbo engines
    adjustmentReason += ' + Modern Downsized Turbo Bonus (1.12x)';
  }

  if (params.isHybrid) {
    efficiencyMultiplier *= 1.80; // תוספת של 80% ליעילות המערכת (מבטל את קנס המשקל של הסוללות)
    adjustmentReason += ' + Hybrid System Synergy (1.80x)';
  }

  const displacementFactor = getEngineDisplacementFactor(estimatedCC);
  const totalMultiplier = efficiencyMultiplier * displacementFactor;
  const finalEfficiency = baseEfficiency * totalMultiplier;


  if (IS_DEV) {

    console.log(`\n📊 STEP 6: Power-to-Weight & Displacement Adjustment`);

    console.log(`   Expected CC for ${weight}kg: ${expectedCC.toFixed(0)}cc (formula: weight × 0.9)`);

    console.log(`   Actual CC used: ${estimatedCC}cc (${ccSource})`);

    console.log(`   CC ratio: ${ccRatio.toFixed(2)} ${ccRatio > 1.55 ? '(oversized ⚠️)' : ccRatio < 0.8 ? '(undersized ⚠️)' : '(optimal ✅)'}`);

    console.log(`   Weight adjustment: ${adjustmentReason} (${efficiencyMultiplier.toFixed(2)}x)`);

    console.log(`   Displacement factor (${estimatedCC}cc): ${displacementFactor.toFixed(2)}x`);

    console.log(`   Total combined multiplier: ${totalMultiplier.toFixed(2)}x`);

    console.log(`   Base efficiency: ${(baseEfficiency * 100).toFixed(2)}%`);

    console.log(`   ✅ Final thermal efficiency: ${(finalEfficiency * 100).toFixed(2)}%`);

  }



  // ============================================

  // STEP 7: CALCULATE FUEL CONSUMPTION

  // ============================================

  const fuelEnergyMJ = FUEL_ENERGY_MJ[fuelType.toLowerCase()];



  // Fuel needed = Energy required / (Fuel energy × Efficiency)

  const fuelLitersPer100Km = totalEnergyMJ / (fuelEnergyMJ * finalEfficiency);

  let kmPerL = 100 / fuelLitersPer100Km;



  if (IS_DEV) {

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



  if (finalKmPerL !== kmPerL && IS_DEV) {

    console.log(`\n📊 STEP 8: Bounds Applied`);

    console.log(`   Bounds for ${vehicleType}: ${bounds.min}-${bounds.max} km/L`);

    console.log(`   Adjusted from ${kmPerL.toFixed(2)} to ${finalKmPerL.toFixed(2)} km/L`);

  }



  if (IS_DEV) {

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

  };



  return brandMap[hebrewBrand] || hebrewBrand;

}
