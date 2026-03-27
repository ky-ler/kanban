import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import type { TaskFilters } from "../utils/filter-tasks";
import { hasActiveFilters } from "../utils/filter-tasks";
import type { CollaboratorDto } from "@/api/gen/model";
import { useGetLabelsByBoard } from "@/api/gen/endpoints/label-controller/label-controller";
import { LabelBadge } from "@/features/labels/components/label-badge";
import { PRIORITY_OPTIONS } from "@/features/tasks/constants/priorities";
import {
  IconSearch,
  IconFilter,
  IconUser,
  IconAlertCircle,
  IconTag,
  IconCalendar,
  IconX,
} from "@tabler/icons-react";

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
      <InputGroup className="w-36 sm:w-48">
        <InputGroupAddon>
          <IconSearch className="size-4" />
        </InputGroupAddon>
        <InputGroupInput
          type="search"
          placeholder="Search tasks..."
          value={searchValue}
          onChange={(e) => onSearchChange(e.target.value)}
          className="text-xs"
        />
      </InputGroup>

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
            <IconFilter className="h-3.5 w-3.5" />
            Filters
            {activeFilterCount > 0 && (
              <Badge variant="secondary" className="ml-1 h-4 px-1 leading-none">
                {activeFilterCount}
              </Badge>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-56 p-0" align="start">
          <div className="max-h-80 overflow-y-auto p-2">
            {/* Assignee Section */}
            <div className="mb-1">
              <div className="text-muted-foreground flex items-center gap-1.5 px-2 py-1.5 font-semibold tracking-wide uppercase">
                <IconUser className="h-3.5 w-3.5" />
                Assignee
              </div>
              <div className="space-y-0.5">
                <button
                  type="button"
                  className={cn(
                    "hover:bg-accent flex w-full items-center gap-2 rounded-sm px-2 py-1.5",
                    !filters.assignee && "bg-accent",
                  )}
                  onClick={() => updateFilter("assignee", undefined)}
                >
                  <Checkbox
                    checked={!filters.assignee}
                    className="pointer-events-none"
                    tabIndex={-1}
                  />
                  All
                </button>
                <button
                  type="button"
                  className={cn(
                    "hover:bg-accent flex w-full items-center gap-2 rounded-sm px-2 py-1.5",
                    filters.assignee === "unassigned" && "bg-accent",
                  )}
                  onClick={() => updateFilter("assignee", "unassigned")}
                >
                  <Checkbox
                    checked={filters.assignee === "unassigned"}
                    className="pointer-events-none"
                    tabIndex={-1}
                  />
                  Unassigned
                </button>
                {collaborators.map((collab) => (
                  <button
                    key={collab.user?.id}
                    type="button"
                    className={cn(
                      "hover:bg-accent flex w-full items-center gap-2 rounded-sm px-2 py-1.5",
                      filters.assignee === collab.user?.id && "bg-accent",
                    )}
                    onClick={() => updateFilter("assignee", collab.user?.id)}
                  >
                    <Checkbox
                      checked={filters.assignee === collab.user?.id}
                      className="pointer-events-none"
                      tabIndex={-1}
                    />
                    <span className="truncate">{collab.user?.username}</span>
                  </button>
                ))}
              </div>
            </div>

            <Separator className="my-1" />

            {/* Priority Section */}
            <div className="mb-1">
              <div className="text-muted-foreground flex items-center gap-1.5 px-2 py-1.5 font-semibold tracking-wide uppercase">
                <IconAlertCircle className="h-3.5 w-3.5" />
                Priority
              </div>
              <div className="space-y-0.5">
                {PRIORITY_OPTIONS.map((priority) => {
                  const isSelected = filters.priorities?.includes(
                    priority.value,
                  );
                  return (
                    <button
                      key={priority.value}
                      type="button"
                      className={cn(
                        "hover:bg-accent flex w-full items-center gap-2 rounded-sm px-2 py-1.5",
                        isSelected && "bg-accent/50",
                      )}
                      onClick={() =>
                        toggleArrayFilter("priorities", priority.value)
                      }
                    >
                      <Checkbox
                        checked={isSelected}
                        className="pointer-events-none"
                        tabIndex={-1}
                      />
                      {priority.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Labels Section */}
            {labels.length > 0 && (
              <>
                <Separator className="my-1" />
                <div className="mb-1">
                  <div className="text-muted-foreground flex items-center gap-1.5 px-2 py-1.5 font-semibold tracking-wide uppercase">
                    <IconTag className="h-3.5 w-3.5" />
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
                            "hover:bg-accent flex w-full items-center gap-2 rounded-sm px-2 py-1.5",
                            isSelected && "bg-accent/50",
                          )}
                          onClick={() =>
                            toggleArrayFilter("labelIds", label.id)
                          }
                        >
                          <Checkbox
                            checked={isSelected}
                            className="pointer-events-none"
                            tabIndex={-1}
                          />
                          <LabelBadge label={label} size="sm" />
                        </button>
                      );
                    })}
                  </div>
                </div>
              </>
            )}

            <Separator className="my-1" />

            {/* Due Date Section */}
            <div className="mb-1">
              <div className="text-muted-foreground flex items-center gap-1.5 px-2 py-1.5 font-semibold tracking-wide uppercase">
                <IconCalendar className="h-3.5 w-3.5" />
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
                        "hover:bg-accent flex w-full items-center gap-2 rounded-sm px-2 py-1.5",
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
              <Separator />
              <div className="p-2">
                <button
                  type="button"
                  className="text-muted-foreground hover:text-foreground hover:bg-accent flex w-full items-center justify-center gap-1.5 rounded-sm px-2 py-1.5"
                  onClick={clearAllFilters}
                >
                  <IconX className="h-3.5 w-3.5" />
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
