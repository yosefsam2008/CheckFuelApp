import React from 'react';
import { BarChart3, Car, Fuel, Gauge, Route, RefreshCw, List } from 'lucide-react-native';
import { Vehicle, CalculationResult } from '@/lib/data/vehiclesData';

interface ResultsStepProps {
  result: CalculationResult | null;
  vehicle: Vehicle | null;
  onReset: () => void;
  onViewVehicles: () => void;
}

export const ResultsStep: React.FC<ResultsStepProps> = ({
  result,
  vehicle,
  onReset,
  onViewVehicles,
}) => {
  if (!result) return null;

  return (
    <div className="glass-card p-6 animate-slide-up">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 rounded-full bg-accent/20 flex items-center justify-center">
          <BarChart3 className="w-6 h-6 text-accent" />
        </div>
        <h2 className="text-xl font-semibold text-foreground">התוצאות שלך</h2>
      </div>

      {/* Primary Result */}
      <div className="result-highlight mb-6 pulse-glow">
        <p className="text-4xl font-bold text-accent-foreground">
          ₪{result.totalCost.toFixed(2)}
        </p>
        <p className="text-accent-foreground/80 mt-1">עלות כוללת</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <div className="glass-card-interactive p-4 text-center">
          <Route className="w-5 h-5 text-primary mx-auto mb-2" />
          <p className="text-xs text-muted-foreground mb-1">מרחק</p>
          <p className="text-lg font-semibold text-foreground">{result.distance} ק״מ</p>
        </div>

        <div className="glass-card-interactive p-4 text-center">
          <Fuel className="w-5 h-5 text-primary mx-auto mb-2" />
          <p className="text-xs text-muted-foreground mb-1">
            {result.energyType === 'electricity' ? 'חשמל' : 'דלק'}
          </p>
          <p className="text-lg font-semibold text-foreground">
            {result.fuelConsumed.toFixed(2)} {result.energyType === 'electricity' ? 'kWh' : 'ל'}
          </p>
        </div>

        <div className="glass-card-interactive p-4 text-center">
          <Gauge className="w-5 h-5 text-primary mx-auto mb-2" />
          <p className="text-xs text-muted-foreground mb-1">יעילות</p>
          <p className="text-lg font-semibold text-foreground">
            {result.consumption.toFixed(result.energyType === 'electricity' ? 4 : 2)} {result.energyType === 'electricity' ? 'kWh/ק״מ' : 'km/l'}
          </p>
        </div>

        <div className="glass-card-interactive p-4 text-center">
          <BarChart3 className="w-5 h-5 text-primary mx-auto mb-2" />
          <p className="text-xs text-muted-foreground mb-1">עלות לק״מ</p>
          <p className="text-lg font-semibold text-foreground">₪{result.costPerKm.toFixed(2)}</p>
        </div>
      </div>

      {/* Vehicle Info */}
      <div className="glass-card p-4 mb-6">
        <div className="flex items-center gap-3">
          <Car className="w-5 h-5 text-muted-foreground" />
          <div>
            <p className="text-foreground font-medium">
              {vehicle?.name} ({vehicle?.model})
            </p>
            <p className="text-sm text-muted-foreground">{vehicle?.fueltype}</p>
          </div>
        </div>
      </div>

      {/* Actions */}
      <button
        className="btn-primary w-full flex items-center justify-center gap-2 mb-3"
        onClick={onReset}
      >
        <RefreshCw className="w-4 h-4" />
        התחל חישוב חדש
      </button>

      <button
        className="btn-secondary w-full flex items-center justify-center gap-2"
        onClick={onViewVehicles}
      >
        <List className="w-4 h-4" />
        הצג את כל הרכבים
      </button>
    </div>
  );
};
