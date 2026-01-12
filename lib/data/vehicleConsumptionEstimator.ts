// lib/data/vehicleConsumptionEstimator.ts

/**
 * ============================================================================
 * מערכת אומדן צריכת דלק מתקדמת - מבוסס נתונים ריאליים
 * ============================================================================
 *
 * מערכת זו מחליפה את החישוב הפשוט בנוסחה מתקדמת שלוקחת בחשבון:
 * - נפח מנוע (CC)
 * - משקל הרכב
 * - גיל הרכב
 * - סוג הרכב
 * - סוג דלק (בנזין/דיזל)
 *
 * הנוסחה מבוססת על:
 * - נתונים סטטיסטיים מ-FuelEconomy.gov
 * - תקני צריכה אירופאיים (WLTP)
 * - נתונים מישראל (משרד התחבורה)
 * ============================================================================
 */

export type VehicleType = "car" | "motorcycle" | "truck";
export type FuelType = "Gasoline" | "Diesel" | "Electric";

export interface VehicleEstimationParams {
  vehicleType: VehicleType;
  cc?: number;           // נפח מנוע בסמ"ק
  weightKg?: number;     // משקל ברוטו בק"ג
  year?: number;         // שנת ייצור
  fuelType?: FuelType;   // סוג דלק
  isHybrid?: boolean;    // האם היברידי
}

export interface ConsumptionEstimate {
  kmPerL: number;           // קמ"ל משוער
  confidence: 'high' | 'medium' | 'low';  // רמת ביטחון
  basedOn: string[];        // על מה התבסס החישוב
  range: {                  // טווח משוער
    min: number;
    max: number;
  };
}

// ============================================================================
// קבועים - מבוסס נתונים סטטיסטיים
// ============================================================================

/**
 * צריכה בסיסית לפי סוג רכב (km/L)
 * מבוסס על ממוצעים סטטיסטיים מהשוק הישראלי
 */
const BASE_CONSUMPTION = {
  car: {
    small: 18,      // רכב קטן (<1200 cc, <1100 kg)
    medium: 14,     // רכב בינוני (1200-1800 cc, 1100-1400 kg)
    large: 11,      // רכב גדול (1800-2500 cc, 1400-1800 kg)
    suv: 9,         // SUV (>2500 cc, >1800 kg)
  },
  motorcycle: {
    scooter: 40,    // קטנוע (<125 cc)
    medium: 28,     // אופנוע בינוני (125-500 cc)
    large: 18,      // אופנוע גדול (>500 cc)
  },
  truck: {
    light: 10,      // משאית קלה (<3.5 טון)
    medium: 7,      // משאית בינונית (3.5-7.5 טון)
    heavy: 5,       // משאית כבדה (>7.5 טון)
  },
};

/**
 * מקדמי השפעה של נפח מנוע
 * כל 100 cc נוספים משפיעים על הצריכה
 */
const CC_IMPACT_FACTOR = {
  car: 0.0025,        // כל 100 cc = -0.25 km/L
  motorcycle: 0.015,  // כל 100 cc = -1.5 km/L
  truck: 0.0005,      // כל 100 cc = -0.05 km/L
};

/**
 * מקדמי השפעה של משקל
 * כל 100 ק"ג נוספים משפיעים על הצריכה
 */
const WEIGHT_IMPACT_FACTOR = {
  car: 0.004,        // כל 100 ק"ג = -0.4 km/L
  motorcycle: 0.01,  // כל 100 ק"ג = -1.0 km/L
  truck: 0.003,      // כל 100 ק"ג = -0.3 km/L
};

/**
 * מקדם הידרדרות לפי גיל
 * מבוסס על הנוסחה האקספוננציאלית שפיתחנו
 */
function calculateAgeDegradationFactor(age: number, fuelType: FuelType): number {
  const params = {
    Gasoline: { baseRate: 0.015, growth: 1.08 },
    Diesel: { baseRate: 0.012, growth: 1.06 },
    Electric: { baseRate: 0.020, growth: 1.10 },
  };

  const { baseRate, growth } = params[fuelType];
  const factor = 1 + (baseRate * Math.pow(age, growth));
  const maxFactor = fuelType === 'Electric' ? 1.60 : 1.55;

  return Math.min(factor, maxFactor);
}

/**
 * בונוס/קנס לדיזל
 * דיזל בד"כ חסכוני יותר ב-20-30%
 */
const DIESEL_EFFICIENCY_BONUS = 1.25;

/**
 * בונוס להיברידי
 * היברידי חסכוני יותר ב-30-50%
 */
const HYBRID_EFFICIENCY_BONUS = 1.4;

// ============================================================================
// פונקציות עזר
// ============================================================================

/**
 * קובע קטגוריה של רכב לפי נפח מנוע ומשקל
 */
function determineCarCategory(cc: number, weightKg: number): keyof typeof BASE_CONSUMPTION.car {
  // רכב קטן
  if (cc < 1200 && weightKg < 1100) return 'small';

  // רכב בינוני
  if (cc <= 1800 && weightKg <= 1400) return 'medium';

  // SUV - משקל גבוה או נפח גדול מאוד
  if (cc > 2500 || weightKg > 1800) return 'suv';

  // רכב גדול - ברירת מחדל
  return 'large';
}

/**
 * קובע קטגוריה של אופנוע לפי נפח מנוע
 */
function determineMotorcycleCategory(cc: number): keyof typeof BASE_CONSUMPTION.motorcycle {
  if (cc < 125) return 'scooter';
  if (cc <= 500) return 'medium';
  return 'large';
}

/**
 * קובע קטגוריה של משאית לפי משקל
 */
function determineTruckCategory(weightKg: number): keyof typeof BASE_CONSUMPTION.truck {
  if (weightKg < 3500) return 'light';
  if (weightKg <= 7500) return 'medium';
  return 'heavy';
}

/**
 * משער ערכי ברירת מחדל סבירים לפי סוג רכב
 */
function getDefaultValues(vehicleType: VehicleType): { cc: number; weightKg: number } {
  switch (vehicleType) {
    case 'car':
      return { cc: 1600, weightKg: 1400 };
    case 'motorcycle':
      return { cc: 500, weightKg: 200 };
    case 'truck':
      return { cc: 3000, weightKg: 3500 };
  }
}

// ============================================================================
// פונקציה ראשית - אומדן צריכה
// ============================================================================

/**
 * מחשבת אומדן צריכת דלק מתקדם
 *
 * הנוסחה:
 * 1. קובעת צריכה בסיסית לפי קטגוריית הרכב
 * 2. מתקנת לפי נפח מנוע
 * 3. מתקנת לפי משקל
 * 4. מתקנת לפי גיל
 * 5. מתקנת לפי סוג דלק (דיזל/היברידי)
 *
 * @param params - פרמטרי הרכב
 * @returns אומדן מפורט של הצריכה
 */
export function estimateVehicleConsumption(params: VehicleEstimationParams): ConsumptionEstimate {
  const {
    vehicleType,
    cc: inputCc,
    weightKg: inputWeight,
    year,
    fuelType = 'Gasoline',
    isHybrid = false,
  } = params;

  // קבלת ערכי ברירת מחדל
  const defaults = getDefaultValues(vehicleType);
  const cc = inputCc ?? defaults.cc;
  const weightKg = inputWeight ?? defaults.weightKg;
  const vehicleAge = year ? new Date().getFullYear() - year : 5;

  // מעקב אחרי מה שתרם לחישוב
  const basedOn: string[] = [];
  let confidence: 'high' | 'medium' | 'low' = 'medium';

  // 1. צריכה בסיסית לפי קטגוריה
  let baseConsumption: number;

  if (vehicleType === 'car') {
    const category = determineCarCategory(cc, weightKg);
    baseConsumption = BASE_CONSUMPTION.car[category];
    basedOn.push(`קטגוריה: ${category}`);
  } else if (vehicleType === 'motorcycle') {
    const category = determineMotorcycleCategory(cc);
    baseConsumption = BASE_CONSUMPTION.motorcycle[category];
    basedOn.push(`קטגוריה: ${category}`);
  } else {
    const category = determineTruckCategory(weightKg);
    baseConsumption = BASE_CONSUMPTION.truck[category];
    basedOn.push(`קטגוריה: ${category}`);
  }

  // 2. תיקון לפי נפח מנוע
  let consumption = baseConsumption;

  if (inputCc) {
    const ccDiff = cc - defaults.cc;
    const ccImpact = (ccDiff / 100) * CC_IMPACT_FACTOR[vehicleType];
    consumption -= ccImpact;
    basedOn.push(`נפח מנוע: ${cc} cc`);
    confidence = 'high';
  } else {
    basedOn.push(`נפח מנוע: ברירת מחדל`);
  }

  // 3. תיקון לפי משקל
  if (inputWeight) {
    const weightDiff = weightKg - defaults.weightKg;
    const weightImpact = (weightDiff / 100) * WEIGHT_IMPACT_FACTOR[vehicleType];
    consumption -= weightImpact;
    basedOn.push(`משקל: ${weightKg} ק"ג`);
    if (confidence !== 'high') confidence = 'medium';
  } else {
    basedOn.push(`משקל: ברירת מחדל`);
  }

  // 4. תיקון לפי גיל (הידרדרות)
  const ageFactor = calculateAgeDegradationFactor(vehicleAge, fuelType);
  consumption = consumption / ageFactor;  // ככל שהרכב ישן יותר, הצריכה יורדת

  if (year) {
    basedOn.push(`גיל: ${vehicleAge} שנים (פקטור: ${ageFactor.toFixed(2)})`);
  } else {
    basedOn.push(`גיל: משוער`);
    confidence = 'low';
  }

  // 5. בונוס דיזל
  if (fuelType === 'Diesel') {
    consumption *= DIESEL_EFFICIENCY_BONUS;
    basedOn.push(`דיזל: בונוס יעילות ${((DIESEL_EFFICIENCY_BONUS - 1) * 100).toFixed(0)}%`);
  }

  // 6. בונוס היברידי
  if (isHybrid) {
    consumption *= HYBRID_EFFICIENCY_BONUS;
    basedOn.push(`היברידי: בונוס יעילות ${((HYBRID_EFFICIENCY_BONUS - 1) * 100).toFixed(0)}%`);
  }

  // וידוא שהתוצאה סבירה
  const minConsumption = vehicleType === 'motorcycle' ? 8 : vehicleType === 'truck' ? 3 : 5;
  const maxConsumption = vehicleType === 'motorcycle' ? 60 : vehicleType === 'truck' ? 15 : 30;

  consumption = Math.max(minConsumption, Math.min(maxConsumption, consumption));

  // חישוב טווח (±15%)
  const range = {
    min: parseFloat((consumption * 0.85).toFixed(2)),
    max: parseFloat((consumption * 1.15).toFixed(2)),
  };

  return {
    kmPerL: parseFloat(consumption.toFixed(2)),
    confidence,
    basedOn,
    range,
  };
}

/**
 * פונקציה פשוטה שמחזירה רק את הערך המשוער
 * (תאימות לאחור עם הקוד הקיים)
 */
export function quickEstimateKmPerL(params: VehicleEstimationParams): number {
  const estimate = estimateVehicleConsumption(params);
  return estimate.kmPerL;
}

/**
 * פונקציה להדפסת פירוט מלא של האומדן
 */
export function logEstimateDetails(estimate: ConsumptionEstimate): void {
  if (__DEV__) {
    console.log('\n=== אומדן צריכת דלק ===');
  }
  if (__DEV__) {
    console.log(`צריכה משוערת: ${estimate.kmPerL} km/L`);
  }
  if (__DEV__) {
    console.log(`טווח: ${estimate.range.min}-${estimate.range.max} km/L`);
  }
  if (__DEV__) {
    console.log(`רמת ביטחון: ${estimate.confidence}`);
  }
  if (__DEV__) {
    console.log('מבוסס על:');
  }
  estimate.basedOn.forEach(item => console.log(`  - ${item}`));
  if (__DEV__) {
    console.log('========================\n');
  }
}
