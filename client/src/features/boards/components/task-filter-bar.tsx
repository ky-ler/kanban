import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { Filter, X, Check, User, Calendar, Tag, AlertCircle, Search } from "lucide-react";
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
  const labels = labelsResponse?.data ?? [];

  const activeFilterCount = [
    filters.assignee,
    filters.priorities?.length,
    filters.labelIds?.length,
    filters.due,
  ].filter(Boolean).length;

  const updateFilter = <K extends keyof TaskFilters>(
    key: K,
    value: TaskFilters[K]
  ) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  const toggleArrayFilter = (
    key: "priorities" | "labelIds",
    value: string
  ) => {
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
    <div className="flex items-center gap-2 flex-wrap">
      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          type="search"
          placeholder="Search tasks..."
          value={searchValue}
          onChange={(e) => onSearchChange(e.target.value)}
          className="h-8 w-48 pl-8"
        />
      </div>

      <div className="flex items-center gap-1 text-muted-foreground">
        <Filter className="h-4 w-4" />
        <span className="text-sm font-medium">Filters</span>
        {activeFilterCount > 0 && (
          <Badge variant="secondary" className="h-5 px-1.5 text-xs">
            {activeFilterCount}
          </Badge>
        )}
      </div>

      {/* Assignee Filter */}
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className={cn(
              "h-8",
              filters.assignee && "border-primary bg-primary/5"
            )}
          >
            <User className="h-3.5 w-3.5 mr-1.5" />
            Assignee
            {filters.assignee && (
              <Badge variant="secondary" className="ml-1.5 h-4 px-1 text-[10px]">
                1
              </Badge>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-48 p-2" align="start">
          <div className="space-y-1">
            <button
              type="button"
              className={cn(
                "w-full flex items-center gap-2 px-2 py-1.5 rounded text-sm hover:bg-accent",
                !filters.assignee && "bg-accent"
              )}
              onClick={() => updateFilter("assignee", undefined)}
            >
              <div
                className={cn(
                  "w-4 h-4 rounded border flex items-center justify-center",
                  !filters.assignee ? "bg-primary border-primary" : "border-input"
                )}
              >
                {!filters.assignee && (
                  <Check className="h-3 w-3 text-primary-foreground" />
                )}
              </div>
              All
            </button>
            <button
              type="button"
              className={cn(
                "w-full flex items-center gap-2 px-2 py-1.5 rounded text-sm hover:bg-accent",
                filters.assignee === "unassigned" && "bg-accent"
              )}
              onClick={() => updateFilter("assignee", "unassigned")}
            >
              <div
                className={cn(
                  "w-4 h-4 rounded border flex items-center justify-center",
                  filters.assignee === "unassigned"
                    ? "bg-primary border-primary"
                    : "border-input"
                )}
              >
                {filters.assignee === "unassigned" && (
                  <Check className="h-3 w-3 text-primary-foreground" />
                )}
              </div>
              Unassigned
            </button>
            {collaborators.map((collab) => (
              <button
                key={collab.user?.id}
                type="button"
                className={cn(
                  "w-full flex items-center gap-2 px-2 py-1.5 rounded text-sm hover:bg-accent",
                  filters.assignee === collab.user?.id && "bg-accent"
                )}
                onClick={() => updateFilter("assignee", collab.user?.id)}
              >
                <div
                  className={cn(
                    "w-4 h-4 rounded border flex items-center justify-center",
                    filters.assignee === collab.user?.id
                      ? "bg-primary border-primary"
                      : "border-input"
                  )}
                >
                  {filters.assignee === collab.user?.id && (
                    <Check className="h-3 w-3 text-primary-foreground" />
                  )}
                </div>
                <span className="truncate">{collab.user?.username}</span>
              </button>
            ))}
          </div>
        </PopoverContent>
      </Popover>

      {/* Priority Filter */}
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className={cn(
              "h-8",
              filters.priorities?.length && "border-primary bg-primary/5"
            )}
          >
            <AlertCircle className="h-3.5 w-3.5 mr-1.5" />
            Priority
            {filters.priorities && filters.priorities.length > 0 && (
              <Badge variant="secondary" className="ml-1.5 h-4 px-1 text-[10px]">
                {filters.priorities.length}
              </Badge>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-40 p-2" align="start">
          <div className="space-y-1">
            {PRIORITIES.map((priority) => {
              const isSelected = filters.priorities?.includes(priority.value);
              return (
                <button
                  key={priority.value}
                  type="button"
                  className={cn(
                    "w-full flex items-center gap-2 px-2 py-1.5 rounded text-sm hover:bg-accent",
                    isSelected && "bg-accent/50"
                  )}
                  onClick={() => toggleArrayFilter("priorities", priority.value)}
                >
                  <div
                    className={cn(
                      "w-4 h-4 rounded border flex items-center justify-center",
                      isSelected ? "bg-primary border-primary" : "border-input"
                    )}
                  >
                    {isSelected && (
                      <Check className="h-3 w-3 text-primary-foreground" />
                    )}
                  </div>
                  {priority.label}
                </button>
              );
            })}
          </div>
        </PopoverContent>
      </Popover>

      {/* Labels Filter */}
      {labels.length > 0 && (
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className={cn(
                "h-8",
                filters.labelIds?.length && "border-primary bg-primary/5"
              )}
            >
              <Tag className="h-3.5 w-3.5 mr-1.5" />
              Labels
              {filters.labelIds && filters.labelIds.length > 0 && (
                <Badge variant="secondary" className="ml-1.5 h-4 px-1 text-[10px]">
                  {filters.labelIds.length}
                </Badge>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-48 p-2" align="start">
            <div className="space-y-1 max-h-48 overflow-y-auto">
              {labels.map((label) => {
                const isSelected = filters.labelIds?.includes(label.id);
                return (
                  <button
                    key={label.id}
                    type="button"
                    className={cn(
                      "w-full flex items-center gap-2 px-2 py-1.5 rounded text-sm hover:bg-accent",
                      isSelected && "bg-accent/50"
                    )}
                    onClick={() => toggleArrayFilter("labelIds", label.id)}
                  >
                    <div
                      className={cn(
                        "w-4 h-4 rounded border flex items-center justify-center",
                        isSelected ? "bg-primary border-primary" : "border-input"
                      )}
                    >
                      {isSelected && (
                        <Check className="h-3 w-3 text-primary-foreground" />
                      )}
                    </div>
                    <LabelBadge label={label} size="sm" />
                  </button>
                );
              })}
            </div>
          </PopoverContent>
        </Popover>
      )}

      {/* Due Date Filter */}
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className={cn(
              "h-8",
              filters.due && "border-primary bg-primary/5"
            )}
          >
            <Calendar className="h-3.5 w-3.5 mr-1.5" />
            Due Date
            {filters.due && (
              <Badge variant="secondary" className="ml-1.5 h-4 px-1 text-[10px]">
                1
              </Badge>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-44 p-2" align="start">
          <div className="space-y-1">
            {DUE_DATE_OPTIONS.map((option) => {
              const isSelected = filters.due === option.value;
              return (
                <button
                  key={option.label}
                  type="button"
                  className={cn(
                    "w-full flex items-center gap-2 px-2 py-1.5 rounded text-sm hover:bg-accent",
                    isSelected && "bg-accent"
                  )}
                  onClick={() => updateFilter("due", option.value)}
                >
                  <div
                    className={cn(
                      "w-4 h-4 rounded-full border flex items-center justify-center",
                      isSelected ? "bg-primary border-primary" : "border-input"
                    )}
                  >
                    {isSelected && (
                      <div className="w-2 h-2 rounded-full bg-primary-foreground" />
                    )}
                  </div>
                  {option.label}
                </button>
              );
            })}
          </div>
        </PopoverContent>
      </Popover>

      {/* Clear All */}
      <Button
        variant="ghost"
        size="sm"
        className="h-8 text-muted-foreground hover:text-foreground"
        onClick={clearAllFilters}
        disabled={!hasActiveFilters(filters) && !searchValue}
      >
        <X className="h-3.5 w-3.5 mr-1" />
        Clear
      </Button>
    </div>
  );
}
