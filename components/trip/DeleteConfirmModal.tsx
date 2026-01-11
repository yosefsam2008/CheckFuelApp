import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";

interface DeleteConfirmModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title?: string;
  description?: string;
}

export function DeleteConfirmModal({
  open,
  onClose,
  onConfirm,
  title = "אישור מחיקה",
  description = "האם אתה בטוח שברצונך למחוק נסיעה זו?",
}: DeleteConfirmModalProps) {
  return (
    <AlertDialog open={open} onOpenChange={onClose}>
      <AlertDialogContent className="glass-strong border-border/50 sm:max-w-sm" dir="rtl">
        <AlertDialogHeader className="space-y-4">
          <div className="mx-auto w-14 h-14 rounded-full bg-destructive/10 flex items-center justify-center">
            <AlertTriangle className="w-7 h-7 text-destructive" />
          </div>
          <AlertDialogTitle className="text-center text-xl">
            {title}
          </AlertDialogTitle>
          <AlertDialogDescription className="text-center text-muted-foreground">
            {description}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex-row gap-3 mt-4">
          <Button
            variant="outline"
            onClick={onClose}
            className="flex-1 border-border hover:bg-muted"
          >
            ביטול
          </Button>
          <Button
            onClick={onConfirm}
            className="flex-1 bg-gradient-danger text-destructive-foreground hover:opacity-90"
          >
            מחק
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
