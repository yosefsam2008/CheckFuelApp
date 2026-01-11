// app/fuelConsumptionAdjustments.ts

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
 */

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
    Gasoline: { baseRate: 0.015, growth: 1.08 },  // בנזין - הידרדרות בינונית
    Diesel: { baseRate: 0.012, growth: 1.06 },     // דיזל - עמיד יותר
    Electric: { baseRate: 0.020, growth: 1.10 },   // חשמלי - סוללה מתדרדרת מהר בחום
  };

  const { baseRate, growth } = params[fuelType];

  // נוסחה: 1 + (baseRate × age^growth)
  const factor = 1 + (baseRate * Math.pow(age, growth));

  // הגבלה מקסימלית - רכב ישן מאוד לא יתדרדר לאינסוף
  const maxFactor = fuelType === 'Electric' ? 1.60 : 1.55;
  return Math.min(factor, maxFactor);
}

/**
 * חישוב השפעת סגנון נהיגה
 */
function calculateDrivingStyleFactor(style: 'eco' | 'normal' | 'aggressive'): number {
  const factors = {
    eco: 0.95,        // חסכון של 5%
    normal: 1.05,     // +5% - נהיגה רגילה
    aggressive: 1.20, // +20% - נהיגה אגרסיבית
  };
  return factors[style];
}

/**
 * חישוב השפעת מזג אוויר
 */
function calculateClimateFactor(climate: 'hot' | 'moderate' | 'cold'): number {
  const factors = {
    hot: 1.08,      // +8% בחום (מיזוג)
    moderate: 1.02, // +2% בתנאים מתונים
    cold: 1.10,     // +10% בקור (חימום)
  };
  return factors[climate];
}

/**
 * חישוב השפעת סוג נסיעה
 */
function calculateTripTypeFactor(tripType: 'city' | 'highway' | 'mixed'): number {
  const factors = {
    city: 1.15,    // +15% בעיר (פקקים, עצירות)
    mixed: 1.05,   // +5% מעורב
    highway: 1.02, // +2% כביש מהיר
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
    excellent: 1.00, // תחזוקה מעולה
    good: 1.03,      // +3% תחזוקה רגילה
    fair: 1.08,      // +8% תחזוקה חלקית
    poor: 1.15,      // +15% רכב מוזנח
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
  const ageFactor = calculateAgeDegradation(factors.vehicleAge, factors.fuelType);
  const styleFactor = calculateDrivingStyleFactor(factors.drivingStyle || 'normal');
  const climateFactor = calculateClimateFactor(factors.climate || 'hot');
  const tripFactor = calculateTripTypeFactor(factors.tripType || 'mixed');
  const conditionFactor = calculateConditionFactor(factors.vehicleCondition || 'good');
  const acFactor = factors.useAC ? 1.05 : 1.0;  // +5% עם מיזוג
  const shortTripsFactor = factors.shortTrips ? 1.10 : 1.0;  // +10% נסיעות קצרות

  // חישוב מקדם כולל
  const totalFactor =
    ageFactor *
    styleFactor *
    climateFactor *
    tripFactor *
    conditionFactor *
    acFactor *
    shortTripsFactor;

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
 * המלצות לשיפור צריכת הדלק
 */
export function getConsumptionRecommendations(result: ConsumptionResult): string[] {
  const recommendations: string[] = [];

  if (result.breakdown.ageDegradation > 1.15) {
    recommendations.push('🔧 הרכב שלך ישן יחסית - שקול תחזוקה מקיפה או שדרוג');
  }

  if (result.breakdown.drivingStyle > 1.15) {
    recommendations.push('🚗 נהיגה אגרסיבית מגדילה צריכת דלק - נסה נהיגה רגועה יותר');
  }

  if (result.breakdown.vehicleCondition > 1.10) {
    recommendations.push('⚙️ תחזוקה לקויה - בצע החלפת פילטרים ובדיקת לחץ אוויר בצמיגים');
  }

  if (result.breakdown.tripType > 1.15) {
    recommendations.push('🏙️ נסיעות בעיר צורכות יותר - שקול שימוש בתחבורה ציבורית לנסיעות קצרות');
  }

  if (result.breakdown.shortTrips > 1.0) {
    recommendations.push('📏 נסיעות קצרות לא יעילות - שקול איחוד נסיעות או הליכה רגלית');
  }

  if (result.breakdown.acUsage > 1.0) {
    recommendations.push('❄️ שימוש במיזוג מגדיל צריכת דלק - השתמש בחכמה');
  }

  if (recommendations.length === 0) {
    recommendations.push('✅ הרכב והנהיגה שלך בצורה מעולה!');
  }

  return recommendations;
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
 */
