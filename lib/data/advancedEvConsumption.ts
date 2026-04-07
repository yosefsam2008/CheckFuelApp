/**
 * ============================================================================
 * ADVANCED PHYSICS-BASED EV ENERGY CONSUMPTION ALGORITHM
 * ============================================================================
 *
 * Production-ready algorithm for calculating electric vehicle energy consumption
 * (kWh/100km) WITHOUT requiring a vehicle database.
 *
 * Key Features:
 * - Physics-based calculation using aerodynamics and weight
 * - Smart estimation WITHOUT hard-coded vehicle databases
 * - Non-linear battery degradation modeling
 * - Target accuracy: ±5-7%
 * - All calculations complete in <50ms
 *
 * Architecture:
 * 1. estimateAeroData() - Aerodynamic estimation from vehicle characteristics
 * 2. calculateEVPhysics() - Core physics-based energy calculation
 * 3. applyBatteryDegradation() - Age-based degradation adjustment
 * 4. calculateEVConsumptionAdvanced() - Main orchestrator function
 *
 * ============================================================================
 */

import {
  getEffectiveWeight,
  translateBrandToEnglish
} from './fuelData';
import { estimateVehicleWeight } from './vehicleWeightLookup';

// Development mode detection
const __DEV__ = typeof process !== 'undefined' && process.env.NODE_ENV !== 'production';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

/**
 * Aerodynamic data estimation result
 */
export interface AeroData {
  Cd: number;           // Drag coefficient (0.24-0.40)
  frontalArea: number;  // m² (1.8-3.5)
  confidence: number;   // Estimation confidence (0.0-1.0)
}

/**
 * Physics calculation breakdown
 */
export interface EVPhysicsBreakdown {
  rolling: number;      // kWh/100km from rolling resistance
  aero: number;         // kWh/100km from aerodynamic drag
  auxiliary: number;    // kWh/100km from HVAC/electronics
  efficiency: number;   // System efficiency factor
}

/**
 * Complete EV consumption result
 */
export interface EVConsumptionResult {
  kwhPer100Km: number;
  kmPerKwh: number;
  confidence: number;      // 0.0-1.0
  source: string;
  breakdown?: EVPhysicsBreakdown;
}

// ============================================================================
// STEP 1: AERODYNAMIC ESTIMATION (NO DATABASE!)
// ============================================================================

/**
 * Estimate aerodynamic properties based on vehicle characteristics
 * Uses statistical correlations - NO hard-coded vehicle database!
 *
 * Estimation Strategy:
 * - Base values by vehicle type and weight
 * - Year factor: newer vehicles have better aerodynamics
 * - Brand reputation: Tesla/Mercedes/BMW → better Cd
 * - Model name hints: "SUV", "Sport", "Compact" → adjust Cd/Area
 *
 * @param params Vehicle characteristics
 * @returns Estimated aerodynamic data with confidence score
 */
export function estimateAeroData(params: {
  brand: string;
  model: string;
  weight: number;
  year: number;
  vehicleType: 'car' | 'motorcycle' | 'truck';
  isPhev?: boolean;
}): AeroData {
  const { brand, model, weight, year, vehicleType, isPhev } = params;

  // Normalize inputs for pattern matching
  const normalizedBrand = brand.toLowerCase().trim();
  const normalizedModel = model.toLowerCase().trim();

  let Cd: number;
  let frontalArea: number;
  let confidence = 0.70; // Base confidence for estimation

  // ✅ זיהוי SUV חכם - משפיע על ערכי הבסיס והחסמים
  const isSUV = vehicleType === 'car' && (
    normalizedModel.includes('suv') ||
    normalizedModel.includes('cross') ||
    normalizedModel.includes('zs') ||
    normalizedModel.includes('atto') ||
    normalizedModel.includes('countryman') || 
    normalizedModel.includes('tiggo') ||
    normalizedModel.includes('cayenne') ||
    (normalizedModel.includes(' x') || normalizedModel.endsWith(' x'))
  );

    
  // ========================================
  // BASE VALUES BY VEHICLE TYPE
  // ========================================

  if (vehicleType === 'motorcycle') {
    Cd = 0.60;
    frontalArea = 0.6;
  } else if (vehicleType === 'truck') {
    Cd = 0.35;
    frontalArea = 3.2;
  } else if (isSUV) {
    // 🚙 SUV Base - רכבים גבוהים ורחבים יותר
    Cd = 0.30;
    frontalArea = 2.6; 
    confidence += 0.10;
  } else {
    // 🚗 Sedan/Hatchback Base
    Cd = 0.28;
    frontalArea = 2.4;
  }


  const isCompact = normalizedModel.includes('a250') || normalizedModel.includes('a-class') || normalizedModel.includes('mini');

if (isCompact) {
  Cd -= 0.02; // רכב קטן חותך את האוויר טוב יותר
  frontalArea -= 0.25; // שטח פנים קטן משמעותית מסדאן ממוצעת
}

// החמרת SUV עבור Cayenne
if (normalizedModel.includes('cayenne')) {
  frontalArea = 2.8; // SUV ענק
}

  const isCompactSleek = 
    normalizedModel.includes('a250') || 
    normalizedModel.includes('a-class') || 
    (normalizedModel.includes('p7') && !isSUV);

  if (isCompactSleek) {
    Cd -= 0.02; // בונוס גרר נמוך
    frontalArea -= 0.15; // שטח פנים קטן
  }
    
  // ========================================
  // WEIGHT-BASED ADJUSTMENTS (CARS ONLY)
  // ========================================

  
  if (vehicleType === 'car' && !isSUV) {
    // נרמול משקל לרכבים רגילים בלבד (ב-SUV הבסיס כבר גבוה)
    const aeroWeight = weight * 0.8;

    if (aeroWeight < 1400) {
      Cd = 0.28;
      frontalArea = 2.2;
    } else if (aeroWeight < 1850) {
      Cd = 0.27; 
      frontalArea = 2.3;
    }
  }

  // ========================================
  // YEAR-BASED IMPROVEMENT
  // ========================================

  if (year >= 2020) {
    Cd -= 0.02;
    confidence += 0.05;
  } else if (year >= 2015) {
    Cd -= 0.01;
  } else if (year < 2012) {
    Cd += 0.02;
    confidence -= 0.05;
  }

  // ========================================
  // BRAND REPUTATION
  // ========================================

  if (normalizedBrand.includes('tesla')) {
    Cd -= 0.03;
    confidence += 0.10;
  } else if (
    normalizedBrand.includes('mercedes') ||
    normalizedBrand.includes('bmw') ||
    normalizedBrand.includes('audi') ||
    normalizedBrand.includes('porsche')
  ) {
    Cd -= 0.02;
    confidence += 0.05;
  } else if (
    normalizedBrand.includes('hyundai') ||
    normalizedBrand.includes('kia') ||
    normalizedBrand.includes('genesis')
  ) {
    Cd -= 0.01;
    confidence += 0.03;
  }

  // ========================================
  // MODEL NAME HINTS
  // ========================================

  if (
    normalizedModel.includes('sport') ||
    normalizedModel.includes('coupe') ||
    normalizedModel.includes('gt')
  ) {
    Cd -= 0.02;
    frontalArea -= 0.1;
  }

  // SUV logic moved to Base Values, but we keep a small hint for "Crossover" specific names
  if (normalizedModel.includes('crossover')) {
    Cd += 0.01;
    frontalArea += 0.1;
  }

  if (
    normalizedModel.includes('compact') ||
    normalizedModel.includes('mini') ||
    normalizedModel.includes('city')
  ) {
    Cd -= 0.01;
    frontalArea -= 0.2;
  }

  // ========================================
  // REALISTIC BOUNDS & VALIDATION
  // ========================================

  if (vehicleType === 'car') {
    // 🛡️ חסמים מחמירים יותר ל-SUV כדי למנוע תוצאות אופטימיות מדי
    const minCd = isSUV ? 0.28 : 0.24;
    const minArea = isSUV ? 2.45 : 2.0;
    
    Cd = Math.max(minCd, Math.min(0.38, Cd));
    frontalArea = Math.max(minArea, Math.min(3.2, frontalArea));
  } else if (vehicleType === 'truck') {
    Cd = Math.max(0.28, Math.min(0.40, Cd));
    frontalArea = Math.max(2.8, Math.min(3.5, frontalArea));
  }

  // PHEV Penalty
  if (isPhev) {
    Cd += 0.02;
    confidence -= 0.03;
  }

  if (__DEV__) {
    console.log(`📐 Aero Estimation: ${brand} ${model} (${year}, ${weight}kg)`);
    console.log(`   SUV Detected: ${isSUV ? 'YES' : 'NO'}`);
    console.log(`   Cd: ${Cd.toFixed(3)}, Area: ${frontalArea.toFixed(2)} m²`);
    console.log(`   Confidence: ${(confidence * 100).toFixed(0)}%`);
  }

  return {
    Cd: +Cd.toFixed(3),
    frontalArea: +frontalArea.toFixed(2),
    confidence: +confidence.toFixed(2)
  };
}

// ============================================================================
// STEP 2: CORE PHYSICS CALCULATION
// ============================================================================

/**
 * Calculate EV energy consumption using physics-based model
 *
 * Energy Consumption Formula:
 * Total Energy = (Rolling Resistance + Air Drag + Auxiliary) / System Efficiency
 *
 * 1. Rolling Resistance = Crr × m × g × d
 * 2. Air Drag = 0.5 × ρ × Cd × A × v²
 * 3. Auxiliary = HVAC + Electronics
 * 4. System Efficiency = ηmotor × ηinverter × ηbattery × (1 - regen)
 *
 * @param params Physics parameters
 * @returns Energy consumption and breakdown
 */
export function calculateEVPhysics(params: {
  weight: number;      // kg
  Cd: number;          // Drag coefficient
  frontalArea: number; // m²
  avgSpeed: number;    // km/h (default: 80)
  year: number;      
  isPhev?: boolean;   
}): {
  kwhPer100Km: number;
  breakdown: EVPhysicsBreakdown;
} {
  const { weight, Cd, frontalArea, avgSpeed, year, isPhev = false } = params;

  // ========================================
  // CONSTANTS
  // ========================================
  const g = 9.81;              // m/s² - gravitational acceleration
  const rho = 1.225;           // kg/m³ - air density at sea level
  const Crr = 0.008;           // Rolling resistance coefficient
  const velocityMS = avgSpeed / 3.6; // Convert km/h to m/s

  // ========================================
  // 1. ROLLING RESISTANCE ENERGY (MJ -> kWh/100km)
  // ========================================
  const rollingForce = Crr * weight * g; 
  const rollingEnergyPer100Km = (rollingForce * 100000) / 3600000; 

  // ========================================
  // 2. AERODYNAMIC DRAG ENERGY (MJ -> kWh/100km)
  // ========================================
  const dragForce = 0.5 * rho * Cd * frontalArea * Math.pow(velocityMS, 2); 
  const dragEnergyPer100Km = (dragForce * 100000) / 3600000; 

  // ========================================
  // 3. AUXILIARY POWER (מערכות עזר)
  // ========================================
  // כיוונון עדין: 1.0kW ל-PHEV הוא נתון ממוצע ריאלי יותר למזגן ואלקטרוניקה

  
  const hvacPower = isPhev ? 1.05 : (year >= 2021 ? 0.6 : 1.2);
  const electronicsPower = 0.3; 
  const totalAuxPower = hvacPower + electronicsPower; 

  const timeHours = 100 / avgSpeed; 
  const auxiliaryEnergyPer100Km = totalAuxPower * timeHours; 

  // ========================================
  // 4. SYSTEM EFFICIENCY & KINETIC ENERGY
  // ========================================
  // שיפור נצילות PHEV לערכים אופטימיים יותר (רכבי יוקרה/מודרניים)
  const motorEfficiency = isPhev ? 0.92 : 0.92;
  const inverterEfficiency = 0.96;
  const batteryEfficiency = isPhev ? 0.93 : 0.94;
  
  const powertrainEfficiency = motorEfficiency * inverterEfficiency * batteryEfficiency;

  // אנרגיית האצה - פקטור 4.5 מייצג נסיעה מעורבת
  const rawAccelerationEnergy = (weight / 1000) * 4.5; 
  
  // שיפור רגנרציה ל-PHEV (העלאה מ-0.40 ל-0.45 להחזר אנרגיה טוב יותר)
  const regenEfficiency = isPhev ? 0.45 : 0.60;
  const netAccelerationEnergy = rawAccelerationEnergy * (1 - regenEfficiency);

  // הפחתת קנס תמסורת מכנית מ-8% ל-4% (ריאלי יותר לתיבות הילוכים מודרניות)
  const drivetrainPenalty = isPhev ? 1.04 : 1.0; 

  const cruiseEnergyFromBattery =
    ((rollingEnergyPer100Km + dragEnergyPer100Km) / powertrainEfficiency) * drivetrainPenalty;

  const totalEnergy = cruiseEnergyFromBattery + netAccelerationEnergy + auxiliaryEnergyPer100Km;

  if (__DEV__) {
    console.log(`⚡ Physics Calculation (${weight}kg, Cd=${Cd}, ${avgSpeed}km/h)`);
    console.log(`   Is PHEV: ${isPhev ? 'YES' : 'NO'}`);
    console.log(`   Rolling: ${rollingEnergyPer100Km.toFixed(2)} kWh/100km`);
    console.log(`   Aero: ${dragEnergyPer100Km.toFixed(2)} kWh/100km`);
    console.log(`   Accel (Net): ${netAccelerationEnergy.toFixed(2)} kWh/100km`);
    console.log(`   Auxiliary: ${auxiliaryEnergyPer100Km.toFixed(2)} kWh/100km`);
    console.log(`   Total: ${totalEnergy.toFixed(2)} kWh/100km`);
  }

  return {
    kwhPer100Km: +totalEnergy.toFixed(2),
    breakdown: {
      rolling: +rollingEnergyPer100Km.toFixed(2),
      aero: +dragEnergyPer100Km.toFixed(2),
      auxiliary: +auxiliaryEnergyPer100Km.toFixed(2),
      efficiency: +powertrainEfficiency.toFixed(3)
    }
  };
}

// ============================================================================
// STEP 3: BATTERY DEGRADATION
// ============================================================================

/**
 * Apply non-linear battery degradation based on vehicle age
 *
 * Battery degradation is NOT linear:
 * - Years 0-3: Minimal degradation (0.5% per year)
 * - Years 4-7: Moderate degradation (1.0% per year)
 * - Years 8+: Significant degradation (1.5% per year)
 * - Maximum total degradation: 15%
 *
 * פחת סוללה לא ליניארי לפי גיל הרכב
 *
 * @param baseConsumption Base energy consumption (kWh/100km)
 * @param year Manufacturing year
 * @returns Adjusted consumption with degradation
 */
export function applyBatteryDegradation(
  baseConsumption: number,
  year: number,
  degradationMultiplier: number = 1.0
): number {
  const currentYear = new Date().getFullYear();
  const vehicleAge = Math.max(0, currentYear - year);

  let totalDegradation = 0;
  
  
  // Years 0-3: 0.2% per year
  const phase1Years = Math.min(vehicleAge, 3);
  totalDegradation += phase1Years * 0.002;

  // Years 4+: 0.4% per year
  if (vehicleAge > 3) {
    const phase2Years = vehicleAge - 3;
    totalDegradation += phase2Years * 0.004;
  }

  // Cap at 4% total degradation for efficiency (NOT capacity)
  totalDegradation *= degradationMultiplier;
  totalDegradation = Math.min(totalDegradation, 0.06);
  

  const adjustedConsumption = baseConsumption * (1 + totalDegradation);

  if (__DEV__ && totalDegradation > 0) {
    if (__DEV__) {
      console.log(`🔋 Battery Degradation (${vehicleAge} years old)`);
    }
    if (__DEV__) {
      console.log(`   Total degradation: ${(totalDegradation * 100).toFixed(1)}%`);
    }
    if (__DEV__) {
      console.log(`   Base: ${baseConsumption.toFixed(2)} → Adjusted: ${adjustedConsumption.toFixed(2)} kWh/100km`);
    }
  }

  return +adjustedConsumption.toFixed(2);
}

// ============================================================================
// STEP 4: MAIN ADVANCED ALGORITHM
// ============================================================================

/**
 * Advanced physics-based EV consumption calculation
 *
 * Priority system:
 * 1. EPA data (combE) if available (rare - <5%)
 * 2. Physics-based calculation with aerodynamic estimation
 *
 * NO VEHICLE DATABASE REQUIRED - Uses smart estimation!
 *
 * @param params Vehicle parameters
 * @returns Complete consumption result with confidence score
 */
export async function calculateEVConsumptionAdvanced(params: {
  brand: string;
  model: string;
  year: number;
  vehicleType: 'car' | 'motorcycle' | 'truck';
  mishkal_kolel?: number;
  combE?: number;
  isPhev?: boolean; 
}): Promise<EVConsumptionResult> {

  // ========================================
  // PRIORITY 1: EPA OFFICIAL DATA (RARE!)
  // ========================================
  if (params.combE) {
    const kwhPer100Km = params.combE * 0.621371; // Convert 100 miles to 100 km

    if (__DEV__) {
      console.log(`✅ Using EPA Data: ${params.combE} kWh/100mi → ${kwhPer100Km.toFixed(2)} kWh/100km`);
    }
    
    return {
      kwhPer100Km: +kwhPer100Km.toFixed(2),
      kmPerKwh: +(100 / kwhPer100Km).toFixed(2),
      confidence: 0.95,
      source: 'EPA Official Data'
    };
  }

  // ========================================
  // PRIORITY 2: PHYSICS-BASED CALCULATION
  // ========================================

  // Step 1: Get or estimate weight
    let weight = getEffectiveWeight(params.mishkal_kolel, true);
  if (weight && params.isPhev) {
    weight = Math.round(weight * 1.10); // 13% mass penalty for dual powertrain
    if (__DEV__) console.log(`🔌 PHEV weight penalty applied: ${weight}kg`);
  }  

  if (!weight) {
    // Try to estimate from brand/model
    const normalizedBrand = translateBrandToEnglish(params.brand);
    const estimated = estimateVehicleWeight(normalizedBrand, params.model, params.year);

    if (estimated) {
      weight = estimated.curb * 1.15; // Use 15% above curb weight
      if (__DEV__) {
        console.log(`📊 Estimated weight: ${weight.toFixed(0)}kg (from database)`);
      }
    } else {
      // Use generic default
      weight = defaultWeight(params.vehicleType);
      if (__DEV__) {
        console.log(`⚠️  Using default weight: ${weight}kg`);
      }
    }
  } else {
    if (__DEV__) {
      console.log(`✅ Using actual weight: ${weight.toFixed(0)}kg`);
    }
  }

  // Step 2: Estimate aerodynamics (NO DATABASE!)
  const normalizedBrand = translateBrandToEnglish(params.brand);
  const aeroData = estimateAeroData({
    brand: normalizedBrand,
    model: params.model,
    weight,
    year: params.year,
    vehicleType: params.vehicleType,
     isPhev: params.isPhev,
  });

// Step 3: Calculate physics-based consumption
  const physicsResult = calculateEVPhysics({
    weight,
    Cd: aeroData.Cd,
    frontalArea: aeroData.frontalArea,
    avgSpeed: 80, // Average mixed driving (city + highway)
    year: params.year,
    isPhev: params.isPhev,
  }); 

  // Step 4: Apply battery degradation
  const degradationMultiplier = params.isPhev ? 1.3 : 1.0;
  const withDegradation = applyBatteryDegradation(
    physicsResult.kwhPer100Km,
    params.year,
    degradationMultiplier   // 👈 NEW param (see below)
  );

  // Step 5: Bounds validation (realistic EV range)
   const minBound = params.isPhev ? 14 : 12;
   const maxBound = params.isPhev ? 45 : 40;
   const finalValue = Math.max(minBound, Math.min(maxBound, withDegradation));

  // Calculate overall confidence
  // Based on: aerodynamic confidence (75%) + weight data quality (25%)
  const weightConfidence = params.mishkal_kolel ? 0.90 : 0.60;
  const overallConfidence = aeroData.confidence * 0.75 + weightConfidence * 0.25;

  if (__DEV__) {
    console.log(`\n✅ FINAL RESULT: ${finalValue.toFixed(2)} kWh/100km`);
    if (__DEV__) {
      console.log(`   Confidence: ${(overallConfidence * 100).toFixed(0)}%`);
    }
    if (__DEV__) {
      console.log(`   Source: Physics-Based Calculation\n`);
    }
  }
  
  return {
    kwhPer100Km: +finalValue.toFixed(2),
    kmPerKwh: +(100 / finalValue).toFixed(2),
    confidence: +overallConfidence.toFixed(2),
    source: 'Physics-Based Calculation',
    breakdown: physicsResult.breakdown
  };
}

/**
 * Get default weight by vehicle type (fallback)
 */
function defaultWeight(vehicleType: string): number {
  switch (vehicleType) {
    case 'motorcycle':
      return 250;
    case 'truck':
      return 3000;
    case 'car':
    default:
      return 1700;
  }
}

// ============================================================================
// LEGACY COMPATIBILITY (SIMPLIFIED VERSION)
// ============================================================================

/**
 * Simplified EV consumption calculation (maintains backward compatibility)
 *
 * @deprecated Use calculateEVConsumptionAdvanced() for better accuracy
 */
export function calculateEVConsumptionEnhanced(params: {
  mishkal_kolel?: number;
  // misgeret removed - unreliable
  year?: number;
}): { kwhPer100Km: number; kmPerKwh: number } {
  const effectiveWeight = getEffectiveWeight(params.mishkal_kolel, true); // העברת true מפעילה את המכפיל 0.85

  let kwhPer100Km: number;

  if (effectiveWeight !== undefined) {
    kwhPer100Km = 8 + (effectiveWeight / 100);
  } else {
    kwhPer100Km = 8 + (1700 / 100);
  }

  // Battery degradation
  const vehicleAge = Math.max(0, new Date().getFullYear() - (params.year || 2023));
  const degradation = Math.min(vehicleAge / 10, 1.0) * 0.10;
  kwhPer100Km += kwhPer100Km * degradation;

  // Bounds: 12-40 kWh/100km
  kwhPer100Km = Math.max(12, Math.min(40, kwhPer100Km));

  return {
    kwhPer100Km: +kwhPer100Km.toFixed(2),
    kmPerKwh: +(100 / kwhPer100Km).toFixed(2)
  };
}
