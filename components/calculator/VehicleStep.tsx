import React from 'react';
import { Car, ArrowLeft, ArrowRight, Plus, ChevronDown, Check, Loader2 } from 'lucide-react-native';
import { Vehicle } from '@/lib/data/vehiclesData';

interface VehicleStepProps {
  vehicles: Vehicle[];
  vehicle: Vehicle | null;
  setVehicle: (v: Vehicle) => void;
  distance: string;
  isLoadingVehicles: boolean;
  showVehicleModal: boolean;
  setShowVehicleModal: (show: boolean) => void;
  validateVehicle: () => boolean;
  onNext: () => void;
  onPrev: () => void;
  onAddVehicle: () => void;
}

export const VehicleStep: React.FC<VehicleStepProps> = ({
  vehicles,
  vehicle,
  setVehicle,
  distance,
  isLoadingVehicles,
  showVehicleModal,
  setShowVehicleModal,
  validateVehicle,
  onNext,
  onPrev,
  onAddVehicle,
}) => {
  return (
    <div className="glass-card p-6 animate-slide-up">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
          <Car className="w-6 h-6 fuel-icon" />
        </div>
        <h2 className="text-xl font-semibold text-foreground">בחר רכב</h2>
      </div>

      {isLoadingVehicles ? (
        <div className="flex flex-col items-center justify-center py-12 gap-3">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
          <p className="text-muted-foreground">טוען רכבים...</p>
        </div>
      ) : vehicles.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 gap-4">
          <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center">
            <Car className="w-8 h-8 text-muted-foreground" />
          </div>
          <p className="text-muted-foreground">אין רכבים שמורים</p>
          <button
            className="btn-primary flex items-center gap-2"
            onClick={onAddVehicle}
          >
            <Plus className="w-4 h-4" />
            הוסף רכב
          </button>
        </div>
      ) : (
        <>
          <div className="relative">
            <button
              className={`w-full p-4 rounded-lg border-2 transition-all duration-200 text-right flex items-center justify-between ${
                vehicle
                  ? 'border-primary bg-primary/10'
                  : 'border-border bg-secondary/50 hover:border-muted-foreground/50'
              }`}
              onClick={() => setShowVehicleModal(true)}
            >
              <span className={vehicle ? 'text-foreground font-medium' : 'text-muted-foreground'}>
                {vehicle ? `${vehicle.name} (${vehicle.model})` : 'בחר רכב'}
              </span>
              <ChevronDown className="w-5 h-5 text-muted-foreground" />
            </button>

            {showVehicleModal && (
              <div 
                className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                onClick={() => setShowVehicleModal(false)}
              >
                <div 
                  className="glass-card w-full max-w-md max-h-[70vh] overflow-hidden animate-slide-up"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="p-4 border-b border-border">
                    <h3 className="text-lg font-semibold text-foreground">בחר רכב</h3>
                  </div>
                  <div className="overflow-y-auto max-h-[50vh]">
                    {vehicles.map((item) => (
                      <button
                        key={item.id}
                        className={`w-full p-4 text-right border-b border-border/50 transition-all duration-200 hover:bg-primary/10 ${
                          vehicle?.id === item.id ? 'bg-primary/20' : ''
                        }`}
                        onClick={() => {
                          setVehicle(item);
                          setShowVehicleModal(false);
                        }}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium text-foreground">
                              {item.name} ({item.model})
                            </p>
                            <p className="text-sm text-muted-foreground mt-1">
                              {item.engine} | {item.fueltype}
                              {item.avgConsumption
                                ? ` | ${item.avgConsumption.toFixed(item.fueltype === 'Electric' ? 4 : 1)} ${item.fueltype === 'Electric' ? 'kWh/ק״מ' : 'km/l'}`
                                : ''}
                            </p>
                          </div>
                          {vehicle?.id === item.id && (
                            <Check className="w-5 h-5 text-primary" />
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                  <div className="p-4 border-t border-border">
                    <button
                      className="btn-secondary w-full"
                      onClick={() => setShowVehicleModal(false)}
                    >
                      סגור
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {vehicle?.avgConsumption && distance && (
            <div className="mt-4 p-3 rounded-lg bg-secondary/50 border border-border">
              <p className="text-sm text-muted-foreground">
                {vehicle.fueltype === 'Electric'
                  ? `טווח נאמד: ${(parseFloat(distance) / vehicle.avgConsumption).toFixed(2)}% של הסוללה`
                  : `צריכת דלק מוערכת: ${(parseFloat(distance) / vehicle.avgConsumption).toFixed(2)} ליטרים`}
              </p>
            </div>
          )}
        </>
      )}

      <div className="flex gap-3 mt-8">
        <button className="btn-secondary flex-1 flex items-center justify-center gap-2" onClick={onPrev}>
          <ArrowRight className="w-4 h-4" />
          חזור
        </button>
        <button
          className="btn-primary flex-1 flex items-center justify-center gap-2"
          onClick={onNext}
          disabled={!validateVehicle()}
        >
          המשך
          <ArrowLeft className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
