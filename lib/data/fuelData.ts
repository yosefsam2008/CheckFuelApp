// lib/data/fuelData.ts

// ============================================================================
// CONFIGURATION & UTILITIES
// ============================================================================

const IS_DEV = typeof process !== 'undefined' && process.env.NODE_ENV !== 'production';

/**
 * Clean logging utility to reduce repetitive IS_DEV checks
 */
const debugLog = (message: string, ...optionalParams: any[]) => {
  if (IS_DEV) {
    console.log(message, ...optionalParams);
  }
};

/**
 * Fetch with timeout protection to prevent indefinite hangs
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

export interface FallbackVehicleData {
  mishkal_kolel?: number;   // Gross weight (kg)
  nefach_manoa?: number;    // Engine CC
  shnat_yitzur?: number;    // Year
  tozeret_nm?: string;      // Brand name
  degem_nm?: string;        // Model name
  sug_delek_nm?: string;    // Fuel type
  is_hybrid?: boolean;
}

export type VehicleType = 'motorcycle' | 'car' | 'truck';

// ============================================================================
// CONSTANTS & PHYSICS PARAMETERS
// ============================================================================

// Fallback API Resource IDs
const WEIGHT_API_RESOURCE_ID = '851ecab1-0622-4dbe-a6c7-f950cf82abf9';
const ENGINE_CC_API_RESOURCE_ID = '03adc637-b6fe-402b-9937-7c3d3afc9140';
const WLTP_API_RESOURCE_ID = '142afde2-6228-49f9-8a29-9b6c3a0cbe40';
const DATA_GOV_IL_BASE = 'https://data.gov.il/api/3/action/datastore_search';

// Base Physics Constants
const AIR_DENSITY = 1.225; // kg/m³
const GRAVITY = 9.81;      // m/s²
const DISTANCE = 100000;   // 100 km in meters

// Base Aerodynamic parameters
const AERO_PARAMS: Record<VehicleType, { Cd: number; A: number; Crr: number }> = {
  motorcycle: { Cd: 0.50, A: 0.6, Crr: 0.010 },
  car: { Cd: 0.30, A: 2.4, Crr: 0.009 },
  truck: { Cd: 0.38, A: 3.0, Crr: 0.011 },
};

// Thermal Efficiency Baselines
const THERMAL_EFFICIENCY_BASE = {
  gasoline: {
    baseYear: 2026,
    baseEfficiency: 0.215,     // ~21.5% combined
    degradationPerYear: 0.0015,
    minEfficiency: 0.15,
  },
  diesel: {
    baseYear: 2026,
    baseEfficiency: 0.38,      // ~36% combined
    degradationPerYear: 0.0020,
    minEfficiency: 0.25,
  },
};

// Fuel energy content (MJ/L)
const FUEL_ENERGY_MJ: Record<string, number> = {
  diesel: 38.6,
  gasoline: 34.2,
};

// Consumption bounds (km/L)
const CONSUMPTION_BOUNDS: Record<VehicleType, { min: number; max: number }> = {
  motorcycle: { min: 15, max: 50 },
  car: { min: 6, max: 25 },
  truck: { min: 3, max: 12 },
};

// Energy Calculation Factors
const AVG_SPEED_KMH: Record<VehicleType, number> = { motorcycle: 75, car: 70, truck: 50 };
const ACCEL_FACTOR: Record<VehicleType, number> = { motorcycle: 10.0, car: 11.2, truck: 12.2 };
const AUXILIARY_FACTOR: Record<VehicleType, number> = { motorcycle: 0.10, car: 0.15, truck: 0.18 };

// ============================================================================
// DATA PROCESSING UTILITIES
// ============================================================================

function parseIntSafe(value: any): number | undefined {
  if (value == null || value === '') return undefined;
  const parsed = parseInt(value, 10);
  return isNaN(parsed) ? undefined : parsed;
}

function parseFloatSafe(value: any): number | undefined {
  if (value == null || value === '') return undefined;
  const parsed = parseFloat(value);
  return isNaN(parsed) ? undefined : parsed;
}

function extractAndAverageField(
  records: Record<string, any>[],
  fieldName: string,
  min: number,
  max: number,
  parser: (value: any) => number | undefined
): number | undefined {
  const values = records
    .map(r => parser(r[fieldName]))
    .filter((v): v is number => v !== undefined && v >= min && v <= max);

  if (values.length > 0) {
    const avg = Math.round(values.reduce((a, b) => a + b, 0) / values.length);
    //debugLog(`   📊 extractAndAverageField: Found ${values.length} valid ${fieldName} values. Average: ${avg}`);
    return avg;
  }

  //debugLog(`   ⚠️ extractAndAverageField: No valid ${fieldName} values in range [${min}, ${max}]`);
  return undefined;
}

// ============================================================================
// ENGINE & EFFICIENCY HELPERS
// ============================================================================

function getEngineDisplacementFactor(cc: number): number {
  if (cc <= 1050) return 1.09;
  if (cc <= 1250) return 1.08;
  if (cc <= 1550) return 1.08;
  if (cc <= 1850) return 1.07;
  if (cc <= 2050) return 1.05;
  if (cc <= 2550) return 0.98;
  if (cc <= 3050) return 0.95;
  if (cc <= 4050) return 0.91; 
  if (cc <= 5200) return 0.85;
  if (cc <= 6800) return 0.75;
  return 0.60;
}

function getThermalEfficiency(year: number | undefined, fuelType: 'Gasoline' | 'Diesel'): number {
  const fuel = fuelType.toLowerCase() as 'gasoline' | 'diesel';
  const config = THERMAL_EFFICIENCY_BASE[fuel];

  if (!year) {
    const defaultYear = config.baseYear - 10;
    return Math.max(
      config.minEfficiency,
      config.baseEfficiency - ((config.baseYear - defaultYear) * config.degradationPerYear)
    );
  }

  const yearsDiff = config.baseYear - year;
  if (yearsDiff <= 0) return config.baseEfficiency;

  return Math.max(
    config.minEfficiency,
    config.baseEfficiency - (yearsDiff * config.degradationPerYear)
  );
}

// ============================================================================
// FALLBACK API INTEGRATIONS
// ============================================================================

async function queryDataGovAPI(
  resourceId: string,
  filters: Record<string, any>,
  limit: number = 10
): Promise<Record<string, any>[]> {
  try {
    const filtersJson = JSON.stringify(filters);
    const url = `${DATA_GOV_IL_BASE}?resource_id=${resourceId}&filters=${encodeURIComponent(filtersJson)}&limit=${limit}`;
    const response = await fetchWithTimeout(url, undefined, 10000);

    if (!response.ok) return [];
    
    const json = await response.json();
    return json?.result?.records || [];
  } catch (error) {
    //debugLog(`   ❌ Fallback API query failed:`, error);
    return [];
  }
}

async function fetchWeightFromAPI(params: { brand?: string; model?: string; degem_nm?: string; plateNumber?: string; }): Promise<number | undefined> {
  const { brand, model, degem_nm } = params;

  if (degem_nm) {
    const records = await queryDataGovAPI(WEIGHT_API_RESOURCE_ID, { degem_nm }, 20);
    const avgWeight = extractAndAverageField(records, 'mishkal_kolel', 500, 10000, parseFloatSafe);
    if (avgWeight) return avgWeight;
  }

  if (brand && model) {
    const records = await queryDataGovAPI(WEIGHT_API_RESOURCE_ID, { tozeret_nm: brand, degem_nm: model }, 20);
    const avgWeight = extractAndAverageField(records, 'mishkal_kolel', 500, 10000, parseFloatSafe);
    if (avgWeight) return avgWeight;
  }

  return undefined;
}

async function fetchEngineCCFromAPI(params: { engineCode?: string; brand?: string; model?: string; kinuyMishari?: string; degem_nm?: string; }): Promise<number | undefined> {
  const { engineCode, brand, model, kinuyMishari, degem_nm } = params;

  if (degem_nm) {
    const records = await queryDataGovAPI(ENGINE_CC_API_RESOURCE_ID, { degem_nm }, 20);
    const avgCC = extractAndAverageField(records, 'nefach_manoa', 50, 15000, parseIntSafe);
    if (avgCC) return avgCC;
  }

  if (engineCode) {
    const records = await queryDataGovAPI(ENGINE_CC_API_RESOURCE_ID, { degem_manoa: engineCode }, 10);
    const avgCC = extractAndAverageField(records, 'nefach_manoa', 50, 15000, parseIntSafe);
    if (avgCC) return avgCC;
  }

  if (kinuyMishari) {
    try {
      const url = `${DATA_GOV_IL_BASE}?resource_id=${ENGINE_CC_API_RESOURCE_ID}&q=${encodeURIComponent(kinuyMishari)}&limit=20`;
      const response = await fetchWithTimeout(url, undefined, 10000);
      if (response.ok) {
        const json = await response.json();
        const records = json?.result?.records || [];
        const avgCC = extractAndAverageField(records, 'nefach_manoa', 50, 15000, parseIntSafe);
        if (avgCC) return avgCC;
      }
    } catch (error) {
     // debugLog(`   ❌ kinuy_mishari search failed:`, error);
    }
  }

  if (brand && model) {
    const records = await queryDataGovAPI(ENGINE_CC_API_RESOURCE_ID, { tozeret_nm: brand, degem_nm: model }, 20);
    const avgCC = extractAndAverageField(records, 'nefach_manoa', 50, 15000, parseIntSafe);
    if (avgCC) return avgCC;
  }

  return undefined;
}

export async function fetchFallbackVehicleData(params: {
  brand?: string; model?: string; year?: number; engineCode?: string; plateNumber?: string; kinuyMishari?: string; degem_nm?: string; isElectric?: boolean;
}): Promise<FallbackVehicleData | undefined> {
  const [weight, engineCC] = await Promise.all([
    fetchWeightFromAPI(params),
    params.isElectric ? Promise.resolve(undefined) : fetchEngineCCFromAPI(params),
  ]);

  if (weight || engineCC) {
    return {
      ...(weight && { mishkal_kolel: weight }),
      ...(engineCC && { nefach_manoa: engineCC }),
    };
  }
  return undefined;
}

export async function fetchWLTPData(record: any, fallbackDegemNm?: string): Promise<{ isOfficialSUV: boolean; isOfficialHybrid: boolean; hybridType: 'MHEV' | 'PHEV' | 'HEV' | null; wltpConsumption: number | null; } | null> {
  try {
    const tozeret_cd = record?.tozeret_cd;
    const degem_cd = record?.degem_cd;
    const ramat_gimur = record?.ramat_gimur;
    const degem_nm = fallbackDegemNm || record?.degem_nm || record?.degem || record?.model_code;

    if (!tozeret_cd && !degem_cd && !degem_nm) return null;

    const executeWLTPQuery = async (filters: any) => {
      const url = `${DATA_GOV_IL_BASE}?resource_id=${WLTP_API_RESOURCE_ID}&filters=${encodeURIComponent(JSON.stringify(filters))}&limit=1`;
      const response = await fetchWithTimeout(url, undefined, 4000);
      return response.ok ? (await response.json()).result?.records || [] : [];
    };

    let records: any[] = [];
    if (tozeret_cd && degem_cd && ramat_gimur) records = await executeWLTPQuery({ tozeret_cd, degem_cd, ramat_gimur });
    if (!records.length && tozeret_cd && degem_cd) records = await executeWLTPQuery({ tozeret_cd, degem_cd });
    if (!records.length && degem_nm) records = await executeWLTPQuery({ degem_nm });

    if (!records.length) return null;

    const wltpRecord = records[0];
    const techField = (wltpRecord.technologiat_hanaa_nm || '').toString().toUpperCase();
    const isOfficialHybrid = ['היברידי', 'PLUG-IN', 'PLUG IN', 'PHEV', 'MHEV'].some(term => techField.includes(term));

    // Determine specific hybrid type
    let hybridType: 'MHEV' | 'PHEV' | 'HEV' | null = null;
    if (isOfficialHybrid) {
      if (techField.includes('MHEV')) hybridType = 'MHEV';
      else if (techField.includes('PLUG') || techField.includes('PHEV')) hybridType = 'PHEV';
      else hybridType = 'HEV';
    }

    const category = (wltpRecord.qvutzat_rechev_nm || '').toString().toLowerCase();
    const type = (wltpRecord.merkav || '').toString().toLowerCase();
    const isOfficialSUV = ['פנאי', 'שטח'].some(term => category.includes(term) || type.includes(term));

    // Extract official WLTP fuel consumption (L/100km)
    const wltpConsumption = parseFloatSafe(wltpRecord.tzrichat_delek_mishulav) || null;

    return { isOfficialSUV, isOfficialHybrid, hybridType, wltpConsumption };
  } catch (error) {
    //debugLog(`   ❌ WLTP fetch error:`, error);
    return null;
  }
}

// ============================================================================
// WEIGHT & SPEC ESTIMATIONS
// ============================================================================

export function getEffectiveWeight(mishkal_kolel?: number, isEV: boolean = false, vehicleType: VehicleType = 'car'): number | undefined {
  if (!mishkal_kolel) return undefined;

  let effectiveWeight: number;
  if (vehicleType === 'motorcycle') {
    effectiveWeight = Math.max(120, mishkal_kolel - 70);
  } else {
    let ratio = isEV ? 0.85 : 0.76;
    
    // Dynamic sliding scale for ICE vehicles
    if (!isEV && vehicleType === 'car') {
      if (mishkal_kolel < 1500) ratio = 0.70;      // Mini/Supermini
      else if (mishkal_kolel < 2200) ratio = 0.73; // Family/SUV
      else if (mishkal_kolel <= 3500) ratio = 0.68;// Heavy Duty / Vans
    }
    
    effectiveWeight = mishkal_kolel * ratio;
  }
  
  return Math.round(effectiveWeight);
}

export function estimateWeightBySegment(model: string, brand: string, isSUV: boolean): number {
  const modelUpper = model.toUpperCase();
  const brandUpper = brand.toUpperCase();

  const miniModels = ['AYGO', 'I10', 'I20', 'PICANTO', '500', 'SPARK', 'MICRA', 'ALTO'];
  if (miniModels.some(m => modelUpper.includes(m))) return 950;

  const compactModels = ['COROLLA', 'FORTE', 'CIVIC', 'GOLF', 'MAZDA 3', 'OCTAVIA', 'FOCUS', 'HYUNDAI I30', 'ELANTRA', 'SENTRA'];
  if (compactModels.some(m => modelUpper.includes(m))) return 1320;

  if (isSUV) {
    const massiveSUVs = ['PRADO', 'CHEROKEE', 'EXPLORER', 'PAJERO', 'CAYENNE', 'LAND CRUISER', 'SEQUOIA', 'TUNDRA', 'GRAND CHEROKEE', 'QX60'];
    if (massiveSUVs.some(m => modelUpper.includes(m)) || brandUpper === 'LAND ROVER') return 2100;
    return 1650;
  }

  return 1450;
}

export function getSmartCCFallback(
  brand: string = '',
  model: string = '',
  weight: number,
  vehicleType: VehicleType = 'car'
): number {
  const brandUpper = brand.toUpperCase();
  const modelUpper = model.toUpperCase();

  // 1. Motorcycle Logic
  if (vehicleType === 'motorcycle') {
    if (weight < 150) return 125;
    if (weight < 220) return 250;
    if (weight < 300) return 500;
    return 800; // Heavy touring bikes
  }

  // 2. Truck / Commercial Logic
  if (vehicleType === 'truck') {
    if (weight < 4000) return 3000;
    if (weight < 7000) return 5000;
    return 7000;
  }

  // 3. Exotics & Supercars (Default to big engines)
  const exotics = ['PORSCHE', 'FERRARI', 'MASERATI', 'LAMBORGHINI', 'ROLLS', 'BENTLEY', 'ASTON'];
  if (exotics.some(b => brandUpper.includes(b))) return 3600;

  // 4. Performance Trim Detection (BMW M, Mercedes AMG, Audi RS, Dodge SRT)
  // This Regex catches things like "X4 M40I", "M5", "C63 AMG", "RS Q8", "TRX"
  const isPerformance = 
  modelUpper.includes('AMG') || 
  modelUpper.includes('SRT') || 
  modelUpper.includes('TRX') || 
  /\b(M\d+[A-Z]*|M|RS\d+|S\d+)\b/.test(modelUpper); // Added [A-Z]* to catch the 'I' or 'd'
  if (isPerformance) {
    // A heavy performance car is almost certainly a 3.0L V6/I6 or 4.0L V8
    if (weight > 1600) return 3000; 
    return 2000; // Lighter performance cars (like a John Cooper Works Mini)
  }

  // 5. Heavy American / Large SUVs (Often default to V6/V8)
  const largeAmerican = ['DODGE', 'RAM', 'CHEVROLET', 'GMC', 'CADILLAC', 'CHRYSLER', 'JEEP'];
  if (largeAmerican.some(b => brandUpper.includes(b)) && weight > 2000) return 3600;

  // 6. General Car/SUV Weight-to-CC Curve 
  // (Assuming 'weight' passed here is roughly Curb Weight or Gross Weight. 
  // These tiers represent modern engine downsizing trends)
  if (weight < 1100) return 1000; // Superminis (e.g., Kia Picanto)
  if (weight < 1350) return 1200; // Small hatchbacks/Crossovers (1.2 Turbo trend)
  if (weight < 1650) return 1500; // Family Sedans / Mid-size SUVs
  if (weight < 2000) return 2000; // Executive Sedans / Large SUVs
  if (weight < 2400) return 2500; // Heavy duty SUVs / Base Pickups
  
  return 3000; // Massive vehicles fallback
}

// ============================================================================
// CORE PHYSICS CALCULATIONS 
// ============================================================================

/**
 * Calculates aerodynamic properties dynamically based on classification
 */
function getAeroParams(vehicleType: VehicleType, isActualSUV: boolean, weight: number, estimatedCC: number) {
  const aero = { ...AERO_PARAMS[vehicleType] };

  if (vehicleType === 'car') {
    if (weight < 1150) {
      aero.A = 2.15; aero.Cd = 0.33; aero.Crr = 0.010;
    } else if (isActualSUV) {
      aero.A = 2.8; aero.Cd = 0.36; aero.Crr = 0.010;
    } else {
      aero.A = 2.30; aero.Cd = 0.29; aero.Crr = 0.009;
    }
  } else if (vehicleType === 'motorcycle') {
    if (weight > 220 && estimatedCC > 600) {
      aero.Cd = 0.55; aero.A = 0.70;
    } else if (weight < 210 && estimatedCC > 550) {
      aero.Cd = 0.45; aero.A = 0.55;
    } else {
      aero.Cd = 0.60; aero.A = 0.65;
    }
  } else if (vehicleType === 'truck') {
    if (weight < 4000) {
      aero.A = 3.5; aero.Cd = 0.42;
    } else if (weight < 10000) {
      aero.A = 5.5; aero.Cd = 0.55;
    } else {
      aero.A = 8.0; aero.Cd = 0.65;
    }
  }
  return aero;
}

/**
 * Calculates raw energy needed at the wheels (MJ/100km)
 */
function calculateEnergyDemands(vehicleType: VehicleType, weight: number, aero: { Cd: number; A: number; Crr: number }, isActualSUV: boolean): number {
  const avgSpeedMs = AVG_SPEED_KMH[vehicleType] / 3.6;

  const rollingEnergyMJ = (aero.Crr * weight * GRAVITY * DISTANCE) / 1000000;
  const dragEnergyMJ = (0.5 * aero.Cd * aero.A * AIR_DENSITY * Math.pow(avgSpeedMs, 2) * DISTANCE) / 1000000;
  const accelerationEnergyMJ = (weight / 1000) * ACCEL_FACTOR[vehicleType];
  const auxiliaryEnergyMJ = (rollingEnergyMJ + dragEnergyMJ + accelerationEnergyMJ) * AUXILIARY_FACTOR[vehicleType];

  let totalEnergyMJ = rollingEnergyMJ + dragEnergyMJ + accelerationEnergyMJ + auxiliaryEnergyMJ;
  const drivetrainEfficiency = isActualSUV ? 0.86 : 0.90;
  
  return totalEnergyMJ / drivetrainEfficiency;
}

/**
 * Calculates performance and age-based efficiency modifiers
 */
function calculateEfficiencyMultiplier(
  vehicleType: VehicleType, 
  weight: number, 
  estimatedCC: number, 
  isActualSUV: boolean, 
  year: number | undefined, 
  isHybrid: boolean | undefined,
  hybridType?: 'MHEV' | 'PHEV' | 'HEV' | null
): number {
  let expectedCC = vehicleType === 'motorcycle' ? weight * 2.5 
    : vehicleType === 'truck' ? 1500 + (weight * 0.35) 
    : isActualSUV ? weight * 1.4 
    : weight < 1200 ? weight * 1.15 : weight * 0.9;
  
  const ccRatio = estimatedCC / expectedCC;
  let multiplier = 1.0;

  if (vehicleType !== 'motorcycle') {
    if (ccRatio > 2.0) multiplier = 0.88;
    else if (ccRatio > 1.55) multiplier = 0.95;
    else if (ccRatio < 0.8) multiplier = 0.92;
  } else {
    if (estimatedCC > 550 && weight < 230) multiplier *= 0.55; 
    else if (estimatedCC > 900 && weight >= 230) multiplier *= 0.60;
    else multiplier *= 0.65; 
  }

  if (year && year >= 2016 && estimatedCC >= 950 && estimatedCC <= 1550 && weight >= 1200) {
    multiplier *= 1.08; 
  }

  if (isHybrid) {
    if (hybridType === 'MHEV') multiplier *= 1.08;
    else if (hybridType === 'HEV') multiplier *= 1.45;
    else if (hybridType === 'PHEV') multiplier *= 1.35;
    else multiplier *= 1.40; // Generic fallback
  }

  return multiplier * getEngineDisplacementFactor(estimatedCC);
}

/**
 * Main function: Calculates ICE fuel consumption
 */
export function calculateICEConsumptionEnhanced(params: {
  mishkal_kolel?: number;
  engineCC?: number;
  year?: number;
  fuelType: 'Gasoline' | 'Diesel';
  vehicleType?: VehicleType;
  isHybrid?: boolean;
  hybridType?: 'MHEV' | 'PHEV' | 'HEV' | null;
  isOfficialSUV?: boolean;
  brand?: string;
  model?: string;
}): number {
  //debugLog('\n🔧 ADVANCED ICE PHYSICS CALCULATION');

  const { fuelType, vehicleType = 'car' } = params;
  
  // 1. Weight calculation
  const weight = getEffectiveWeight(params.mishkal_kolel, false, vehicleType) || 
    { motorcycle: 200, car: 1500, truck: 3500 }[vehicleType];

  // 2. CC calculation
  const smartFallbackCC = getSmartCCFallback(params.brand || '', params.model || '', weight, vehicleType);
  const estimatedCC = (params.engineCC && params.engineCC > 0 && !(vehicleType === 'car' && params.engineCC > smartFallbackCC * 2.2))
    ? params.engineCC 
    : smartFallbackCC;

  // 3. SUV Classification & Aero
  const modelLower = (params.model || '').toLowerCase();
  const isFallbackSUV = (weight >= 1650 && !modelLower.includes('sedan')) || ['suv', 'cross', 'xc'].some(term => modelLower.includes(term));
  const isActualSUV = vehicleType === 'car' && (params.isOfficialSUV || isFallbackSUV);
  const aero = getAeroParams(vehicleType, isActualSUV, weight, estimatedCC);

  // 4. Energy Demand
  const totalEnergyMJ = calculateEnergyDemands(vehicleType, weight, aero, isActualSUV);

  // 5. & 6. Efficiency Calculation
  const baseEfficiency = getThermalEfficiency(params.year, fuelType);
const totalMultiplier = calculateEfficiencyMultiplier(vehicleType, weight, estimatedCC, isActualSUV, params.year, params.isHybrid, params.hybridType);  const finalEfficiency = baseEfficiency * totalMultiplier;

  // 7. Fuel Consumption
  const fuelEnergyMJ = FUEL_ENERGY_MJ[fuelType.toLowerCase()];
  const fuelLitersPer100Km = totalEnergyMJ / (fuelEnergyMJ * finalEfficiency);
  const kmPerL = 100 / fuelLitersPer100Km;

  // 8. Apply Bounds
  const bounds = CONSUMPTION_BOUNDS[vehicleType];
  const finalKmPerL = Math.max(bounds.min, Math.min(bounds.max, kmPerL));

  // Build the display name using the brand and model, with fallbacks
  const displayBrand = params.brand || 'Unknown Brand';
  const displayModel = params.model || 'Unknown Model';
  const vehicleFullName = `${displayBrand} ${displayModel}`.trim();

  // Print a detailed, clean summary
  debugLog('\n═══════════════════════════════════════');
  debugLog(`📋 CALCULATION SUMMARY: ${vehicleFullName}`);
  debugLog(`   Vehicle Type: ${vehicleType} ${isActualSUV ? '(SUV)' : ''}`);
  debugLog(`   Hybrid Tech: ${params.isHybrid ? (params.hybridType || 'YES') : 'NO'}`);
  debugLog(`   Used Weight: ${weight} kg`);
  debugLog(`   Engine CC: ${estimatedCC} cc`);
  debugLog(`✅ FINAL RESULT: ${finalKmPerL.toFixed(2)} km/L (${(100 / finalKmPerL).toFixed(2)} L/100km)`);
  debugLog('═══════════════════════════════════════\n');

  return parseFloat(finalKmPerL.toFixed(2));

}

// ============================================================================
// BRAND TRANSLATION
// ============================================================================

export function translateBrandToEnglish(hebrewBrand: string): string {
  // TODO: Populate map with common translations if required
  const brandMap: Record<string, string> = {};
  return brandMap[hebrewBrand] || hebrewBrand;
}