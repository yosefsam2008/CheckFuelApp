import { TripRecord } from "@/types/trip";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Car,
  Calendar,
  MapPin,
  Fuel,
  Zap,
  TrendingUp,
  Coins,
  Battery,
  Trash2,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface TripDetailsModalProps {
  trip: TripRecord | null;
  open: boolean;
  onClose: () => void;
  onDelete: () => void;
}

export function TripDetailsModal({
  trip,
  open,
  onClose,
  onDelete,
}: TripDetailsModalProps) {
  if (!trip) return null;

  const isElectric = trip.energyType === "electricity";

  const formatDate = (timestamp: number): string => {
    return new Date(timestamp).toLocaleDateString("he-IL", {
      weekday: "long",
      day: "2-digit",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const details = [
    {
      icon: Car,
      label: "רכב",
      value: `${trip.vehicleName} (${trip.vehicleModel})`,
    },
    {
      icon: Calendar,
      label: "תאריך",
      value: formatDate(trip.timestamp),
    },
    {
      icon: MapPin,
      label: "מרחק",
      value: `${trip.distance} ק״מ`,
    },
    {
      icon: isElectric ? Zap : Fuel,
      label: isElectric ? "חשמל" : "דלק",
      value: `${trip.fuelConsumed.toFixed(2)} ${isElectric ? "kWh" : "ליטר"}`,
    },
    {
      icon: TrendingUp,
      label: "יעילות",
      value: `${trip.consumption.toFixed(isElectric ? 4 : 2)} ${isElectric ? "kWh/ק״מ" : "km/l"}`,
    },
    {
      icon: Coins,
      label: "עלות לק״מ",
      value: `₪${trip.costPerKm.toFixed(2)}`,
    },
    {
      icon: Battery,
      label: "סוג אנרגיה",
      value: trip.fuelType,
    },
  ];

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md glass-strong border-border/50 p-0 overflow-hidden">
        {/* Header with gradient */}
        <div
          className={cn(
            "relative px-6 pt-6 pb-8",
            isElectric ? "bg-gradient-electric" : "bg-gradient-primary"
          )}
        >
          <button
            onClick={onClose}
            className="absolute top-4 left-4 w-8 h-8 rounded-full bg-card/20 backdrop-blur-sm flex items-center justify-center text-primary-foreground/80 hover:text-primary-foreground hover:bg-card/30 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>

          <DialogHeader className="text-primary-foreground" dir="rtl">
            <DialogTitle className="text-xl font-bold text-center">
              פרטי נסיעה
            </DialogTitle>
          </DialogHeader>

          {/* Primary Cost Display */}
          <div className="mt-6 text-center">
            <p className="text-5xl font-extrabold text-primary-foreground">
              ₪{trip.totalCost.toFixed(2)}
            </p>
            <p className="text-primary-foreground/80 mt-2 text-sm font-medium">
              עלות כוללת
            </p>
          </div>
        </div>

        {/* Details Grid */}
        <div className="p-6 space-y-3" dir="rtl">
          {details.map((detail, index) => (
            <div
              key={index}
              className="flex items-center justify-between py-3 border-b border-border/50 last:border-0"
            >
              <div className="flex items-center gap-3">
                <div
                  className={cn(
                    "w-9 h-9 rounded-lg flex items-center justify-center",
                    isElectric
                      ? "bg-electric/10 text-electric"
                      : "bg-primary/10 text-primary"
                  )}
                >
                  <detail.icon className="w-4 h-4" />
                </div>
                <span className="text-muted-foreground font-medium text-sm">
                  {detail.label}
                </span>
              </div>
              <span className="text-foreground font-semibold text-sm">
                {detail.value}
              </span>
            </div>
          ))}
        </div>

        {/* Actions */}
        <div className="px-6 pb-6 space-y-3">
          <Button
            variant="outline"
            onClick={onDelete}
            className="w-full border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive hover:border-destructive/50 transition-all duration-200"
          >
            <Trash2 className="w-4 h-4 ml-2" />
            מחק נסיעה זו
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
