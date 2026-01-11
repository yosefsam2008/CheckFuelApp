import React from 'react';
import { Fuel, ArrowLeft, X } from 'lucide-react-native';

interface DistanceStepProps {
  distance: string;
  setDistance: (value: string) => void;
  validateDistance: (d: string) => boolean;
  onNext: () => void;
  onCancel: () => void;
}

export const DistanceStep: React.FC<DistanceStepProps> = ({
  distance,
  setDistance,
  validateDistance,
  onNext,
  onCancel,
}) => {
  return (
    <div className="glass-card p-6 animate-slide-up">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
          <Fuel className="w-6 h-6 fuel-icon" />
        </div>
        <h2 className="text-xl font-semibold text-foreground">הכנס מרחק בקילומטרים</h2>
      </div>

      <div className="space-y-4">
        <input
          type="number"
          className="input-field text-lg"
          placeholder="לדוגמה: 150"
          value={distance}
          onChange={(e) => setDistance(e.target.value)}
          inputMode="numeric"
        />
        
        <p className="text-sm text-muted-foreground">
          מרחק בין 0 ל-5000 ק״מ
        </p>
      </div>

      <div className="flex gap-3 mt-8">
        <button className="btn-secondary flex-1 flex items-center justify-center gap-2" onClick={onCancel}>
          <X className="w-4 h-4" />
          ביטול
        </button>
        <button
          className="btn-primary flex-1 flex items-center justify-center gap-2"
          onClick={onNext}
          disabled={!validateDistance(distance)}
        >
          המשך
          <ArrowLeft className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
