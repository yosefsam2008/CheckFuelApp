import { Calculator, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

interface EmptyStateProps {
  onCreateFirst: () => void;
}

export function EmptyState({ onCreateFirst }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-8 animate-fade-in">
      {/* Animated illustration */}
      <div className="relative mb-8">
        <div className="w-32 h-32 rounded-full bg-primary/10 flex items-center justify-center animate-float">
          <div className="w-24 h-24 rounded-full bg-primary/20 flex items-center justify-center">
            <Calculator className="w-12 h-12 text-primary" strokeWidth={1.5} />
          </div>
        </div>
        {/* Floating sparkles */}
        <Sparkles className="absolute top-0 right-0 w-6 h-6 text-primary/60 animate-pulse-soft" />
        <Sparkles
          className="absolute bottom-2 left-0 w-5 h-5 text-primary/40 animate-pulse-soft"
          style={{ animationDelay: "0.5s" }}
        />
      </div>

      <h2 className="text-2xl font-bold text-foreground mb-3 text-center" dir="rtl">
        אין היסטוריה עדיין
      </h2>
      <p className="text-muted-foreground text-center mb-8 max-w-xs leading-relaxed" dir="rtl">
        כל החישובים שלך יופיעו כאן. התחל לחשב נסיעות כדי לעקוב אחר ההוצאות שלך.
      </p>

      <Button
        onClick={onCreateFirst}
        className="bg-gradient-primary text-primary-foreground shadow-glow hover:shadow-elevated transition-all duration-300 px-8 py-6 text-base font-semibold rounded-xl"
      >
        <Calculator className="w-5 h-5 ml-2" />
        צור חישוב ראשון
      </Button>
    </div>
  );
}
