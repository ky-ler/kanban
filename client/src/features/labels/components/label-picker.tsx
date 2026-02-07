import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Plus, Trash2, X } from "lucide-react";
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
    if (!newLabelName.trim()) return;
    createLabelMutation.mutate({
      data: {
        boardId,
        name: newLabelName.trim(),
        color: newLabelColor,
      },
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
    <Popover open={isOpen} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          role="combobox"
          aria-expanded={isOpen}
          className="bg-muted/30 hover:bg-muted/50 hover:border-border aria-expanded:bg-muted/50 aria-expanded:border-border h-auto min-h-[44px] w-full justify-start rounded-lg border border-transparent px-3 py-3 font-normal shadow-none transition-colors"
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
      <PopoverContent className="w-64 p-2" align="start">
        {isCreating ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Create Label</span>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() => setIsCreating(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <Input
              placeholder="Label name"
              value={newLabelName}
              onChange={(e) => setNewLabelName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleCreateLabel();
                }
              }}
            />
            <div className="flex flex-wrap gap-1">
              {LABEL_COLORS.map((color) => {
                const classes = getLabelColorClasses(color.name);
                return (
                  <button
                    key={color.name}
                    type="button"
                    className={cn(
                      "h-6 w-6 rounded border-2",
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
                        "flex items-center gap-1 rounded",
                        "hover:bg-accent transition-colors",
                        isSelected && "bg-accent/50",
                      )}
                    >
                      <div
                        role="button"
                        tabIndex={0}
                        className="focus-visible:ring-ring flex flex-1 cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm outline-none focus-visible:ring-2"
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
                      <button
                        type="button"
                        className="hover:bg-destructive/10 text-muted-foreground hover:text-destructive rounded p-1.5 transition-colors"
                        onClick={(e) => handleDeleteLabel(e, label.id)}
                        title="Delete label"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-muted-foreground py-2 text-center text-sm">
                No labels yet
              </p>
            )}
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={() => setIsCreating(true)}
            >
              <Plus className="mr-1 h-4 w-4" />
              Create label
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
