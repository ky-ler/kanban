import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Check, Plus, Tag, Trash2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { LABEL_COLORS, getLabelColorClasses } from "../constants";
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
}

export function LabelPicker({
  boardId,
  selectedLabelIds,
  onChange,
}: LabelPickerProps) {
  const [open, setOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [newLabelName, setNewLabelName] = useState("");
  const [newLabelColor, setNewLabelColor] = useState(LABEL_COLORS[0].name);

  const queryClient = useQueryClient();
  const { data: labelsResponse } = useGetLabelsByBoard(boardId);
  const labels = labelsResponse?.data ?? [];

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

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-start h-auto min-h-9"
        >
          <Tag className="mr-2 h-4 w-4 shrink-0 opacity-50" />
          {selectedLabels.length > 0 ? (
            <div className="flex flex-wrap gap-1">
              {selectedLabels.map((label) => (
                <LabelBadge key={label.id} label={label} size="sm" />
              ))}
            </div>
          ) : (
            <span className="text-muted-foreground">Select labels...</span>
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
                      "w-6 h-6 rounded border-2",
                      classes.bg,
                      newLabelColor === color.name
                        ? "ring-2 ring-offset-1 ring-primary"
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
              disabled={
                !newLabelName.trim() || createLabelMutation.isPending
              }
            >
              {createLabelMutation.isPending ? "Creating..." : "Create"}
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            {labels.length > 0 ? (
              <div className="max-h-48 overflow-y-auto space-y-1">
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
                      <button
                        type="button"
                        className="flex-1 flex items-center gap-2 px-2 py-1.5 text-sm"
                        onClick={() => toggleLabel(label.id)}
                      >
                        <div
                          className={cn(
                            "w-4 h-4 rounded border flex items-center justify-center",
                            isSelected
                              ? "bg-primary border-primary"
                              : "border-input",
                          )}
                        >
                          {isSelected && (
                            <Check className="h-3 w-3 text-primary-foreground" />
                          )}
                        </div>
                        <LabelBadge label={label} size="sm" />
                      </button>
                      <button
                        type="button"
                        className="p-1.5 hover:bg-destructive/10 rounded text-muted-foreground hover:text-destructive transition-colors"
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
              <p className="text-sm text-muted-foreground text-center py-2">
                No labels yet
              </p>
            )}
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={() => setIsCreating(true)}
            >
              <Plus className="h-4 w-4 mr-1" />
              Create label
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
