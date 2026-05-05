  // lib/data/fuelData.ts

  // ============================================================================
  // CONFIGURATION & UTILITIES
  // ============================================================================
  import AsyncStorage from '@react-native-async-storage/async-storage';
  import { estimateVehicleWeight } from './fuelConsumptionAdjustments';

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
    const cacheKey = `fallback_data_${params.brand}_${params.model}_${params.year}`;

    try {
      // 1. Local Cache Check (Local-First Architecture)
      const cachedData = await AsyncStorage.getItem(cacheKey);
      if (cachedData) return JSON.parse(cachedData);

      // 2. Offline Dictionary Fallback (Zero Network Dependency)
      if (params.brand && params.model) {
        const localEstimation = estimateVehicleWeight(params.brand, params.model, params.year);
        if (localEstimation) {
          // Pipeline uses mishkal_kolel (Gross). Dictionary stores Curb. We must convert it UP to Gross 
          // so getEffectiveWeight doesn't double-penalize it.
          const result = { mishkal_kolel: Math.round(localEstimation.curb / 0.75) }; 
          await AsyncStorage.setItem(cacheKey, JSON.stringify(result));
          debugLog(`[CheckFuel] 📦 Local Dictionary used for ${params.brand} ${params.model}`);
          return result;
        }
      }

      // 3. API Fallback (עם סננון נתונים מחמיר)
      const [rawWeight, engineCC] = await Promise.all([
        fetchWeightFromAPI(params),
        params.isElectric ? Promise.resolve(undefined) : fetchEngineCCFromAPI(params),
      ]);

      const isSUV = (params.model || '').toLowerCase().includes('suv') || (params.model || '').toLowerCase().includes('cross');
      const sanitizedWeight = sanitizeVehicleWeight(rawWeight, isSUV, !!params.isElectric, 'car');

      if (sanitizedWeight || engineCC) {
        const finalResult = {
          ...(sanitizedWeight && { mishkal_kolel: sanitizedWeight }),
          ...(engineCC && { nefach_manoa: engineCC }),
        };
        await AsyncStorage.setItem(cacheKey, JSON.stringify(finalResult));
        return finalResult;
      }
    } catch (error) {
      debugLog(`[CheckFuel] ❌ Error in fallback chain:`, error);
    }

    return undefined;
  }

  export interface WLTPDataResult {
    isOfficialSUV: boolean;
    isOfficialHybrid: boolean;
    hybridType: 'MHEV' | 'PHEV' | 'HEV' | null;
    wltpConsumption: number | null; // L/100km
    officialCC: number | null;
    officialGrossWeight: number | null;
  }

  export async function fetchWLTPData(record: any, fallbackDegemNm?: string): Promise<WLTPDataResult | null> {
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

      let hybridType: 'MHEV' | 'PHEV' | 'HEV' | null = null;
      if (isOfficialHybrid) {
        if (techField.includes('MHEV')) hybridType = 'MHEV';
        else if (techField.includes('PLUG') || techField.includes('PHEV')) hybridType = 'PHEV';
        else hybridType = 'HEV';
      }

      const category = (wltpRecord.qvutzat_rechev_nm || '').toString().toLowerCase();
      const type = (wltpRecord.merkav || '').toString().toLowerCase();
      const isOfficialSUV = ['פנאי', 'שטח'].some(term => category.includes(term) || type.includes(term));

      // Extract exact laboratory specs
      const officialCC = parseIntSafe(wltpRecord.nefah_manoa) || null;
      const officialGrossWeight = parseIntSafe(wltpRecord.mishkal_kolel) || null;

      // 1. Try to get direct consumption from the API
      let wltpConsumption = parseFloatSafe(wltpRecord.tzrichat_delek_mishulav) || null;

      // 2. Pro-Trick: Reverse-engineer from CO2 emissions if fuel consumption is missing
      if (!wltpConsumption) {
        const co2Emmissions = parseFloatSafe(wltpRecord.CO2_WLTP) || parseFloatSafe(wltpRecord.kamut_CO2);
        if (co2Emmissions && co2Emmissions > 0) {
          const isDiesel = (wltpRecord.delek_nm || '').toString().includes('דיזל');
          const co2Factor = isDiesel ? 26.4 : 23.8;
          wltpConsumption = co2Emmissions / co2Factor;
        }
      }

      return { isOfficialSUV, isOfficialHybrid, hybridType, wltpConsumption, officialCC, officialGrossWeight };
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
    let fClass: number;

    if (vehicleType === 'motorcycle') {
      // Rider and fluids typically add a static ~80kg, rather than a percentage.
      effectiveWeight = Math.max(120, mishkal_kolel - 80);
    } else if (vehicleType === 'truck') {
      // Commercial vehicles (N1, N2, N3) have drastic payload-to-weight ratios
      if (mishkal_kolel <= 3500) fClass = 0.60;      // N1 Light Commercial (e.g., Transit, Sprinter)
      else if (mishkal_kolel <= 7500) fClass = 0.55; // N2 Medium Duty
      else fClass = 0.45;                            // N3 Heavy Duty / Semi
      
      // EV commercial vehicles have heavier curb weights due to battery packs
      if (isEV) fClass += 0.08; 
      
      effectiveWeight = mishkal_kolel * fClass;
  } else {
    // Standard Passenger Cars (M1)
    fClass = isEV ? 0.85 : 0.75; 
    
    if (!isEV) {
      // 🛡️ THE COROLLA SHIELD: 
      // If a standard car shows >1900kg Gross Weight, it's almost certainly 
      // a mid-size sedan being reported with its MAX load weight.
      if (mishkal_kolel > 1900 && mishkal_kolel < 2400) fClass = 0.65; 
      else if (mishkal_kolel <= 1500) fClass = 0.70;
      else if (mishkal_kolel <= 2200) fClass = 0.73;
      else fClass = 0.68;
    }
    
    effectiveWeight = mishkal_kolel * fClass;
  }
    
    return Math.round(effectiveWeight);
  }


  /**
   * Validates and sanitizes raw weight data from the Gov.il API.
   * Prevents M1 passenger cars from registering as 2.5-ton commercial trucks.
   */
  export function sanitizeVehicleWeight(
    weight: number | undefined, 
    isSUV: boolean, 
    isEV: boolean, 
    vehicleType: VehicleType
  ): number | undefined {
    if (!weight) return undefined;
    
    if (vehicleType === 'car') {
      // 🚨 Sanity Check: Reject ghost weights under 800kg or absurd commercial weights over 3500kg for M1
      if (weight < 800 || weight > 3500) {
        debugLog(`[CheckFuel QA] 🚨 Critical anomaly detected: API returned ${weight}kg for M1 class. Rejecting data.`);
        return undefined;
      }
      
      // We removed the isCompact > 1800 limit. 
      // Gross Vehicle Weight (GVW) for standard cars is frequently between 1800kg - 2200kg.
      // getEffectiveWeight() will properly convert this GVW down to Curb Weight later.

    } else if (vehicleType === 'motorcycle') {
      if (weight > 600 || weight < 80) return 220; 
    }

    return weight;
  }

  export function estimateWeightBySegment(model: string, brand: string, isSUV: boolean): number {
    const modelUpper = model.toUpperCase();
    const brandUpper = brand.toUpperCase();

    // IMPORTANT: Returning GROSS weights (mishkal_kolel), NOT curb weights,
    // because getEffectiveWeight() will multiply these by ~0.75 later in the pipeline.

    const minivans = ['CARNIVAL', 'VOYAGER', 'SIENNA', 'PACIFICA', 'ODYSSEY', 'TRAJET', 'GRAND VOYAGER'];
    if (minivans.some(m => modelUpper.includes(m))) return 2650; // ~1980kg curb

    const miniModels = ['AYGO', 'I10', 'I20', 'PICANTO', '500', 'SPARK', 'MICRA', 'ALTO', 'STONIC'];
    if (miniModels.some(m => modelUpper.includes(m))) return 1300; // ~975kg curb

    const compactModels = ['COROLLA', 'FORTE', 'CIVIC', 'GOLF', 'MAZDA 3', 'OCTAVIA', 'FOCUS', 'HYUNDAI I30', 'ELANTRA', 'SENTRA'];
    if (compactModels.some(m => modelUpper.includes(m))) return 1760; // ~1320kg curb

    if (isSUV) {
      const massiveSUVs = ['PRADO', 'CHEROKEE', 'EXPLORER', 'PAJERO', 'CAYENNE', 'LAND CRUISER', 'SEQUOIA', 'TUNDRA', 'GRAND CHEROKEE', 'QX60', 'X5', 'X6', 'X7', 'Q7', 'Q8', 'G-CLASS'];
      if (massiveSUVs.some(m => modelUpper.includes(m)) || brandUpper === 'LAND ROVER' || brandUpper === 'JEEP') return 2800; // ~2100kg curb
      
      // Mid-size & Luxury Compact SUVs (e.g., BMW X4, Audi Q5)
      const premiumSUVs = ['X3', 'X4', 'Q5', 'MACAN', 'GLC', 'GLE', 'XC60'];
      if (premiumSUVs.some(m => modelUpper.includes(m))) return 2450; // ~1830kg curb

      return 2200; // Standard Crossover (~1650kg curb)
    }

    // Large executive sedans
    const execSedans = ['5 SERIES', 'E-CLASS', 'A6', 'S-CLASS', '7 SERIES', 'A8'];
    if (execSedans.some(m => modelUpper.includes(m))) return 2300; // ~1725kg curb

    return 1900; // Default standard car (~1425kg curb)
  }

  export function getSmartCCFallback(brand: string = '', model: string = '', weight: number, vehicleType: VehicleType = 'car'): number {
  const brandUpper = brand.toUpperCase();
  const modelUpper = model.toUpperCase();

  // 1. Performance Keyword Override (The Mustang/BMW/Z-Car Fix)
  if (modelUpper.includes('MUSTANG')) return 2300; // Default to EcoBoost 2.3L
  if (modelUpper.includes('CORVETTE') || modelUpper.includes('CAMARO')) return 3600;
  if (modelUpper.includes(' 3') && brandUpper.includes('MAZDA')) return 2000; // Mazda 3 default in IL
  if (modelUpper.includes('CX-5')) return 2000;

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
        // תיקון: מיתון הענישה האווירודינמית עבור SUV בטווח המשקלים 1,400-1,600 ק"ג
        if (weight >= 1400 && weight <= 1600) {
          aero.A = 2.55; aero.Cd = 0.335; aero.Crr = 0.010; 
        } else {
          aero.A = 2.8; aero.Cd = 0.36; aero.Crr = 0.010;
        }
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
    // 🏎️ Performance MHEV Check: If it's a massive engine, it's a performance mild-hybrid (like BMW M40i), not a Prius.
    if (estimatedCC > 2500 && hybridType !== 'PHEV') {
      multiplier *= 1.05; // Minimal MHEV assist
    } else if (hybridType === 'MHEV') {
      multiplier *= 1.08;
    } else if (hybridType === 'HEV') {
      multiplier *= 1.45;
    } else if (hybridType === 'PHEV') {
      multiplier *= 1.35;
    } else {
      multiplier *= 1.25; // Lowered generic fallback to prevent skewing
    }
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
  const modelUpper = (params.model || '').toUpperCase();
  
  let safeGrossWeight = params.mishkal_kolel;
  let safeCC = params.engineCC;
  let safeSUV = params.isOfficialSUV;

  // 🛡️ THE HALLUCINATION SHIELD (Global Physics Override)
  if (vehicleType === 'car') {
    // Protect Corolla from commercial truck weights & fake SUV tags
    if (modelUpper.includes('COROLLA') && !modelUpper.includes('CROSS')) {
      safeSUV = false; 
      if (safeGrossWeight && safeGrossWeight > 1900) safeGrossWeight = 1760; // Max realistic Gross Weight
    }
    // Protect Mazda 3 from rare 2.5L import engines
    if (modelUpper.includes('MAZDA 3') || modelUpper.includes('MAZDA3')) {
      if (safeCC && safeCC > 2000) safeCC = 2000;
    }
    // Protect Mustang from missing weights and generic CCs
    if (modelUpper.includes('MUSTANG')) {
      if (!safeGrossWeight || safeGrossWeight < 1900) safeGrossWeight = 2150; 
      if (safeCC && safeCC !== 5000) safeCC = 2300; 
    }
  }
  
  // 1. Weight calculation (Using the shielded weight)
  const weight = getEffectiveWeight(safeGrossWeight, false, vehicleType) || 
    { motorcycle: 200, car: 1500, truck: 3500 }[vehicleType];

  // 2. CC calculation (Using the shielded CC)
  const smartFallbackCC = getSmartCCFallback(params.brand || '', params.model || '', weight, vehicleType);
  const estimatedCC = (safeCC && safeCC > 0 && !(vehicleType === 'car' && safeCC > smartFallbackCC * 2.2))
    ? safeCC 
    : smartFallbackCC;

  // 3. SUV Classification & Aero (Using the shielded SUV tag)
  const isFallbackSUV = (weight >= 1650 && !modelUpper.includes('SEDAN')) || ['SUV', 'CROSS', 'XC'].some(term => modelUpper.includes(term));
  const isActualSUV = vehicleType === 'car' && (safeSUV || isFallbackSUV);
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
  // BRAND TRANSLATION & SANITIZATION
  // ============================================================================

  /**
   * Comprehensive mapping of Hebrew brand names to English equivalents.
   * Keys are Hebrew base names (without geographic suffixes).
   * Values are normalized English brand names for O(1) VEHICLE_WEIGHT_DATABASE lookup.
   */
  const BRAND_ALIASES: Record<string, string> = {
    // ========================================================================
    // JAPANESE MANUFACTURERS
    // ========================================================================
    'טויוטה': 'Toyota',
    'לקסוס': 'Lexus',
    'הונדה': 'Honda',
    'אקורה': 'Acura',
    'מאזדה': 'Mazda',
    'ניסאן': 'Nissan',
    'אינפיניטי': 'Infiniti',
    'סובארו': 'Subaru',
    'סוזוקי': 'Suzuki',
    'מיצובישי': 'Mitsubishi',
    'דייהצו': 'Daihatsu',
    'איזוזו': 'Isuzu',

    // ========================================================================
    // KOREAN MANUFACTURERS
    // ========================================================================
    'קיה': 'Kia',
    'יונדאי': 'Hyundai',
    'היונדאי': 'Hyundai', // Variant with definite article
    'ג\'נסיס': 'Genesis',
    'סנטרה': 'Hyundai', // Hyundai model often appears as brand

    // ========================================================================
    // GERMAN MANUFACTURERS
    // ========================================================================
    'בנץ': 'Mercedes-Benz',
    'מרצדס': 'Mercedes-Benz',
    'מרצדס בנץ': 'Mercedes-Benz',
    'BMW': 'BMW',
    'אודי': 'Audi',
    'אאודי': 'Audi', // Variant
    'פולקסווגן': 'Volkswagen',
    'וולקסווגן': 'Volkswagen', // Variant spelling
    'פורשה': 'Porsche',
    'פיאו': 'Porsche',

    // ========================================================================
    // EUROPEAN MANUFACTURERS
    // ========================================================================
    'פיאט': 'Fiat',
    'אלפא רומאו': 'Alfa Romeo',
    'רנו': 'Renault',
    'סיטרואן': 'Citroen',
    'פיג\'ו': 'Peugeot',
    'וולוו': 'Volvo',
    'סקנדיה': 'Scania',
    'מן': 'MAN',
    'דלהאטסו': 'Daihatsu',
    "מזדה": 'Mazda',

    // ========================================================================
    // AMERICAN MANUFACTURERS
    // ========================================================================
    'שברולט': 'Chevrolet',
    'פורד': 'Ford',
    'קדילאק': 'Cadillac',
    'ג\'יפ': 'Jeep',
    'דודג\'': 'Dodge',
    'ראם': 'RAM',
    'GMC': 'GMC',
    'הממר': 'Hummer',

    // ========================================================================
    // BRITISH MANUFACTURERS
    // ========================================================================
    'לנד רובר': 'Land Rover',
    'ג\'ה': 'Jaguar',
    'ג\'אגואר': 'Jaguar',
    'לוטוס': 'Lotus',
    'רולס רויס': 'Rolls-Royce',
    'בנטלי': 'Bentley',

    // ========================================================================
    // OTHER MANUFACTURERS
    // ========================================================================
    'טאטא': 'Tata',
    'מהינדרה': 'Mahindra',
    'בירלה': 'Mahindra',
  };

  /**
   * Geographic location suffixes that may be appended to brand names.
   * These are removed during brand normalization to avoid cache misses.
   * Examples: 'טויוטה יפן' -> 'טויוטה'
   */
  const GEOGRAPHIC_SUFFIXES: Set<string> = new Set([
    'יפן',             // Japan
    'דרום קוריאה',      // South Korea
    'צפון קוריאה',      // North Korea
    'גרמניה',          // Germany
    'בריטניה',         // Britain / UK
    'אנגליה',          // England
    'אמריקה',          // America
    'ארה"ב',           // USA (alternate)
    'ארה״ב',           // USA (with Hebrew quotes)
    'פרנסה',           // France
    'איטליה',          // Italy
    'ספרד',            // Spain
    'שוודיה',          // Sweden
    'נורווגיה',        // Norway
    'דנמרק',           // Denmark
    'הולנד',           // Netherlands
    'בלגיה',           // Belgium
    'הודו',            // India
    'בהודו',           // In India
    'תאילנד',          // Thailand
    'טיוואן',          // Taiwan
    'סין',             // China
    'מלזיה',           // Malaysia
    'תהצ"ם',  
            // Thai (abbreviation)
  ]);

  /**
   * Sanitizes and normalizes a brand string by:
   * 1. Trimming whitespace
   * 2. Removing geographic location suffixes
   * 3. Converting to standard English names via BRAND_ALIASES
   *
   * This ensures O(1) cache hits in VEHICLE_WEIGHT_DATABASE regardless
   * of how the external API formats the brand name.
   *
   * @param dirtyBrand - Raw brand string from API (may be Hebrew with geographic suffix)
   * @returns Normalized English brand name for database lookup
   *
   * @example
   * // API returns: 'טויוטה יפן'
   * // Returns: 'Toyota'
   *
   * @example
   * // API returns: 'קיה דרום קוריאה'
   * // Returns: 'Kia'
   */
  export function translateBrandToEnglish(dirtyBrand: string | null | undefined): string {
    // ========================================================================
    // STEP 1: HANDLE NULL/UNDEFINED/EMPTY INPUTS
    // ========================================================================
    if (dirtyBrand == null || typeof dirtyBrand !== 'string') {
      return 'Unknown';
    }

    // ========================================================================
    // STEP 2: NORMALIZE THE INPUT STRING
    // ========================================================================
    let normalized = dirtyBrand.trim();

    // Early return for empty strings
    if (normalized.length === 0) {
      return 'Unknown';
    }

    // ========================================================================
    // STEP 3: REMOVE GEOGRAPHIC SUFFIXES
    // ========================================================================
    // Iterate through known suffixes and remove them if found at the end
    for (const suffix of GEOGRAPHIC_SUFFIXES) {
      const suffixPattern = new RegExp(`\\s*${suffix}\\s*$`, 'i');
      normalized = normalized.replace(suffixPattern, '').trim();
    }

    // ========================================================================
    // STEP 4: LOOKUP IN BRAND_ALIASES
    // ========================================================================
    // Iterate through BRAND_ALIASES keys to find substring matches.
    // We use .includes() to handle partial matches (dirty data robustness).
    for (const [hebrewKey, englishValue] of Object.entries(BRAND_ALIASES)) {
      if (normalized.includes(hebrewKey)) {
        return englishValue;
      }
    }

    // ========================================================================
    // STEP 5: FALLBACK - RETURN SANITIZED ORIGINAL
    // ========================================================================
    // If no match found in BRAND_ALIASES, return the sanitized string
    // (with geographic suffixes removed).
    // This allows the database lookup to fail gracefully and use estimateWeightBySegment() fallback.
    return normalized || 'Unknown';
  }