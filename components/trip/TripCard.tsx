import { TripRecord } from "@/types/trip";
import { Fuel, Zap, MapPin, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

interface TripCardProps {
  trip: TripRecord;
  onClick: () => void;
  index: number;
}

export function TripCard({ trip, onClick, index }: TripCardProps) {
  const isElectric = trip.energyType === "electricity";

  const formatDate = (timestamp: number): string => {
    const date = new Date(timestamp);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return `היום, ${date.toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit" })}`;
    } else if (date.toDateString() === yesterday.toDateString()) {
      return `אתמול, ${date.toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit" })}`;
    } else {
      return date.toLocaleDateString("he-IL", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    }
  };

  return (
    <div
      onClick={onClick}
      className={cn(
        "group relative overflow-hidden rounded-2xl p-5 cursor-pointer",
        "bg-card border border-border/50",
        "hover-lift shadow-card",
        "animate-slide-up"
      )}
      style={{ animationDelay: `${index * 50}ms` }}
    >
      {/* Background gradient accent */}
      <div
        className={cn(
          "absolute top-0 right-0 w-32 h-32 opacity-10 blur-2xl rounded-full -translate-y-1/2 translate-x-1/2 transition-opacity duration-300 group-hover:opacity-20",
          isElectric ? "bg-electric" : "bg-primary"
        )}
      />

      <div className="relative flex items-center justify-between" dir="rtl">
        {/* Left side - Icon and Info */}
        <div className="flex items-center gap-4">
          {/* Energy Type Icon */}
          <div
            className={cn(
              "flex items-center justify-center w-14 h-14 rounded-xl transition-all duration-300",
              isElectric
                ? "bg-electric/10 text-electric group-hover:bg-electric/20"
                : "bg-primary/10 text-primary group-hover:bg-primary/20"
            )}
          >
            {isElectric ? (
              <Zap className="w-7 h-7" strokeWidth={2.5} />
            ) : (
              <Fuel className="w-7 h-7" strokeWidth={2} />
            )}
          </div>

          {/* Vehicle Info */}
          <div className="space-y-1.5 text-right">
            <h3 className="font-semibold text-foreground text-lg leading-tight">
              {trip.vehicleName}
            </h3>
            <div className="flex items-center gap-3 text-muted-foreground text-sm">
              <span className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" />
                {formatDate(trip.timestamp)}
              </span>
            </div>
          </div>
        </div>

        {/* Right side - Cost and Distance */}
        <div className="text-left space-y-1.5">
          <p
            className={cn(
              "text-2xl font-bold",
              isElectric ? "text-electric" : "text-primary"
            )}
          >
            ₪{trip.totalCost.toFixed(2)}
          </p>
          <p className="flex items-center gap-1.5 text-muted-foreground text-sm">
            <MapPin className="w-3.5 h-3.5" />
            {trip.distance} ק״מ
          </p>
        </div>
      </div>

      {/* Bottom badge */}
      <div className="mt-4 pt-3 border-t border-border/50">
        <div className="flex items-center justify-between" dir="rtl">
          <span
            className={cn(
              "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium",
              isElectric
                ? "bg-electric/10 text-electric"
                : "bg-primary/10 text-primary"
            )}
          >
            {isElectric ? <Zap className="w-3 h-3" /> : <Fuel className="w-3 h-3" />}
            {trip.fuelType}
          </span>
          <span className="text-xs text-muted-foreground">
            ₪{trip.costPerKm.toFixed(2)} לק״מ
          </span>
        </div>
      </div>
    </div>
  );
}
