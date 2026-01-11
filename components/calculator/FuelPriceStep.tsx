import React from 'react';
import { DollarSign, ArrowLeft, ArrowRight } from 'lucide-react-native';
import { Vehicle } from '@/lib/data/vehiclesData';

const DEFAULT_FUEL_PRICES = {
  Gasoline: 7.36,
  Diesel: 9.58,
  Electric: 0.5,
};

interface FuelPriceStepProps {
  vehicle: Vehicle | null;
  fuelPrice: string;
  setFuelPrice: (value: string) => void;
  validateFuelPrice: (p: string) => boolean;
  onCalculate: () => void;
  onPrev: () => void;
}

export const FuelPriceStep: React.FC<FuelPriceStepProps> = ({
  vehicle,
  fuelPrice,
  setFuelPrice,
  validateFuelPrice,
  onCalculate,
  onPrev,
}) => {
  const isElectric = vehicle?.fueltype === 'Electric';
  const defaultPrice = isElectric
    ? DEFAULT_FUEL_PRICES.Electric
    : vehicle?.fueltype === 'Diesel'
    ? DEFAULT_FUEL_PRICES.Diesel
    : DEFAULT_FUEL_PRICES.Gasoline;

  return (
    <div className="glass-card p-6 animate-slide-up">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
          <DollarSign className="w-6 h-6 fuel-icon" />
        </div>
        <h2 className="text-xl font-semibold text-foreground">
          מה מחיר {isElectric ? 'החשמל' : 'הדלק'}?
        </h2>
      </div>

      <div className="space-y-4">
        <div className="p-3 rounded-lg bg-accent/10 border border-accent/30">
          <p className="text-sm text-accent">
            ממוצע נוכחי בישראל: {defaultPrice} ש״ח{isElectric ? '/kWh' : '/ל'}
          </p>
        </div>

        <input
            type="number"
            className="input-field text-lg"
            placeholder={defaultPrice.toString()}
            value={fuelPrice}
onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFuelPrice((e.target as HTMLInputElement).value)}
            inputMode="decimal"
          />
      </div>

      <div className="flex gap-3 mt-8">
        <button className="btn-secondary flex-1 flex items-center justify-center gap-2" onClick={onPrev}>
          <ArrowRight className="w-4 h-4" />
          חזור
        </button>
        <button
          className="btn-primary flex-1 flex items-center justify-center gap-2"
          onClick={onCalculate}
          disabled={!validateFuelPrice(fuelPrice) && !isElectric}
        >
          חשב
          <ArrowLeft className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
