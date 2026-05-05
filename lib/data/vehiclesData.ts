//lib/data/vehiclesData.ts
export interface Vehicle {
  id: string;
  plate: string;
  name: string;
  model: string;
  engine: string;
  type: "car" | "motorcycle" | "truck";

  // צריכת דלק ממוצעת למנועי בעירה פנימית ופלאג-אין
  // נמדד ב: קילומטר לליטר (km/L)
  avgConsumption?: number;

  // צריכת חשמל למערכות חשמליות מלאות ופלאג-אין
  // נמדד ב: קוט"ש לקילומטר (kWh/km)
  evConsumption?: number;

  year?: number;
  
  // שימוש בטיפוסים קשיחים (Union Types) במקום string רגיל למניעת שגיאות
  fueltype?: "Electric" | "Gasoline" | "Diesel" | "PHEV" | "Unknown";
  
  tankCapacity?: number; // Tank capacity in liters (for fuel) or kWh (for electric)

  // Weight data for improved consumption calculations
  mishkal_kolel?: number;  // Gross vehicle weight (kg) - from Israeli gov API
  
  /** @deprecated misgeret is unreliable in Israeli API (often contains VIN) - do not use */
  misgeret?: number;
}
export interface CalculationResult {
  totalCost: number;
  distance: number;
  
  // הופרד לשני שדות אופציונליים כדי לתמוך בנסיעות משולבות (PHEV)
  fuelConsumed?: number; // liters for fuel (Gasoline/Diesel)
  electricityConsumed?: number; // kWh for electric
  
  // Consumption rate (הופרד גם כן):
  fuelConsumptionRate?: number; // km/L
  electricityConsumptionRate?: number; // kWh/km
  
  costPerKm: number;
  
  // הוספת 'phev_mixed' למקרים של נסיעה משולבת
  energyType: 'fuel' | 'electricity' | 'phev_mixed';
}

/**
 * Accurately determines if a vehicle is an SUV/Crossover based on Gov.il model strings.
 * Includes strict exclusions for standard M1 hatchbacks/sedans.
 */
export function determineIfSUV(modelName: string, vehicleCategory: string): boolean {
  if (!modelName) return false;
  
  const upperModel = modelName.toUpperCase();
  
  // Explicitly block standard M1 vehicles from triggering SUV aerodynamic penalties
  const nonSuvExceptions = ['COROLLA', 'OCTAVIA', 'MAZDA 3', 'GOLF', 'LEON', 'I20', 'I30', 'PICANTO', 'JAZZ'];
  if (nonSuvExceptions.some(car => upperModel.includes(car))) {
    return false;
  }

  // Identify true SUVs/Crossovers
  const suvKeywords = ['SUV', 'CROSS', 'X', 'SPORTAGE', 'TUCSON', 'CX-', 'RAV4', 'QASHQAI', 'JUKE', '2008', '3008'];
  
  return suvKeywords.some(keyword => upperModel.includes(keyword)) || vehicleCategory.includes('M1G');
}
