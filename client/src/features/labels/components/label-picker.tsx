import { useState } from "react";
import { Popover as PopoverPrimitive } from "radix-ui";
import { Button } from "@/components/ui/button";
import { PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { IconPlus, IconTrash, IconX } from "@tabler/icons-react";
import { cn } from "@/lib/utils";
import {
  LABEL_COLORS,
  getLabelColorClasses,
  type LabelColor,
} from "../constants";
import { LabelBadge } from "./label-badge";
import {
  getGetLabelsByBoardQueryKey,
  useCreateLabel,
  useDeleteLabel,
  useGetLabelsByBoard,
} from "@/api/gen/endpoints/label-controller/label-controller";
import {
  createLabelBody,
  createLabelBodyNameMax,
} from "@/api/gen/endpoints/label-controller/label-controller.zod";
import { useQueryClient } from "@tanstack/react-query";
import { getGetBoardQueryKey } from "@/api/gen/endpoints/board-controller/board-controller";

interface LabelPickerProps {
  boardId: string;
  selectedLabelIds: string[];
  onChange: (labelIds: string[]) => void;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onPopoverOpenChange?: (open: boolean) => void;
  selectedBadgeSize?: "sm" | "md";
}

export function LabelPicker({
  boardId,
  selectedLabelIds,
  onChange,
  open: openProp,
  onOpenChange,
  onPopoverOpenChange,
  selectedBadgeSize = "sm",
}: LabelPickerProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [newLabelName, setNewLabelName] = useState("");
  const [newLabelColor, setNewLabelColor] = useState<LabelColor>(
    LABEL_COLORS[0].name,
  );
  const [createLabelError, setCreateLabelError] = useState<string | null>(null);

  const queryClient = useQueryClient();
  const { data: labelsResponse } = useGetLabelsByBoard(boardId);
  const labels = [...(labelsResponse?.data ?? [])].sort((a, b) =>
    a.name.localeCompare(b.name),
  );

  const createLabelMutation = useCreateLabel({
    mutation: {
      onSuccess: (newLabel) => {
        queryClient.invalidateQueries({
          queryKey: getGetLabelsByBoardQueryKey(boardId),
        });
        queryClient.invalidateQueries({
          queryKey: getGetBoardQueryKey(boardId),
        });
        // Add the new label to selection
        onChange([...selectedLabelIds, newLabel.data.id]);
        setIsCreating(false);
        setNewLabelName("");
        setNewLabelColor(LABEL_COLORS[0].name);
        setCreateLabelError(null);
      },
    },
  });

  const deleteLabelMutation = useDeleteLabel({
    mutation: {
      onSuccess: (_, variables) => {
        queryClient.invalidateQueries({
          queryKey: getGetLabelsByBoardQueryKey(boardId),
        });
        queryClient.invalidateQueries({
          queryKey: getGetBoardQueryKey(boardId),
        });
        // Remove deleted label from selection
        onChange(selectedLabelIds.filter((id) => id !== variables.labelId));
      },
    },
  });

  const handleDeleteLabel = (e: React.MouseEvent, labelId: string) => {
    e.stopPropagation();
    deleteLabelMutation.mutate({ labelId });
  };

  const toggleLabel = (labelId: string) => {
    if (selectedLabelIds.includes(labelId)) {
      onChange(selectedLabelIds.filter((id) => id !== labelId));
    } else {
      onChange([...selectedLabelIds, labelId]);
    }
  };

  const handleCreateLabel = () => {
    const payload = {
      boardId,
      name: newLabelName.trim(),
      color: newLabelColor,
    };

    const result = createLabelBody.safeParse(payload);
    if (!result.success) {
      setCreateLabelError(result.error.issues[0]?.message ?? "Invalid label");
      return;
    }

    setCreateLabelError(null);
    createLabelMutation.mutate({
      data: payload,
    });
  };

  const selectedLabels = labels.filter((label) =>
    selectedLabelIds.includes(label.id),
  );

  const isOpen = openProp ?? internalOpen;

  const handleOpenChange = (nextOpen: boolean) => {
    if (openProp === undefined) {
      setInternalOpen(nextOpen);
    }
    onOpenChange?.(nextOpen);
    onPopoverOpenChange?.(nextOpen);
  };

  return (
    <PopoverPrimitive.Root open={isOpen} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={isOpen}
          className="h-auto min-h-[44px] w-full justify-start px-3 py-3 font-normal"
        >
          {selectedLabels.length > 0 ? (
            <div className="flex flex-wrap items-center gap-1.5">
              {selectedLabels.map((label) => (
                <LabelBadge
                  key={label.id}
                  label={label}
                  size={selectedBadgeSize}
                />
              ))}
            </div>
          ) : (
            <span className="text-muted-foreground">Click to add labels</span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverPrimitive.Content
        className="bg-popover text-popover-foreground ring-foreground/10 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95 z-50 w-64 rounded-lg p-2 text-sm shadow-md ring-1 outline-hidden"
        align="start"
        sideOffset={4}
      >
        {isCreating ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-medium">Create Label</span>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() => setIsCreating(false)}
              >
                <IconX className="h-4 w-4" />
              </Button>
            </div>
            <Input
              placeholder="Label name"
              value={newLabelName}
              onChange={(e) => {
                setNewLabelName(e.target.value);
                if (createLabelError) {
                  setCreateLabelError(null);
                }
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleCreateLabel();
                }
              }}
              maxLength={createLabelBodyNameMax}
              aria-invalid={Boolean(createLabelError)}
            />
            <div className="flex items-center justify-between gap-2">
              <p className="text-destructive">{createLabelError ?? "\u00A0"}</p>
              <span className="text-muted-foreground">
                {newLabelName.trim().length}/{createLabelBodyNameMax}
              </span>
            </div>
            <div className="flex flex-wrap gap-1">
              {LABEL_COLORS.map((color) => {
                const classes = getLabelColorClasses(color.name);
                return (
                  <button
                    key={color.name}
                    type="button"
                    className={cn(
                      "h-6 w-6 rounded-md border-2",
                      classes.bg,
                      newLabelColor === color.name
                        ? "ring-primary ring-2 ring-offset-1"
                        : classes.border,
                    )}
                    onClick={() => setNewLabelColor(color.name)}
                    title={color.name}
                  />
                );
              })}
            </div>
            <Button
              size="sm"
              className="w-full"
              onClick={handleCreateLabel}
              disabled={!newLabelName.trim() || createLabelMutation.isPending}
            >
              {createLabelMutation.isPending ? "Creating..." : "Create"}
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            {labels.length > 0 ? (
              <div className="max-h-48 space-y-1 overflow-y-auto">
                {labels.map((label) => {
                  const isSelected = selectedLabelIds.includes(label.id);
                  return (
                    <div
                      key={label.id}
                      className={cn(
                        "flex items-center gap-1 rounded-md",
                        "hover:bg-accent transition-colors",
                        isSelected && "bg-accent/50",
                      )}
                    >
                      <div
                        role="button"
                        tabIndex={0}
                        className="focus-visible:ring-ring flex flex-1 cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 outline-none focus-visible:ring-2"
                        onClick={() => toggleLabel(label.id)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault();
                            toggleLabel(label.id);
                          }
                        }}
                      >
                        <Checkbox
                          checked={isSelected}
                          disabled
                          className="pointer-events-none disabled:opacity-100"
                        />
                        <LabelBadge label={label} size="sm" />
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-muted-foreground hover:text-destructive size-7"
                        onClick={(e) => handleDeleteLabel(e, label.id)}
                        title="Delete label"
                      >
                        <IconTrash className="size-3.5" />
                      </Button>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-muted-foreground py-2 text-center">
                No labels yet
              </p>
            )}
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={() => setIsCreating(true)}
            >
              <IconPlus className="mr-1 h-4 w-4" />
              Create label
            </Button>
          </div>
        )}
      </PopoverPrimitive.Content>
    </PopoverPrimitive.Root>
  );
}
