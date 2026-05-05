/**
 * ============================================================================
 * Vehicle Type Definitions - CheckFuel Project
 * ============================================================================
 * 
 * Provides strict TypeScript interfaces for vehicle data validation,
 * weight estimation, and fuel consumption calculations.
 * 
 * ARCHITECTURE NOTE: These types enforce data integrity at compile-time,
 * preventing category mismatches and invalid weight calculations.
 * ============================================================================
 */

/**
 * VehicleSegment: Enumeration of standardized vehicle market segments.
 * 
 * Used to classify vehicles and apply segment-specific weight ranges
 * and fuel consumption adjustments. Follows EU classification standards
 * with extensions for EVs and PHEVs.
 * 
 * Segments:
 * - A/B/C/D/E/F: EU passenger car segments (size-based)
 * - SUV-Compact/Midsize/Large: Sport utility vehicles
 * - Electric: Battery Electric Vehicles (BEV)
 * - PHEV: Plug-in Hybrid Electric Vehicles
 */
export type VehicleSegment =
  | 'A-Segment'        // Micro cars (Kia Picanto, Hyundai i10)
  | 'B-Segment'        // Compact hatchbacks (Toyota Yaris, Mazda2)
  | 'C-Segment'        // Compact sedans (Toyota Corolla, Ford Focus)
  | 'D-Segment'        // Executive sedans (Honda Accord, Mazda6, Alfa Romeo 159)
  | 'E-Segment'        // Premium sedans (BMW 5-Series, Mercedes E-Class)
  | 'F-Segment'        // Luxury sedans (BMW 7-Series, Mercedes S-Class)
  | 'SUV-Compact'      // Compact crossovers (Honda CR-V, Hyundai Tucson)
  | 'SUV-Midsize'      // Mid-size SUVs (Toyota RAV4, Santa Fe)
  | 'SUV-Large'        // Large SUVs (Toyota Prado, Grand Cherokee)
  | 'Electric'         // Battery Electric Vehicles (BEV)
  | 'PHEV'             // Plug-in Hybrid Electric Vehicles
  | 'Unknown';         // Fallback for unclassifiable vehicles

/**
 * SegmentWeightRange: Weight constraints for a specific vehicle segment.
 * 
 * Defines the plausibility bounds and median weight for a segment.
 * All weights are in kilograms (kg) and represent curb weights
 * (empty vehicle, no passengers, no cargo).
 * 
 * RULE: Any API-reported weight outside these bounds is flagged as invalid
 *       and replaced with the `averageWeightKg`.
 * 
 * @property minWeightKg - Physical lower bound (rejects ghost weights)
 * @property averageWeightKg - Typical median weight (fallback value)
 * @property maxWeightKg - Physical upper bound (rejects outliers)
 * @property description - Human-readable segment description (for logging)
 */
export interface SegmentWeightRange {
  readonly minWeightKg: number;
  readonly averageWeightKg: number;
  readonly maxWeightKg: number;
  readonly description: string;
}

/**
 * VehicleWeightData: Validated vehicle weight information.
 * 
 * Result of weight validation pipeline. Includes source tracking
 * and adjustment metadata for consumption calculations.
 * 
 * @property weightKg - Validated weight in kilograms
 * @property isFromAPI - True if weight came directly from API (trusted)
 * @property isFromFallback - True if weight is from segment fallback (estimated)
 * @property segment - Vehicle segment used for validation
 * @property reason - QA log reason for why fallback was applied (if applicable)
 */
export interface VehicleWeightData {
  readonly weightKg: number;
  readonly isFromAPI: boolean;
  readonly isFromFallback: boolean;
  readonly segment: VehicleSegment;
  readonly reason?: string;
}

/**
 * ConsumptionAdjustmentResult: Result of weight-based fuel consumption calculation.
 * 
 * Applies physics-based adjustment: 5% consumption change per 100kg deviation.
 * 
 * @property baseConsumption - Original manufacturer consumption (km/L or kWh/100km)
 * @property adjustedConsumption - Adjusted consumption after weight correction
 * @property adjustmentRatio - Multiplier applied (1.0 = no change, 1.05 = +5%)
 * @property weightDifferenceKg - Actual vs base weight difference
 */
export interface ConsumptionAdjustmentResult {
  readonly baseConsumption: number;
  readonly adjustedConsumption: number;
  readonly adjustmentRatio: number;
  readonly weightDifferenceKg: number;
}

/**
 * QAValidationEvent: Quality Assurance logging event for data validation.
 * 
 * Records all instances where API data was rejected or corrected,
 * enabling downstream analysis of data quality issues.
 * 
 * @property timestamp - UTC timestamp of validation event
 * @property reportedWeight - Weight value reported by API (may be invalid)
 * @property validatedWeight - Weight used after validation
 * @property segment - Vehicle segment
 * @property isRejected - True if API value was replaced by fallback
 * @property reason - Human-readable reason for rejection/correction
 */
export interface QAValidationEvent {
  readonly timestamp: number;
  readonly reportedWeight: number | null;
  readonly validatedWeight: number;
  readonly segment: VehicleSegment;
  readonly isRejected: boolean;
  readonly reason: string;
}
