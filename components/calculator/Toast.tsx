import React from 'react';
import { X, AlertCircle } from 'lucide-react-native';

interface ToastProps {
  message: string;
  onClose: () => void;
}

export const Toast: React.FC<ToastProps> = ({ message, onClose }) => {
  return (
    <div className="fixed bottom-6 left-6 right-6 z-50 animate-slide-up">
      <div className="glass-card p-4 flex items-center justify-between gap-3 border-destructive/50">
        <div className="flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-destructive" />
          <p className="text-foreground text-sm">{message}</p>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded-full hover:bg-secondary transition-colors"
        >
          <X className="w-4 h-4 text-muted-foreground" />
        </button>
      </div>
    </div>
  );
};
