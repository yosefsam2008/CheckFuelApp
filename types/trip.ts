export interface TripRecord {
  id: string;
  date: string;
  timestamp: number;
  distance: number;
  vehicleName: string;
  vehicleModel: string;
  fuelType: string;
  totalCost: number;
  fuelConsumed: number; // kWh for electric, liters for fuel
  costPerKm: number;
  // Consumption rate:
  // - For Electric vehicles: kWh/km (kilowatt-hours per kilometer)
  // - For Gasoline/Diesel: km/L (kilometers per liter)
  consumption: number;
  energyType: "fuel" | "electricity";
}
