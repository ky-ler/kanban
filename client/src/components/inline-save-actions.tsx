import { Button } from "@/components/ui/button";
import { getSaveShortcutHint } from "@/lib/keyboard-shortcuts";
import { cn } from "@/lib/utils";
import { Check, X } from "lucide-react";

interface InlineSaveActionsProps {
  onSave: () => void;
  onCancel: () => void;
  isSaving?: boolean;
  saveDisabled?: boolean;
  cancelDisabled?: boolean;
  saveText?: string;
  savingText?: string;
  className?: string;
}

export function InlineSaveActions({
  onSave,
  onCancel,
  isSaving = false,
  saveDisabled = false,
  cancelDisabled = false,
  saveText = "Save",
  savingText = "Saving...",
  className,
}: Readonly<InlineSaveActionsProps>) {
  const saveShortcutHint = getSaveShortcutHint();

  return (
    <div className={cn("flex items-center gap-2 pt-0.5", className)}>
      <Button
        size="sm"
        variant="outline"
        onClick={onCancel}
        disabled={cancelDisabled}
      >
        <X className="mr-1 h-3 w-3" />
        Cancel
      </Button>
      <Button size="sm" onClick={onSave} disabled={saveDisabled}>
        <Check className="mr-1 h-3 w-3" />
        {isSaving ? savingText : saveText}
      </Button>
      <span className="text-muted-foreground ml-auto text-xs">
        {saveShortcutHint}
      </span>
    </div>
  );
}
