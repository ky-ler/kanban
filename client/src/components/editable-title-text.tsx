import { useEffect, useRef, useState, type ElementType } from "react";
import { Check, Pencil, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type EditableTitleVariant = "board" | "task";

type EditableTitleTextProps = Readonly<{
  value: string;
  editValue: string;
  setEditValue: (value: string) => void;
  isEditing: boolean;
  canEdit?: boolean;
  onEdit: () => void;
  onSave: (value: string) => void;
  onCancel: () => void;
  validate?: (rawValue: string) => string | null;
  ViewComponent?: ElementType;
}>;

const titleVariantConfig: Record<
  EditableTitleVariant,
  {
    viewClassName: string;
    inputClassName: string;
    pencilClassName: string;
    editContainerClassName: string;
  }
> = {
  board: {
    viewClassName:
      "group w-full max-w-full rounded-md border border-transparent px-2 py-1 text-xl font-bold tracking-tight sm:text-3xl hover:text-primary hover:border-border/40 cursor-pointer transition-colors",
    inputClassName:
      "!text-xl !font-bold !tracking-tight sm:!text-3xl md:!text-3xl",
    pencilClassName:
      "ml-2 inline h-4 w-4 opacity-0 transition-opacity group-hover:opacity-50 md:opacity-0",
    editContainerClassName: "w-full",
  },
  task: {
    viewClassName:
      "group hover:text-primary hover:border-border/40 w-full max-w-full cursor-pointer rounded-md border border-transparent px-2 py-1 text-left text-xl transition-colors",
    inputClassName: "text-xl font-semibold md:text-xl",
    pencilClassName:
      "ml-2 inline h-4 w-4 opacity-70 transition-opacity md:opacity-0 md:group-hover:opacity-100",
    editContainerClassName: "w-full",
  },
};

export function EditableTitleText({
  value,
  editValue,
  setEditValue,
  isEditing,
  canEdit = true,
  onEdit,
  onSave,
  onCancel,
  validate,
  ViewComponent,
  variant,
}: EditableTitleTextProps & Readonly<{ variant: EditableTitleVariant }>) {
  const config = titleVariantConfig[variant];
  const inputRef = useRef<HTMLInputElement>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!isEditing) {
      return;
    }

    if (inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  useEffect(() => {
    if (!isEditing) {
      setErrorMessage(null);
    }
  }, [isEditing]);

  const handleSave = () => {
    const validationError = validate?.(editValue) ?? null;
    if (validationError) {
      setErrorMessage(validationError);
      return;
    }

    setErrorMessage(null);
    onSave(editValue.trim());
  };

  const handleCancel = () => {
    setErrorMessage(null);
    onCancel();
  };

  if (isEditing) {
    return (
      <div className={cn("w-full space-y-1", config.editContainerClassName)}>
        <div className="flex items-center gap-2">
          <div
            className={cn(
              "focus-within:border-ring flex min-w-0 flex-1 items-center rounded-md border px-2 py-1 transition-colors",
              errorMessage &&
                "border-destructive focus-within:border-destructive",
            )}
          >
            <Input
              ref={inputRef}
              value={editValue}
              onChange={(event) => {
                setEditValue(event.target.value);
                if (errorMessage) {
                  setErrorMessage(null);
                }
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  handleSave();
                  return;
                }

                if (event.key === "Escape") {
                  event.preventDefault();
                  handleCancel();
                }
              }}
              className={cn(
                "h-auto border-0 bg-transparent px-0 py-0 shadow-none focus-visible:ring-0",
                config.inputClassName,
              )}
              aria-invalid={Boolean(errorMessage)}
            />
          </div>
          <div className="flex items-center gap-1">
            <Button
              type="button"
              size="icon"
              variant="ghost"
              onClick={handleSave}
              className="shrink-0"
            >
              <Check className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              size="icon"
              variant="ghost"
              onClick={handleCancel}
              className="shrink-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
        {errorMessage ? (
          <p className="text-destructive px-1 text-xs">{errorMessage}</p>
        ) : null}
      </div>
    );
  }

  const shouldShowPencil = canEdit && Boolean(value);
  const TitleViewComponent = ViewComponent ?? "div";

  return (
    <TitleViewComponent
      className={config.viewClassName}
      onClick={canEdit ? onEdit : undefined}
    >
      {value}
      {shouldShowPencil ? <Pencil className={config.pencilClassName} /> : null}
    </TitleViewComponent>
  );
}
