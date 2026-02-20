import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import {
  Filter,
  X,
  Check,
  User,
  Calendar,
  Tag,
  AlertCircle,
  Search,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { TaskFilters } from "../utils/filter-tasks";
import { hasActiveFilters } from "../utils/filter-tasks";
import type { CollaboratorDto } from "@/api/gen/model";
import { useGetLabelsByBoard } from "@/api/gen/endpoints/label-controller/label-controller";
import { LabelBadge } from "@/features/labels/components/label-badge";

const PRIORITIES = [
  { value: "LOW", label: "Low" },
  { value: "MEDIUM", label: "Medium" },
  { value: "HIGH", label: "High" },
  { value: "URGENT", label: "Urgent" },
];

const DUE_DATE_OPTIONS = [
  { value: undefined, label: "All" },
  { value: "overdue", label: "Overdue" },
  { value: "today", label: "Due Today" },
  { value: "week", label: "Due This Week" },
  { value: "none", label: "No Due Date" },
] as const;

interface TaskFilterBarProps {
  boardId: string;
  collaborators: CollaboratorDto[];
  filters: TaskFilters;
  onFiltersChange: (filters: TaskFilters) => void;
  searchValue: string;
  onSearchChange: (value: string) => void;
}

export function TaskFilterBar({
  boardId,
  collaborators,
  filters,
  onFiltersChange,
  searchValue,
  onSearchChange,
}: TaskFilterBarProps) {
  const { data: labelsResponse } = useGetLabelsByBoard(boardId);
  const labels = [...(labelsResponse?.data ?? [])].sort((a, b) =>
    a.name.localeCompare(b.name),
  );

  const activeFilterCount = [
    filters.assignee,
    filters.priorities?.length,
    filters.labelIds?.length,
    filters.due,
  ].filter(Boolean).length;

  const updateFilter = <K extends keyof TaskFilters>(
    key: K,
    value: TaskFilters[K],
  ) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  const toggleArrayFilter = (key: "priorities" | "labelIds", value: string) => {
    const current = filters[key] ?? [];
    const updated = current.includes(value)
      ? current.filter((v) => v !== value)
      : [...current, value];
    updateFilter(key, updated.length > 0 ? updated : undefined);
  };

  const clearAllFilters = () => {
    onFiltersChange({});
    onSearchChange("");
  };

  return (
    <div className="flex items-center gap-2">
      {/* Search Input */}
      <div className="relative">
        <Search className="text-muted-foreground absolute top-1/2 left-2.5 h-4 w-4 -translate-y-1/2" />
        <Input
          type="search"
          placeholder="Search tasks..."
          value={searchValue}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-36 pl-8 sm:w-48"
        />
      </div>

      {/* Filters Dropdown */}
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className={cn(
              "h-8",
              activeFilterCount > 0 && "border-primary bg-primary/5",
            )}
          >
            <Filter className="h-3.5 w-3.5" />
            Filters
            {activeFilterCount > 0 && (
              <Badge
                variant="secondary"
                className="ml-1 h-4 px-1 text-xs leading-none"
              >
                {activeFilterCount}
              </Badge>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-56 p-0" align="start">
          <div className="max-h-80 overflow-y-auto p-2">
            {/* Assignee Section */}
            <div className="mb-1">
              <div className="text-muted-foreground flex items-center gap-1.5 px-2 py-1.5 text-xs font-semibold tracking-wide uppercase">
                <User className="h-3.5 w-3.5" />
                Assignee
              </div>
              <div className="space-y-0.5">
                <button
                  type="button"
                  className={cn(
                    "hover:bg-accent flex w-full items-center gap-2 rounded px-2 py-1.5 text-sm",
                    !filters.assignee && "bg-accent",
                  )}
                  onClick={() => updateFilter("assignee", undefined)}
                >
                  <div
                    className={cn(
                      "flex h-4 w-4 items-center justify-center rounded border",
                      !filters.assignee
                        ? "bg-primary border-primary"
                        : "border-input",
                    )}
                  >
                    {!filters.assignee && (
                      <Check className="text-primary-foreground h-3 w-3" />
                    )}
                  </div>
                  All
                </button>
                <button
                  type="button"
                  className={cn(
                    "hover:bg-accent flex w-full items-center gap-2 rounded px-2 py-1.5 text-sm",
                    filters.assignee === "unassigned" && "bg-accent",
                  )}
                  onClick={() => updateFilter("assignee", "unassigned")}
                >
                  <div
                    className={cn(
                      "flex h-4 w-4 items-center justify-center rounded border",
                      filters.assignee === "unassigned"
                        ? "bg-primary border-primary"
                        : "border-input",
                    )}
                  >
                    {filters.assignee === "unassigned" && (
                      <Check className="text-primary-foreground h-3 w-3" />
                    )}
                  </div>
                  Unassigned
                </button>
                {collaborators.map((collab) => (
                  <button
                    key={collab.user?.id}
                    type="button"
                    className={cn(
                      "hover:bg-accent flex w-full items-center gap-2 rounded px-2 py-1.5 text-sm",
                      filters.assignee === collab.user?.id && "bg-accent",
                    )}
                    onClick={() => updateFilter("assignee", collab.user?.id)}
                  >
                    <div
                      className={cn(
                        "flex h-4 w-4 items-center justify-center rounded border",
                        filters.assignee === collab.user?.id
                          ? "bg-primary border-primary"
                          : "border-input",
                      )}
                    >
                      {filters.assignee === collab.user?.id && (
                        <Check className="text-primary-foreground h-3 w-3" />
                      )}
                    </div>
                    <span className="truncate">{collab.user?.username}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-border my-1 h-px" />

            {/* Priority Section */}
            <div className="mb-1">
              <div className="text-muted-foreground flex items-center gap-1.5 px-2 py-1.5 text-xs font-semibold tracking-wide uppercase">
                <AlertCircle className="h-3.5 w-3.5" />
                Priority
              </div>
              <div className="space-y-0.5">
                {PRIORITIES.map((priority) => {
                  const isSelected = filters.priorities?.includes(
                    priority.value,
                  );
                  return (
                    <button
                      key={priority.value}
                      type="button"
                      className={cn(
                        "hover:bg-accent flex w-full items-center gap-2 rounded px-2 py-1.5 text-sm",
                        isSelected && "bg-accent/50",
                      )}
                      onClick={() =>
                        toggleArrayFilter("priorities", priority.value)
                      }
                    >
                      <div
                        className={cn(
                          "flex h-4 w-4 items-center justify-center rounded border",
                          isSelected
                            ? "bg-primary border-primary"
                            : "border-input",
                        )}
                      >
                        {isSelected && (
                          <Check className="text-primary-foreground h-3 w-3" />
                        )}
                      </div>
                      {priority.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Labels Section */}
            {labels.length > 0 && (
              <>
                <div className="bg-border my-1 h-px" />
                <div className="mb-1">
                  <div className="text-muted-foreground flex items-center gap-1.5 px-2 py-1.5 text-xs font-semibold tracking-wide uppercase">
                    <Tag className="h-3.5 w-3.5" />
                    Labels
                  </div>
                  <div className="space-y-0.5">
                    {labels.map((label) => {
                      const isSelected = filters.labelIds?.includes(label.id);
                      return (
                        <button
                          key={label.id}
                          type="button"
                          className={cn(
                            "hover:bg-accent flex w-full items-center gap-2 rounded px-2 py-1.5 text-sm",
                            isSelected && "bg-accent/50",
                          )}
                          onClick={() =>
                            toggleArrayFilter("labelIds", label.id)
                          }
                        >
                          <div
                            className={cn(
                              "flex h-4 w-4 items-center justify-center rounded border",
                              isSelected
                                ? "bg-primary border-primary"
                                : "border-input",
                            )}
                          >
                            {isSelected && (
                              <Check className="text-primary-foreground h-3 w-3" />
                            )}
                          </div>
                          <LabelBadge label={label} size="sm" />
                        </button>
                      );
                    })}
                  </div>
                </div>
              </>
            )}

            <div className="bg-border my-1 h-px" />

            {/* Due Date Section */}
            <div className="mb-1">
              <div className="text-muted-foreground flex items-center gap-1.5 px-2 py-1.5 text-xs font-semibold tracking-wide uppercase">
                <Calendar className="h-3.5 w-3.5" />
                Due Date
              </div>
              <div className="space-y-0.5">
                {DUE_DATE_OPTIONS.map((option) => {
                  const isSelected = filters.due === option.value;
                  return (
                    <button
                      key={option.label}
                      type="button"
                      className={cn(
                        "hover:bg-accent flex w-full items-center gap-2 rounded px-2 py-1.5 text-sm",
                        isSelected && "bg-accent",
                      )}
                      onClick={() => updateFilter("due", option.value)}
                    >
                      <div
                        className={cn(
                          "flex h-4 w-4 items-center justify-center rounded-full border",
                          isSelected
                            ? "bg-primary border-primary"
                            : "border-input",
                        )}
                      >
                        {isSelected && (
                          <div className="bg-primary-foreground h-2 w-2 rounded-full" />
                        )}
                      </div>
                      {option.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Clear All - pinned to bottom */}
          {(hasActiveFilters(filters) || searchValue) && (
            <>
              <div className="bg-border h-px" />
              <div className="p-2">
                <button
                  type="button"
                  className="text-muted-foreground hover:text-foreground hover:bg-accent flex w-full items-center justify-center gap-1.5 rounded px-2 py-1.5 text-sm"
                  onClick={clearAllFilters}
                >
                  <X className="h-3.5 w-3.5" />
                  Clear all filters
                </button>
              </div>
            </>
          )}
        </PopoverContent>
      </Popover>
    </div>
  );
}
