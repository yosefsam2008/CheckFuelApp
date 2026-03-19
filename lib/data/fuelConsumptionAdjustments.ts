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
 */
