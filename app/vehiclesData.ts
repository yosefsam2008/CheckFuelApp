export interface Vehicle {
  id: string;
  plate: string;
  name: string;
  model: string;
  engine: string;
  type: string;
  avgConsumption?: number; 
  year?: number;
  fueltype?: string;
}
