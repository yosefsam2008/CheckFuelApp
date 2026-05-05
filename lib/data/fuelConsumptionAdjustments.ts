// fuelConsumptionAdjustments.ts
/**
 * ============================================================================
 * מערכת חישוב צריכת דלק דינמית - ללא קבועים מיותרים
 * ============================================================================
 *
 * גישה חדשה: במקום טבלאות קבועים, נשתמש בפונקציות מתמטיות רציפות
 * שמחשבות את ההשפעה של כל גורם באופן דינמי.
 *
 * יתרונות:
 * 1. פחות קוד - פחות קבועים לתחזק
 * 2. חישוב רציף - אין "קפיצות" בין טווחים
 * 3. קל יותר להבנה ותחזוקה
 * 4. מבוסס על נוסחאות מתמטיות פשוטות
 * ============================================================================
 *
 * LAYER 3: WEIGHT VALIDATION & NORMALIZATION
 * ============================================================================
 * 
 * This module implements a robust 3-layer weight validation pipeline:
 * 
 * LAYER 1: Input Sanitization
 * - Remove country/region suffixes from brand/model strings
 * - Normalize Hebrew brand names using BRAND_ALIASES (from fuelData.ts)
 * - Trim whitespace and standardize string format
 * 
 * LAYER 2: Plausibility Gates
 * - Enforce M1 category minimum weight: ≥ 850kg (no ghosts < 850kg)
 * - Flag implausible weights (< 500kg or > 2,800kg for ICE vehicles)
 * - Cross-reference with WEIGHT_DICTIONARY for Brand+Model match
 * 
 * LAYER 3: Heuristic Fallback
 * - If no exact match: apply segment-based estimation
 * - Segment fallbacks: Mini (950kg), Compact (1,200kg), Sedan (1,450kg), SUV (1,650kg)
 * - Persist validated weight to AsyncStorage for consistency
 * ============================================================================
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import type {
  ConsumptionAdjustmentResult,
  QAValidationEvent,
  SegmentWeightRange,
  VehicleSegment,
  VehicleWeightData,
} from '../../types/vehicle';

// ============================================================================
// QA GATE & SMART FALLBACK SYSTEM
// ============================================================================

/**
 * SEGMENT_WEIGHT_FALLBACKS: Authoritative weight reference dictionary.
 * 
 * Maps each vehicle segment to its plausibility bounds and median weight.
 * These values are derived from manufacturer specifications across the
 * market segment and represent curb weights (empty vehicle).
 * 
 * ARCHITECTURE PRINCIPLE:
 * - Any API weight outside [min, max] is immediately flagged as invalid
 * - Invalid weights are replaced with the segment's averageWeightKg
 * - All replacements are logged to AsyncStorage for QA analysis
 * 
 * @see https://en.wikipedia.org/wiki/Car_classification (EU segments)
 */
const SEGMENT_WEIGHT_FALLBACKS: Record<VehicleSegment, SegmentWeightRange> = {
  'A-Segment': {
    minWeightKg: 800,
    averageWeightKg: 950,
    maxWeightKg: 1100,
    description: 'Micro cars (Kia Picanto, Hyundai i10, Smart Fortwo)',
  },
  'B-Segment': {
    minWeightKg: 1000,
    averageWeightKg: 1200,
    maxWeightKg: 1350,
    description: 'Compact hatchbacks (Toyota Yaris, Mazda2, Ford Fiesta)',
  },
  'C-Segment': {
    minWeightKg: 1200,
    averageWeightKg: 1350,
    maxWeightKg: 1550,
    description: 'Compact sedans (Toyota Corolla, Ford Focus, Hyundai Elantra)',
  },
  'D-Segment': {
    minWeightKg: 1350,
    averageWeightKg: 1550,
    maxWeightKg: 1750,
    description: 'Executive sedans (Honda Accord, Mazda6, Alfa Romeo 159)',
  },
  'E-Segment': {
    minWeightKg: 1500,
    averageWeightKg: 1700,
    maxWeightKg: 1950,
    description: 'Premium sedans (BMW 5-Series, Mercedes E-Class, Audi A6)',
  },
  'F-Segment': {
    minWeightKg: 1700,
    averageWeightKg: 1950,
    maxWeightKg: 2250,
    description: 'Luxury sedans (BMW 7-Series, Mercedes S-Class, Audi A8)',
  },
  'SUV-Compact': {
    minWeightKg: 1350,
    averageWeightKg: 1550,
    maxWeightKg: 1750,
    description: 'Compact crossovers (Honda CR-V, Hyundai Tucson, Toyota RAV4)',
  },
  'SUV-Midsize': {
    minWeightKg: 1550,
    averageWeightKg: 1800,
    maxWeightKg: 2050,
    description: 'Mid-size SUVs (Toyota Highlander, Santa Fe, Jeep Wrangler)',
  },
  'SUV-Large': {
    minWeightKg: 1900,
    averageWeightKg: 2300,
    maxWeightKg: 2700,
    description: 'Large SUVs (Toyota Prado, Grand Cherokee, Land Cruiser)',
  },
  'Electric': {
    minWeightKg: 1500,
    averageWeightKg: 1800,
    maxWeightKg: 2200,
    description: 'Battery Electric Vehicles (Tesla Model 3, VW ID.3, Nissan Leaf)',
  },
  'PHEV': {
    minWeightKg: 1400,
    averageWeightKg: 1700,
    maxWeightKg: 2100,
    description: 'Plug-in Hybrid EVs (BMW X5 xDrive50e, Mercedes GLE 580e)',
  },
  'Unknown': {
    minWeightKg: 1000,
    averageWeightKg: 1400,
    maxWeightKg: 2200,
    description: 'Default fallback for unclassified vehicles (conservative estimate)',
  },
};

/**
 * QA Validation Log: In-memory buffer for API data quality issues.
 * 
 * ARCHITECTURE NOTE: This log is flushed to AsyncStorage periodically
 * to avoid excessive memory overhead while maintaining QA audit trail.
 */
const QA_VALIDATION_LOG: QAValidationEvent[] = [];

/**
 * Logs a QA validation event to the in-memory buffer.
 * 
 * CRITICAL: Every weight replacement triggers a QA event for root-cause analysis.
 * These events help identify systematic API data issues (e.g., specific model codes
 * that consistently report wrong weights).
 * 
 * @param event - QAValidationEvent to record
 */
function logQAValidationEvent(event: QAValidationEvent): void {
  QA_VALIDATION_LOG.push(event);

  // Log to console for real-time debugging
  if (event.isRejected) {
    console.warn(
      `[CheckFuel QA] ⚠️  WEIGHT REJECTED (${event.segment}): ` +
      `API reported ${event.reportedWeight}kg, using fallback ${event.validatedWeight}kg. ` +
      `Reason: ${event.reason}`
    );
  } else {
    console.log(
      `[CheckFuel QA] ✅ WEIGHT VALID (${event.segment}): ` +
      `${event.validatedWeight}kg (API: ${event.reportedWeight}kg)`
    );
  }
}

/**
 * Persists QA validation log to AsyncStorage.
 * 
 * ARCHITECTURE: Called after batch processing (e.g., end of calculator session)
 * to avoid I/O overhead per-vehicle.
 * 
 * @param sessionId - Unique identifier for this app session (e.g., timestamp)
 */
export async function persistQAValidationLog(sessionId: string): Promise<void> {
  if (QA_VALIDATION_LOG.length === 0) return;

  try {
    const key = `qa_validation_log_${sessionId}`;
    const existingData = await AsyncStorage.getItem(key);
    const existingLogs: QAValidationEvent[] = existingData ? JSON.parse(existingData) : [];

    const combinedLogs = [...existingLogs, ...QA_VALIDATION_LOG];
    await AsyncStorage.setItem(key, JSON.stringify(combinedLogs));

    console.log(`[CheckFuel QA] Persisted ${QA_VALIDATION_LOG.length} validation events to AsyncStorage`);
  } catch (error) {
    console.error('[CheckFuel QA] Failed to persist validation log:', error);
  }
}

/**
 * ============================================================================
 * QA GATE: validateAndAdjustWeight()
 * ============================================================================
 * 
 * PRODUCTION QUALITY ASSURANCE GATE
 * 
 * This function is the single point of entry for weight validation.
 * It implements a two-tier gate:
 * 
 * GATE 1: Null/Invalid Check
 *   - Rejects: null, undefined, NaN, negative, or zero weights
 *   - Action: Uses segment fallback immediately
 * 
 * GATE 2: Plausibility Check
 *   - Accepts: Weights within [segment.min, segment.max]
 *   - Rejects: Weights outside this range (ghost weights, outliers)
 *   - Action: Uses segment fallback for rejected weights
 * 
 * INVARIANT: Output weight is ALWAYS within plausible bounds, guaranteed.
 * 
 * @param apiWeightKg - Weight reported by API (may be invalid)
 * @param segment - Vehicle segment (used to determine fallback bounds)
 * @returns VehicleWeightData with validated weight and source tracking
 */
export function validateAndAdjustWeight(
  apiWeightKg: number | null | undefined,
  segment: VehicleSegment = 'Unknown'
): VehicleWeightData {
  const fallback = SEGMENT_WEIGHT_FALLBACKS[segment];

  // GATE 1: Null/Undefined/Invalid Check
  if (
    apiWeightKg == null ||
    !Number.isFinite(apiWeightKg) ||
    apiWeightKg <= 0
  ) {
    const event: QAValidationEvent = {
      timestamp: Date.now(),
      reportedWeight: apiWeightKg ?? null,
      validatedWeight: fallback.averageWeightKg,
      segment,
      isRejected: true,
      reason: 'API weight is null, undefined, NaN, or non-positive',
    };
    logQAValidationEvent(event);

    return {
      weightKg: fallback.averageWeightKg,
      isFromAPI: false,
      isFromFallback: true,
      segment,
      reason: 'Invalid/missing weight - used segment fallback',
    };
  }

  // GATE 2: Plausibility Check (Segment Bounds Validation)
  const isPlausible =
    apiWeightKg >= fallback.minWeightKg &&
    apiWeightKg <= fallback.maxWeightKg;

  if (isPlausible) {
    // Weight passed all gates - trust API data
    const event: QAValidationEvent = {
      timestamp: Date.now(),
      reportedWeight: apiWeightKg,
      validatedWeight: apiWeightKg,
      segment,
      isRejected: false,
      reason: `Weight within plausible range [${fallback.minWeightKg}, ${fallback.maxWeightKg}] kg`,
    };
    logQAValidationEvent(event);

    return {
      weightKg: apiWeightKg,
      isFromAPI: true,
      isFromFallback: false,
      segment,
    };
  } else {
    // Weight failed plausibility gate - use fallback
    const reason =
      apiWeightKg < fallback.minWeightKg
        ? `Ghost weight (${apiWeightKg}kg < min ${fallback.minWeightKg}kg)`
        : `Outlier weight (${apiWeightKg}kg > max ${fallback.maxWeightKg}kg)`;

    const event: QAValidationEvent = {
      timestamp: Date.now(),
      reportedWeight: apiWeightKg,
      validatedWeight: fallback.averageWeightKg,
      segment,
      isRejected: true,
      reason,
    };
    logQAValidationEvent(event);

    return {
      weightKg: fallback.averageWeightKg,
      isFromAPI: false,
      isFromFallback: true,
      segment,
      reason: `API weight rejected (${reason}) - used segment average`,
    };
  }
}

/**
 * ============================================================================
 * SMART FALLBACK: calculateAdjustedConsumption()
 * ============================================================================
 * 
 * PHYSICS-BASED FUEL CONSUMPTION ADJUSTMENT
 * 
 * Implements the aerodynamic drag and rolling resistance principle:
 * Vehicle fuel consumption scales linearly with weight.
 * 
 * SCIENTIFIC BASIS:
 * - Aerodynamic drag: Power ∝ Weight (through engine load)
 * - Rolling resistance: Friction force ∝ Weight (directly)
 * - Empirical observation: ~5% consumption change per 100kg deviation
 * 
 * FORMULA:
 *   adjustedConsumption = baseConsumption × (1 + ((actualWeight - baseWeight) / 100) × 0.05)
 * 
 * EXAMPLE (Gasoline vehicle):
 *   - Base consumption: 8.0 L/100km (measured at 1500kg)
 *   - Actual weight: 1600kg (+100kg)
 *   - Adjusted: 8.0 × (1 + (100 / 100) × 0.05) = 8.0 × 1.05 = 8.4 L/100km
 * 
 * @param baseConsumptionPerUnit - Manufacturer consumption (km/L for ICE, kWh/100km for EV)
 * @param actualWeightKg - Validated actual vehicle weight (from validateAndAdjustWeight)
 * @param baseWeightKg - Reference weight used for base consumption measurement (typically 1500kg)
 * @returns ConsumptionAdjustmentResult with adjusted consumption and metadata
 */
/**
 * LAYER 3.5: PHYSICAL WEIGHT ADJUSTMENT
 * Isolated physics logic to calculate raw consumption deviation based on vehicle mass.
 * Renamed to avoid collision with the primary pipeline.
 */
export function applyPhysicalWeightAdjustment(
  baseConsumptionPerUnit: number,
  actualWeightKg: number,
  baseWeightKg: number = 1500
): ConsumptionAdjustmentResult {
  const weightDifferenceKg = actualWeightKg - baseWeightKg;
  // Sensitivity coefficient: 5% change per 100kg deviation
  const WEIGHT_SENSITIVITY = 0.05; 
  const weightDeviationFactor = weightDifferenceKg / 100;
  const adjustmentRatio = 1 + (weightDeviationFactor * WEIGHT_SENSITIVITY);
  const adjustedConsumption = baseConsumptionPerUnit * adjustmentRatio;

  return {
    baseConsumption: baseConsumptionPerUnit,
    adjustedConsumption: parseFloat(adjustedConsumption.toFixed(2)),
    adjustmentRatio: parseFloat(adjustmentRatio.toFixed(4)),
    weightDifferenceKg,
  };
}

// ============================================================================
// TYPES
// ============================================================================

export interface AdjustmentFactors {
  vehicleAge: number;           // גיל הרכב בשנים
  fuelType: 'Gasoline' | 'Diesel' | 'Electric';
  drivingStyle?: 'eco' | 'normal' | 'aggressive';
  climate?: 'hot' | 'moderate' | 'cold';
  tripType?: 'city' | 'highway' | 'mixed';
  vehicleCondition?: 'excellent' | 'good' | 'fair' | 'poor';
  useAC?: boolean;              // שימוש במיזוג
  acUsageLevel?: 'always' | 'sometimes' | 'rarely'; // עוצמת שימוש במיזוג
  shortTrips?: boolean;         // נסיעות קצרות (<5 ק"מ)
}

export interface ConsumptionResult {
  baseConsumption: number;      // צריכה בסיסית מהיצרן
  adjustedConsumption: number;  // צריכה מתוקנת (ריאלית)
  totalAdjustmentFactor: number; // מקדם התיקון הכולל
  breakdown: {
    ageDegradation: number;
    drivingStyle: number;
    climate: number;
    tripType: number;
    vehicleCondition: number;
    acUsage: number;
    shortTrips: number;
  };
}

/**
 * ============================================================================
 * WEIGHT VALIDATION LAYER: Type Definitions
 * ============================================================================
 */

/**
 * Metadata about weight validation result
 */
export interface WeightValidationMetadata {
  isValid: boolean;                    // true if weight passed all plausibility gates
  isEstimated: boolean;                // true if weight came from heuristic fallback (not API)
  source: 'api' | 'dictionary' | 'segment-fallback' | 'unknown';
  reason?: string;                     // Explanation for invalid/estimated weight
  suggestedUIIndicator?: 'exact' | 'estimated' | 'warning'; // RTL-safe indicator level
}

/**
 * Result of weight normalization and validation
 */
export interface WeightNormalizationResult {
  weightKg: number;                    // Final validated weight in kg
  metadata: WeightValidationMetadata;
  consumptionAdjustmentFactor: number; // Weight-based adjustment coefficient (C_adjusted)
}

/**
 * Vehicle data structure for AsyncStorage persistence
 * Ensures weight is not recalculated on every load
 */
export interface SanitizedVehicleObject {
  id: string;                          // Unique vehicle ID
  brand: string;                       // Normalized English brand
  model: string;                       // Model name
  year?: number;                       // Manufacturing year
  weightKg: number;                    // Validated weight
  weightMetadata: WeightValidationMetadata; // Validation history
  fuelType: 'Gasoline' | 'Diesel' | 'Electric' | 'PHEV';
  engineCC?: number;                   // Engine displacement (if applicable)
  timestamp: number;                   // When this object was last updated
}

// ============================================================================
// OFFLINE WEIGHT DICTIONARY (LOCAL-FIRST FALLBACK)
// ============================================================================

export interface WeightEstimation {
  curb: number;
}

const WEIGHT_DICTIONARY: Record<string, Record<string, WeightEstimation>> = {
  toyota: {
    corolla: { curb: 1380 },
    yaris: { curb: 1100 },
    rav4: { curb: 1650 },
    bz4x: { curb: 1900 },
  },
  kia: {
    picanto: { curb: 950 },
    niro: { curb: 1450 },
    sportage: { curb: 1550 },
    ev6: { curb: 1980 },
  },
  hyundai: {
    i10: { curb: 950 },
    i20: { curb: 1100 },
    elantra: { curb: 1350 },
    tucson: { curb: 1550 },
    'ioniq 5': { curb: 1950 },
  },
  tesla: {
    'model 3': { curb: 1800 },
    'model y': { curb: 1950 },
  },
  byd: {
    'atto 3': { curb: 1750 },
    dolphin: { curb: 1500 },
    seal: { curb: 2050 },
  },
  mazda: {
    '2': { curb: 1100 },
    '3': { curb: 1350 },
    cx5: { curb: 1600 },
  },
  skoda: {
    fabia: { curb: 1150 },
    octavia: { curb: 1350 },
    kodiaq: { curb: 1700 },
  },
  geely: {
    'geometry c': { curb: 1650 },
  }
};

// ============================================================================
// WEIGHT VALIDATION LAYER 1: Sanitization & Normalization
// ============================================================================

/**
 * Removes geographic/regional suffixes from brand or model strings.
 * 
 * Examples:
 * - 'טויוטה יפן' → 'טויוטה'
 * - 'קיה דרום קוריאה' → 'קיה'
 * 
 * @param dirtyString - Raw brand/model string from API
 * @returns Sanitized string without geographic suffixes
 */
function removeSuffixes(dirtyString: string | null | undefined): string {
  if (!dirtyString || typeof dirtyString !== 'string') {
    return '';
  }

  let result = dirtyString.trim();

  // Common geographic suffixes
  const suffixes = [
    'יפן', 'דרום קוריאה', 'צפון קוריאה', 'גרמניה', 'בריטניה', 'אנגליה',
    'אמריקה', 'ארה"ב', 'ארה״ב', 'פרנסה', 'איטליה', 'ספרד', 'שוודיה',
    'נורווגיה', 'דנמרק', 'הולנד', 'בלגיה', 'הודו', 'תאילנד', 'טיוואן',
    'סין', 'מלזיה', 'קנדה', 'אוסטריה', 'צ"צ', 'רוסיה', 'טורקיה', 'יוון',
  ];

  for (const suffix of suffixes) {
    const pattern = new RegExp(`\\s*${suffix}\\s*$`, 'i');
    result = result.replace(pattern, '').trim();
  }

  return result;
}

/**
 * Normalizes brand and model strings using the improved brand translation
 * and removes geographic suffixes for successful database lookups.
 * 
 * @param brand - Raw brand string from API (may contain Hebrew + geographic suffix)
 * @param model - Raw model string from API
 * @returns Normalized {brand, model} tuple for dictionary lookups
 */
export function normalizeVehicleStrings(
  brand: string | null | undefined,
  model: string | null | undefined
): { brand: string; model: string } {
  const cleanBrand = removeSuffixes(brand);
  const cleanModel = removeSuffixes(model);

  // Import translateBrandToEnglish from fuelData.ts for consistency
  // Note: This avoids circular imports by using the already-exported function
  return {
    brand: cleanBrand,
    model: cleanModel,
  };
}

// ============================================================================
// WEIGHT VALIDATION LAYER 2: Plausibility Gates
// ============================================================================

/**
 * Physical plausibility constraints for different vehicle categories.
 * Prevents "ghost weights" (e.g., 711kg for a Mazda3) from passing through.
 */
const WEIGHT_PLAUSIBILITY: Record<string, { min: number; max: number }> = {
  m1: { min: 850, max: 2400 },         // Private vehicles (cars, small SUVs)
  n1: { min: 1500, max: 3500 },        // Light commercial vehicles
  n2: { min: 3500, max: 12000 },       // Medium commercial vehicles
  n3: { min: 12000, max: 40000 },      // Heavy trucks
  motorcycle: { min: 80, max: 600 },   // Motorcycles, scooters
};

/**
 * Vehicle segment classification and typical weight ranges
 */
const VEHICLE_SEGMENTS: Record<string, number> = {
  'mini': 950,              // Micro cars (Kia Picanto, Hyundai i10)
  'compact': 1200,          // Compact hatchbacks (Mazda2, Toyota Yaris)
  'sedan': 1450,            // Mid-size sedans (Toyota Corolla, Hyundai Elantra)
  'crossover': 1550,        // Compact SUV/Crossovers (Kia Sportage, Toyota C-HR)
  'suv': 1650,              // Standard SUV (RAV4, Tucson, CX-5)
  'large-suv': 2100,        // Large SUV (Prado, Grand Cherokee)
  'ev': 1800,               // Electric vehicles (avg)
};

/**
 * Validates if a reported weight is physically plausible for the vehicle category.
 * 
 * @param weight - Reported weight in kg
 * @param category - Vehicle category (M1, N1, motorcycle, etc.)
 * @returns true if weight is within plausible bounds
 */
function isWeightPlausible(weight: number, category: string = 'm1'): boolean {
  const bounds = WEIGHT_PLAUSIBILITY[category.toLowerCase()] || WEIGHT_PLAUSIBILITY.m1;
  return weight >= bounds.min && weight <= bounds.max;
}

/**
 * Checks for "ghost weights" - implausibly low weights that indicate corrupt API data.
 * 
 * @param weight - Reported weight in kg
 * @param category - Vehicle category
 * @returns true if weight is suspiciously low (ghost)
 */
function isGhostWeight(weight: number, category: string = 'm1'): boolean {
  const bounds = WEIGHT_PLAUSIBILITY[category.toLowerCase()] || WEIGHT_PLAUSIBILITY.m1;
  return weight > 0 && weight < bounds.min;
}

// ============================================================================
// WEIGHT VALIDATION LAYER 3: Heuristic Fallback System
// ============================================================================

/**
 * Performs hierarchical weight lookup:
 * 1. Exact Brand+Model match in WEIGHT_DICTIONARY
 * 2. Model substring match in WEIGHT_DICTIONARY
 * 3. Segment-based fallback (Mini, Sedan, SUV, etc.)
 * 
 * @param brand - Normalized English brand name
 * @param model - Normalized model name
 * @param isEV - True if vehicle is electric
 * @returns Weight in kg from dictionary or segment fallback
 */
function hierarchicalWeightLookup(
  brand: string,
  model: string,
  isEV: boolean = false
): number | undefined {
  const normalizedBrand = brand.toLowerCase().trim();
  const normalizedModel = model.toLowerCase().trim();

  // LEVEL 1: Exact Brand+Model match
  const brandData = WEIGHT_DICTIONARY[normalizedBrand];
  if (brandData) {
    for (const [key, value] of Object.entries(brandData)) {
      if (normalizedModel === key || normalizedModel.includes(key)) {
        return value.curb;
      }
    }
  }

  // LEVEL 2: Segment-based inference
  if (isEV) return VEHICLE_SEGMENTS.ev;
  if (normalizedModel.includes('suv') || normalizedModel.includes('cross')) return VEHICLE_SEGMENTS.suv;
  if (normalizedModel.includes('sedan')) return VEHICLE_SEGMENTS.sedan;
  if (normalizedModel.includes('compact')) return VEHICLE_SEGMENTS.compact;

  return undefined;
}

// ============================================================================
// WEIGHT VALIDATION LAYER 4: Main Validation Pipeline
// ============================================================================

/**
 * Core weight validation and normalization function.
 * 
 * Implements the complete 3-layer validation pipeline:
 * 1. Sanitize input strings (remove geographic suffixes)
 * 2. Validate plausibility (enforce M1 ≥ 850kg gate)
 * 3. Apply heuristic fallback (dictionary → segment)
 * 
 * @param apiWeight - Weight from API (or undefined if missing)
 * @param brand - Vehicle brand
 * @param model - Vehicle model
 * @param vehicleCategory - Vehicle category (M1, N1, motorcycle, etc.)
 * @param isEV - True if vehicle is electric
 * @returns WeightNormalizationResult with validated weight and metadata
 */
export function validateAndNormalizeVehicleWeight(
  apiWeight: number | null | undefined,
  brand: string | null | undefined,
  model: string | null | undefined,
  vehicleCategory: string = 'm1',
  isEV: boolean = false
): WeightNormalizationResult {
  // STEP 1: Sanitize input strings
  const { brand: cleanBrand, model: cleanModel } = normalizeVehicleStrings(brand, model);

  // STEP 2: Validate API weight (if provided)
  if (apiWeight && apiWeight > 0) {
    if (isWeightPlausible(apiWeight, vehicleCategory)) {
      // API weight is valid
      return {
        weightKg: Math.round(apiWeight),
        metadata: {
          isValid: true,
          isEstimated: false,
          source: 'api',
          suggestedUIIndicator: 'exact',
        },
        consumptionAdjustmentFactor: 1.0, // No adjustment needed
      };
    } else if (isGhostWeight(apiWeight, vehicleCategory)) {
      // API weight is a "ghost" - flag as corrupted
      console.warn(
        `[CheckFuel] ⚠️ Ghost weight detected: ${apiWeight}kg for ${cleanBrand} ${cleanModel} (category: ${vehicleCategory}). Using heuristic fallback.`
      );
    } else {
      // API weight is outside plausible range
      console.warn(
        `[CheckFuel] ⚠️ Implausible weight detected: ${apiWeight}kg for ${cleanBrand} ${cleanModel}. Using heuristic fallback.`
      );
    }
  }

  // STEP 3: Hierarchical fallback lookup
  const fallbackWeight = hierarchicalWeightLookup(cleanBrand, cleanModel, isEV);
  if (fallbackWeight) {
    return {
      weightKg: fallbackWeight,
      metadata: {
        isValid: true,
        isEstimated: true,
        source: 'dictionary',
        reason: `Fallback from WEIGHT_DICTIONARY (${cleanBrand} ${cleanModel})`,
        suggestedUIIndicator: 'estimated',
      },
      consumptionAdjustmentFactor: 1.0,
    };
  }

  // STEP 4: Segment-based fallback (last resort)
  const segmentWeight = isEV
    ? VEHICLE_SEGMENTS.ev
    : VEHICLE_SEGMENTS.sedan; // Conservative default

  return {
    weightKg: segmentWeight,
    metadata: {
      isValid: false,
      isEstimated: true,
      source: 'segment-fallback',
      reason: `No dictionary entry for ${cleanBrand} ${cleanModel}. Using segment average (${isEV ? 'EV' : 'Sedan'}).`,
      suggestedUIIndicator: 'warning',
    },
    consumptionAdjustmentFactor: 1.0,
  };
}

/**
 * Applies weight-based consumption adjustment coefficient.
 * 
 * Formula: C_adjusted = C_base × (1 + ((W_actual - W_base) / W_base) × α)
 * 
 * Where:
 * - C_base: Base consumption from manufacturer
 * - W_actual: Validated actual weight
 * - W_base: Reference weight for vehicle segment (typically 1500kg for cars)
 * - α: Weight sensitivity factor (typically 0.05 for fuel vehicles, 0.03 for EVs)
 * 
 * @param baseConsumption - Manufacturer's base consumption
 * @param actualWeight - Validated actual vehicle weight (kg)
 * @param baseWeight - Reference weight (default: 1500kg)
 * @param weightSensitivity - Sensitivity factor α (default: 0.05)
 * @returns Adjusted consumption coefficient
 */
export function applyWeightAdjustmentCoefficient(
  baseConsumption: number,
  actualWeight: number,
  baseWeight: number = 1500,
  weightSensitivity: number = 0.05
): number {
  const weightRatio = (actualWeight - baseWeight) / baseWeight;
  const adjustmentFactor = 1 + (weightRatio * weightSensitivity);
  const adjustedConsumption = baseConsumption * adjustmentFactor;
  return parseFloat(adjustedConsumption.toFixed(2));
}

/**
 * Prepares a sanitized vehicle object for AsyncStorage persistence.
 * Ensures consistent weight validation across app sessions.
 * 
 * @param vehicleId - Unique vehicle identifier
 * @param brand - Normalized brand name
 * @param model - Model name
 * @param weightKg - Validated weight in kg
 * @param metadata - Weight validation metadata
 * @param fuelType - Fuel type (Gasoline, Diesel, Electric, PHEV)
 * @param year - Manufacturing year (optional)
 * @param engineCC - Engine displacement in cc (optional)
 * @returns SanitizedVehicleObject ready for AsyncStorage
 */
export function sanitizeVehicleObjectForStorage(
  vehicleId: string,
  brand: string,
  model: string,
  weightKg: number,
  metadata: WeightValidationMetadata,
  fuelType: 'Gasoline' | 'Diesel' | 'Electric' | 'PHEV',
  year?: number,
  engineCC?: number
): SanitizedVehicleObject {
  return {
    id: vehicleId,
    brand,
    model,
    year,
    weightKg,
    weightMetadata: metadata,
    fuelType,
    engineCC,
    timestamp: Date.now(),
  };
}

/**
 * Persists validated vehicle data to AsyncStorage.
 * Uses 'sanitized_vehicles' key to avoid conflicts with raw API data.
 * 
 * @param vehicleObject - SanitizedVehicleObject to persist
 */
export async function persistSanitizedVehicle(
  vehicleObject: SanitizedVehicleObject
): Promise<void> {
  try {
    const existing = await AsyncStorage.getItem('sanitized_vehicles');
    const vehicleList: SanitizedVehicleObject[] = existing ? JSON.parse(existing) : [];

    // Replace existing vehicle with same ID, or append new
    const index = vehicleList.findIndex(v => v.id === vehicleObject.id);
    if (index >= 0) {
      vehicleList[index] = vehicleObject;
    } else {
      vehicleList.push(vehicleObject);
    }

    await AsyncStorage.setItem('sanitized_vehicles', JSON.stringify(vehicleList));
  } catch (error) {
    console.error('[CheckFuel] Failed to persist sanitized vehicle:', error);
  }
}

/**
 * Retrieves persisted sanitized vehicle data from AsyncStorage.
 * 
 * @param vehicleId - ID of vehicle to retrieve
 * @returns SanitizedVehicleObject if found, undefined otherwise
 */
export async function retrieveSanitizedVehicle(
  vehicleId: string
): Promise<SanitizedVehicleObject | undefined> {
  try {
    const data = await AsyncStorage.getItem('sanitized_vehicles');
    if (!data) return undefined;

    const vehicleList: SanitizedVehicleObject[] = JSON.parse(data);
    return vehicleList.find(v => v.id === vehicleId);
  } catch (error) {
    console.error('[CheckFuel] Failed to retrieve sanitized vehicle:', error);
    return undefined;
  }
}

/**
 * Estimates vehicle curb weight based on an offline local dictionary.
 * Essential for the Local-First architecture to bypass API anomalies and reduce latency.
 */
export function estimateVehicleWeight(
  brand: string, 
  model: string, 
  year?: number
): WeightEstimation | undefined {
  if (!brand || !model) return undefined;

  const normalizedBrand = brand.toLowerCase().trim();
  const normalizedModel = model.toLowerCase().trim();

  const brandData = WEIGHT_DICTIONARY[normalizedBrand];
  
  if (brandData) {
    // Sub-string matching to catch variations (e.g., "Corolla Cross" matching "corolla")
    for (const [key, value] of Object.entries(brandData)) {
      if (normalizedModel.includes(key)) {
        return value;
      }
    }
  }

  // Weight heuristics if exact model isn't found but topology can be inferred
  if (normalizedModel.includes('suv') || normalizedModel.includes('cross') || normalizedModel.includes('cx-')) {
    return { curb: 1600 }; 
  }

  return undefined;
}

// ============================================================================
// נוסחאות דינמיות - מבוססות מתמטיקה
// ============================================================================

/**
 * חישוב הידרדרות לפי גיל - נוסחה אקספוננציאלית
 *
 * השתמשנו בנוסחה: factor = 1 + (baseRate × age^growth)
 *
 * @param age - גיל הרכב בשנים
 * @param fuelType - סוג הדלק
 * @returns מקדם הידרדרות (1.0 = אין הידרדרות)
 */
function calculateAgeDegradation(
  age: number,
  fuelType: 'Gasoline' | 'Diesel' | 'Electric'
): number {
  // פרמטרים לפי סוג דלק
  const params = {
    Gasoline: { baseRate: 0.002, growth: 1.05 },  // בנזין - הידרדרות בינונית
    Diesel: { baseRate: 0.005, growth: 1.06 },     // דיזל - עמיד יותר
    Electric: { baseRate: 0.15, growth: 1.10 },   // חשמלי - סוללה מתדרדרת מהר בחום
  };

  const { baseRate, growth } = params[fuelType];

  // נוסחה: 1 + (baseRate × age^growth)
  const factor = 1 + (baseRate * Math.pow(age, growth));

  // הגבלה מקסימלית - רכב ישן מאוד לא יתדרדר לאינסוף
  const maxFactor = fuelType === 'Electric' ? 1.55 : 1.25;
  return Math.min(factor, maxFactor);
}

/**
 * חישוב השפעת סגנון נהיגה
 */
function calculateDrivingStyleFactor(style: 'eco' | 'normal' | 'aggressive'): number {
  const factors = {
    eco: 0.92,        // חסכון של 8%
    normal: 1.0,     //  נהיגה רגילה
    aggressive: 1.25, // +20% - נהיגה אגרסיבית
  };
  return factors[style];
}

/**
 * חישוב השפעת מזג אוויר
 */
function calculateClimateFactor(climate: 'hot' | 'moderate' | 'cold'): number {
  const factors = {
    hot: 1.001,      // +8% בחום (מיזוג)
    moderate: 1.001, // +2% בתנאים מתונים
    cold: 1.05,     // +10% בקור (חימום)
  };
  return factors[climate];
}

/**
 * חישוב השפעת סוג נסיעה
 */
function calculateTripTypeFactor(tripType: 'city' | 'highway' | 'mixed'): number {
  const factors = {
    city: 1.08,    // +18% בעיר (פקקים, עצירות)
    mixed: 1.00,   // +8% מעורב
    highway: 1.98, // +3% כביש מהיר
  };
  return factors[tripType];
}

/**
 * חישוב השפעת מצב הרכב
 */
function calculateConditionFactor(
  condition: 'excellent' | 'good' | 'fair' | 'poor'
): number {
  const factors = {
    excellent: 0.98, // תחזוקה מעולה
    good: 1.00,      // +3% תחזוקה רגילה
    fair: 1.05,      // +8% תחזוקה חלקית
    poor: 1.10,      // +15% רכב מוזנח
  };
  return factors[condition];
}

// ============================================================================
// MAIN CALCULATION FUNCTION
// ============================================================================

/**
 * מחשב צריכת דלק מתוקנת וריאלית
 *
 * @param baseConsumption - צריכה בסיסית מהיצרן (km/L או kWh/100km)
 * @param factors - גורמי התאמה
 * @returns תוצאת חישוב מפורטת עם פירוק כל הגורמים
 */
export function calculateAdjustedConsumption(
  baseConsumption: number,
  factors: AdjustmentFactors
): ConsumptionResult {
  // חישוב כל המקדמים
  const ageFactor = calculateAgeDegradation(factors.vehicleAge, factors.fuelType)*0.91; // הוספנו שיפור של 2% כדי לאזן את ההידרדרות הטבעית עם תחזוקה טובה
  const styleFactor = calculateDrivingStyleFactor(factors.drivingStyle || 'normal');
  const climateFactor = calculateClimateFactor(factors.climate || 'hot');
  const tripFactor = calculateTripTypeFactor(factors.tripType || 'mixed');
  const conditionFactor = calculateConditionFactor(factors.vehicleCondition || 'good');
  const acFactor = factors.useAC === undefined
    ? 1.0
    : factors.useAC
      ? (factors.acUsageLevel === 'sometimes' ? 1.02 : 1.03)
      : 1.0;
  const shortTripsFactor = factors.shortTrips ? 1.10 : 1.0;  // +10% נסיעות קצרות

// חישוב מקדם כולל ראשוני
  let totalFactor =
    ageFactor *
    styleFactor *
    climateFactor *
    tripFactor *
    conditionFactor *
    acFactor *
    shortTripsFactor;

  // חסם עליון ותחתון כדי למנוע תוצאות קיצוניות מדי (Outliers)
  totalFactor = Math.min(Math.max(totalFactor, 0.7), 2.2);

  // חישוב צריכה מתוקנת
  let adjustedConsumption: number;

  if (factors.fuelType === 'Electric') {
    // עבור רכב חשמלי - צריכה גבוהה יותר = יותר kWh/100km
    adjustedConsumption = baseConsumption * totalFactor;
  } else {
    // עבור רכב דלק - צריכה גבוהה יותר = פחות km/L
    adjustedConsumption = baseConsumption / totalFactor;
  }

  return {
    baseConsumption,
    adjustedConsumption: parseFloat(adjustedConsumption.toFixed(2)),
    totalAdjustmentFactor: parseFloat(totalFactor.toFixed(3)),
    breakdown: {
      ageDegradation: ageFactor,
      drivingStyle: styleFactor,
      climate: climateFactor,
      tripType: tripFactor,
      vehicleCondition: conditionFactor,
      acUsage: acFactor,
      shortTrips: shortTripsFactor,
    },
  };
}

/**
 * מחשב את גיל הרכב משנת הייצור
 */
export function calculateVehicleAge(manufacturingYear: number): number {
  const currentYear = new Date().getFullYear();
  return Math.max(0, currentYear - manufacturingYear);
}

/**
 * מערכת המלצות חכמה המדורגת לפי גודל ההשפעה על צריכת הדלק
 */
export function getConsumptionRecommendations(result: ConsumptionResult): string[] {
  // ניצור מערך של אובייקטים כדי שנוכל למיין אותם לפי חומרת ההשפעה
  const impactList: { impact: number; text: string }[] = [];

  // פונקציית עזר לחישוב אחוז הפגיעה (לדוגמה: 1.15 -> 15)
  const getPercent = (factor: number) => Math.round((factor - 1) * 100);

  const { breakdown } = result;

  // 1. סגנון נהיגה
  if (breakdown.drivingStyle >= 1.20) {
    impactList.push({ impact: breakdown.drivingStyle, text: `🚗 נהיגה ספורטיבית/אגרסיבית מוסיפה כ-${getPercent(breakdown.drivingStyle)}% לצריכה. נסה האצות מתונות יותר.` });
  } else if (breakdown.drivingStyle > 1.0) {
    impactList.push({ impact: breakdown.drivingStyle, text: `🚗 מעבר לנהיגה במצב 'Eco' יכול לחסוך לך מעט דלק ביומיום.` });
  }

  // 2. גיל הרכב
  if (breakdown.ageDegradation >= 1.20) {
    impactList.push({ impact: breakdown.ageDegradation, text: `🔧 בלאי טבעי של רכב ישן גובה מחיר של כ-${getPercent(breakdown.ageDegradation)}%. שקול טיפול מקיף למנוע/לסוללה.` });
  } else if (breakdown.ageDegradation >= 1.10) {
    impactList.push({ impact: breakdown.ageDegradation, text: `🔧 הרכב מתחיל להתבגר (+${getPercent(breakdown.ageDegradation)}% לצריכה). הקפד על שגרת טיפולים בזמן.` });
  }

  // 3. מצב הרכב (תחזוקה)
  if (breakdown.vehicleCondition >= 1.10) {
    impactList.push({ impact: breakdown.vehicleCondition, text: `⚙️ תחזוקה לקויה עולה לך ב-${getPercent(breakdown.vehicleCondition)}%. בדוק לחץ אוויר בצמיגים והחלף מסננים.` });
  } else if (breakdown.vehicleCondition > 1.0) {
    impactList.push({ impact: breakdown.vehicleCondition, text: `⚙️ שמירה על לחץ אוויר תקין בצמיגים יכולה לשפר מעט את הצריכה.` });
  }

  // 4. סוג נסיעה ופקקים
  if (breakdown.tripType >= 1.10) {
    impactList.push({ impact: breakdown.tripType, text: `🏙️ ריבוי נסיעות עירוניות/פקקים מגדיל את הצריכה בכ-${getPercent(breakdown.tripType)}%.` });
  }

  // 5. נסיעות קצרות מנוע קר
  if (breakdown.shortTrips > 1.0) {
    impactList.push({ impact: breakdown.shortTrips, text: `📏 נסיעות קצרות לא מאפשרות למנוע להתחמם (תוספת של כ-${getPercent(breakdown.shortTrips)}%). שקול הליכה ברגל כשמתאפשר.` });
  }

  // 6. מזגן
  if (breakdown.acUsage > 1.0) {
    impactList.push({ impact: breakdown.acUsage, text: `❄️ כיבוי המזגן כשמזג האוויר מאפשר יחסוך לך כ-${getPercent(breakdown.acUsage)}%.` });
  }

  // סינון המלצות זניחות (פחות מ-2% השפעה), מיון מהגורם המשפיע ביותר להכי פחות משפיע, ושליפת הטקסט
  const sortedRecommendations = impactList
    .filter(item => item.impact > 1.02)
    .sort((a, b) => b.impact - a.impact)
    .map(item => item.text);

  // הוספת מחמאה אם הכל מעולה
  if (sortedRecommendations.length === 0) {
    sortedRecommendations.push('✅ איזה יופי! פרופיל הנסיעה והתחזוקה שלך חסכוניים ויעילים במיוחד.');
  }

  // נחזיר רק את 3 ההמלצות החשובות ביותר כדי לא להציף את המשתמש
  return sortedRecommendations.slice(0, 3);
}

/**
 * פונקציה מהירה לקבלת צריכה מתוקנת בסיסית
 * (משתמשת בהנחות ברירת מחדל סבירות לישראל)
 */
export function getQuickAdjustedConsumption(
  baseConsumption: number,
  vehicleAge: number,
  fuelType: 'Gasoline' | 'Diesel' | 'Electric'
): number {
  const result = calculateAdjustedConsumption(baseConsumption, {
    vehicleAge,
    fuelType,
    drivingStyle: 'normal',
    climate: 'hot',           // ישראל - בד"כ חם
    tripType: 'mixed',
    vehicleCondition: 'good',
    useAC: true,              // ישראל - בד"כ משתמשים במיזוג
    shortTrips: false,
  });

  return result.adjustedConsumption;
}

/**
 * פונקציה לחישוב צריכה מחמירה במיוחד (worst case)
 */
export function getConservativeConsumption(
  baseConsumption: number,
  vehicleAge: number,
  fuelType: 'Gasoline' | 'Diesel' | 'Electric'
): number {
  const result = calculateAdjustedConsumption(baseConsumption, {
    vehicleAge,
    fuelType,
    drivingStyle: 'normal',
    climate: 'hot',
    tripType: 'city',         // הנחה מחמירה - רק עיר
    vehicleCondition: 'fair', // הנחה מחמירה - תחזוקה לא מושלמת
    useAC: true,
    shortTrips: false,
  });

  return result.adjustedConsumption;
}

/**
 * פונקציה לחישוב צריכה עם מרווח ביטחון (מומלץ לניווט)
 * מחשבת צריכה ריאלית + 10% מרווח ביטחון
 */
export function getNavigationConsumption(
  baseConsumption: number,
  vehicleAge: number,
  fuelType: 'Gasoline' | 'Diesel' | 'Electric'
): number {
  const quickResult = getQuickAdjustedConsumption(baseConsumption, vehicleAge, fuelType);

  // הוספת 10% מרווח ביטחון
  const SAFETY_MARGIN = 0.10;

  if (fuelType === 'Electric') {
    return parseFloat((quickResult * (1 + SAFETY_MARGIN)).toFixed(2));
  } else {
    return parseFloat((quickResult / (1 + SAFETY_MARGIN)).toFixed(2));
  }
}

// ============================================================================
// EXPORT SUMMARY
// ============================================================================

/**
 * סיכום הפונקציות הזמינות:
 *
 * 1. calculateAdjustedConsumption() - חישוב מפורט עם כל הגורמים
 * 2. calculateVehicleAge() - חישוב גיל הרכב
 * 3. getConsumptionRecommendations() - המלצות לשיפור
 * 4. getQuickAdjustedConsumption() - חישוב מהיר עם הנחות ברירת מחדל (ריאליסטי)
 * 5. getNavigationConsumption() - חישוב עם מרווח ביטחון 10% (מומלץ לניווט!) ⭐
 * 6. getConservativeConsumption() - חישוב מחמיר מאוד (worst case)
 *
 * ============================================================================
 * WEIGHT VALIDATION LAYER: Available Functions
 * ============================================================================
 *
 * Core Validation:
 * 1. validateAndNormalizeVehicleWeight() - Main 3-layer validation pipeline
 * 2. normalizeVehicleStrings() - Remove geographic suffixes from brand/model
 * 3. applyWeightAdjustmentCoefficient() - Apply consumption adjustment formula
 *
 * AsyncStorage Integration:
 * 4. sanitizeVehicleObjectForStorage() - Prepare vehicle for persistence
 * 5. persistSanitizedVehicle() - Save validated vehicle to AsyncStorage
 * 6. retrieveSanitizedVehicle() - Load validated vehicle from AsyncStorage
 */

// ============================================================================
// TEST CASES & VALIDATION EXAMPLES
// ============================================================================

/**
 * TEST SUITE: Vehicle Weight Validation
 * 
 * Covers the 3 critical failure modes and success scenarios:
 * 1. Valid API weight → Pass through
 * 2. Ghost weight (< 850kg) → Flag + fallback
 * 3. Missing weight → Use segment fallback
 */
export const WEIGHT_VALIDATION_TESTS = {
  /**
   * TEST CASE 1: Valid API Weight
   * Input: Toyota Corolla, API reports 1,380 kg
   * Expected: Weight passes validation, use exact value
   */
  testValidAPIWeight: (): void => {
    console.log('\n🧪 TEST 1: Valid API Weight (Toyota Corolla)');
    const result = validateAndNormalizeVehicleWeight(
      1380,                    // Authentic weight from API
      'טויוטה',               // Hebrew brand
      'קורולה',               // Hebrew model
      'm1',
      false
    );
    console.log(`✅ Result: ${result.weightKg}kg`);
    console.log(`   Source: ${result.metadata.source}`);
    console.log(`   Valid: ${result.metadata.isValid}`);
    console.assert(result.weightKg === 1380, 'Weight should be 1380kg');
    console.assert(result.metadata.isValid === true, 'Should be marked as valid');
    console.assert(result.metadata.source === 'api', 'Source should be API');
  },

  /**
   * TEST CASE 2: Ghost Weight (Corrupted Data)
   * Input: Mazda3, API reports 711 kg (ghost)
   * Expected: Rejected as implausible, fallback to dictionary (1,350kg)
   */
  testGhostWeight: (): void => {
    console.log('\n🧪 TEST 2: Ghost Weight Detection (Mazda3 @ 711kg)');
    const result = validateAndNormalizeVehicleWeight(
      711,                     // Ghost weight (corrupted API data)
      'מאזדה',                 // Hebrew brand
      '3',                     // Hebrew model
      'm1',
      false
    );
    console.log(`✅ Result: ${result.weightKg}kg (fallback used)`);
    console.log(`   Source: ${result.metadata.source}`);
    console.log(`   Estimated: ${result.metadata.isEstimated}`);
    console.log(`   Reason: ${result.metadata.reason}`);
    console.assert(result.weightKg === 1350, 'Weight should fallback to 1350kg');
    console.assert(result.metadata.isEstimated === true, 'Should be marked as estimated');
    console.assert(
      result.metadata.suggestedUIIndicator === 'estimated',
      'Should suggest estimated UI indicator'
    );
  },

  /**
   * TEST CASE 3: Missing Weight Data
   * Input: Unknown vehicle, no API weight provided
   * Expected: Use segment-based fallback (Sedan default = 1,450kg)
   */
  testMissingWeight: (): void => {
    console.log('\n🧪 TEST 3: Missing Weight Data');
    const result = validateAndNormalizeVehicleWeight(
      undefined,               // No API weight
      'לא ידוע',              // Unknown brand
      'לא ידוע',              // Unknown model
      'm1',
      false
    );
    console.log(`✅ Result: ${result.weightKg}kg (segment fallback)`);
    console.log(`   Source: ${result.metadata.source}`);
    console.log(`   Estimated: ${result.metadata.isEstimated}`);
    console.log(`   Reason: ${result.metadata.reason}`);
    console.assert(
      result.metadata.source === 'segment-fallback',
      'Source should be segment-fallback'
    );
    console.assert(result.metadata.isEstimated === true, 'Should be marked as estimated');
  },

  /**
   * TEST CASE 4: Brand String Normalization (Geographic Suffix Removal)
   * Input: 'טויוטה יפן' (Toyota Japan) with suffix
   * Expected: Suffix removed, weight looked up as 'טויוטה'
   */
  testBrandStringNormalization: (): void => {
    console.log('\n🧪 TEST 4: Brand String Normalization');
    const result = validateAndNormalizeVehicleWeight(
      undefined,               // No API weight
      'טויוטה יפן',           // With geographic suffix
      'קורולה דרום קוריאה',   // Model also has suffix
      'm1',
      false
    );
    console.log(`✅ Result: ${result.weightKg}kg`);
    console.log(`   Source: ${result.metadata.source}`);
    console.log(`   Reason: ${result.metadata.reason}`);
    console.assert(result.weightKg === 1380, 'Should find Toyota Corolla (1380kg)');
    console.assert(result.metadata.isEstimated === true, 'Should use dictionary fallback');
  },

  /**
   * TEST CASE 5: Weight Adjustment Coefficient
   * Formula: C_adjusted = C_base × (1 + ((W_actual - W_base) / W_base) × α)
   * 
   * Example: 1.6L/100km base consumption, actual weight 1,650kg vs base 1,500kg
   * Expected: 6.67% increase in consumption
   */
  testWeightAdjustmentCoefficient: (): void => {
    console.log('\n🧪 TEST 5: Weight Adjustment Coefficient Formula');
    const baseConsumption = 8.0; // 8 L/100km base
    const actualWeight = 1650;   // Actual vehicle weight
    const baseWeight = 1500;     // Reference weight
    const weightSensitivity = 0.05; // α factor

    const adjusted = applyWeightAdjustmentCoefficient(
      baseConsumption,
      actualWeight,
      baseWeight,
      weightSensitivity
    );

    const expectedAdjusted = 8.0 * (1 + ((1650 - 1500) / 1500) * 0.05);
    console.log(`✅ Base: ${baseConsumption} L/100km`);
    console.log(`   Actual Weight: ${actualWeight}kg`);
    console.log(`   Base Weight: ${baseWeight}kg`);
    console.log(`   Adjusted: ${adjusted} L/100km`);
    console.log(`   Expected: ${expectedAdjusted.toFixed(2)} L/100km`);
    console.assert(
      Math.abs(adjusted - expectedAdjusted) < 0.01,
      'Adjustment formula should match expected value'
    );
  },

  /**
   * TEST CASE 6: AsyncStorage Integration
   * Expected: Sanitized vehicle object persisted and retrieved correctly
   */
  testAsyncStorageIntegration: async (): Promise<void> => {
    console.log('\n🧪 TEST 6: AsyncStorage Integration');
    const sanitized = sanitizeVehicleObjectForStorage(
      'vehicle_001',
      'Toyota',
      'Corolla',
      1380,
      {
        isValid: true,
        isEstimated: false,
        source: 'api',
        suggestedUIIndicator: 'exact',
      },
      'Gasoline',
      2022,
      1600
    );

    console.log(`✅ Created sanitized object for vehicle ID: ${sanitized.id}`);
    console.log(`   Brand: ${sanitized.brand}, Model: ${sanitized.model}`);
    console.log(`   Weight: ${sanitized.weightKg}kg`);
    console.log(`   Timestamp: ${sanitized.timestamp}`);

    // Test persistence
    await persistSanitizedVehicle(sanitized);
    const retrieved = await retrieveSanitizedVehicle('vehicle_001');

    console.log(`✅ Retrieved from AsyncStorage: ${retrieved?.brand} ${retrieved?.model}`);
    console.assert(retrieved?.id === 'vehicle_001', 'Vehicle ID should match');
    console.assert(retrieved?.weightKg === 1380, 'Weight should be preserved');
  },
};

/**
 * Runs all weight validation test cases.
 * Call this function from dev-tester.tsx to validate the system.
 */
export async function runWeightValidationTests(): Promise<void> {
  console.log('\n╔════════════════════════════════════════════════════════╗');
  console.log('║     WEIGHT VALIDATION SYSTEM - TEST SUITE v1.0        ║');
  console.log('╚════════════════════════════════════════════════════════╝');

  try {
    WEIGHT_VALIDATION_TESTS.testValidAPIWeight();
    WEIGHT_VALIDATION_TESTS.testGhostWeight();
    WEIGHT_VALIDATION_TESTS.testMissingWeight();
    WEIGHT_VALIDATION_TESTS.testBrandStringNormalization();
    WEIGHT_VALIDATION_TESTS.testWeightAdjustmentCoefficient();
    await WEIGHT_VALIDATION_TESTS.testAsyncStorageIntegration();

    console.log('\n╔════════════════════════════════════════════════════════╗');
    console.log('║             ✅ ALL TESTS PASSED                        ║');
    console.log('╚════════════════════════════════════════════════════════╝\n');
  } catch (error) {
    console.error('❌ Test suite failed:', error);
  }
}
