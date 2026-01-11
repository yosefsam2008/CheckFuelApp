export interface Vehicle {
  id: string;
  plate: string;
  name: string;
  model: string;
  engine: string;
  type: string;
  // Average consumption:
  // - For Electric vehicles: kWh/km (kilowatt-hours per kilometer)
  // - For Gasoline/Diesel: km/L (kilometers per liter)
  avgConsumption?: number;
  year?: number;
  fueltype?: string;
  tankCapacity?: number; // Tank capacity in liters (for fuel) or kWh (for electric)

  // Weight data for improved consumption calculations
  mishkal_kolel?: number;  // Gross vehicle weight (kg) - from Israeli gov API
  misgeret?: number;        // Curb weight (kg) - from Israeli gov API
}

export interface CalculationResult {
  totalCost: number;
  distance: number;
  fuelConsumed: number; // kWh for electric, liters for fuel
  // Consumption rate:
  // - For Electric vehicles: kWh/km (kilowatt-hours per kilometer)
  // - For Gasoline/Diesel: km/L (kilometers per liter)
  consumption: number;
  costPerKm: number;
  energyType: 'fuel' | 'electricity';
}
