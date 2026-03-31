import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  getGetMyTasksQueryOptions,
  useGetMyTasksSuspense,
} from "@/api/gen/endpoints/task-controller/task-controller";
import type { MyTaskDto } from "@/api/gen/model";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Item, ItemContent, ItemTitle, ItemGroup } from "@/components/ui/item";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { LoadingSpinner } from "@/components/loading-spinner";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import {
  IconCalendar,
  IconCheck,
  IconChecklist,
  IconFilter,
  IconLayoutKanban,
  IconList,
  IconLayoutGrid,
} from "@tabler/icons-react";
import { cn } from "@/lib/utils";
import { PrioritySignal } from "@/features/tasks/components/priority-signal";
import { LabelBadge } from "@/features/labels/components/label-badge";
import { PRIORITY_OPTIONS } from "@/features/tasks/constants/priorities";
import {
  addDays,
  endOfWeek,
  endOfMonth,
  format,
  isAfter,
  isBefore,
  isSameDay,
  isValid,
  parseISO,
  startOfDay,
  startOfToday,
} from "date-fns";

type DueFilter = "overdue" | "today" | "week" | "month" | "none" | undefined;

const DUE_DATE_OPTIONS: { value: DueFilter; label: string }[] = [
  { value: undefined, label: "All" },
  { value: "overdue", label: "Overdue" },
  { value: "today", label: "Due Today" },
  { value: "week", label: "This Week" },
  { value: "month", label: "This Month" },
  { value: "none", label: "No Due Date" },
];

type ViewMode = "grouped" | "flat";

export const Route = createFileRoute("/_protected/tasks/")({
  validateSearch: (search: Record<string, unknown>) => ({
    priority: typeof search.priority === "string" ? search.priority : undefined,
    dueBefore:
      typeof search.dueBefore === "string" ? search.dueBefore : undefined,
    view: search.view === "flat" ? ("flat" as const) : ("grouped" as const),
  }),
  loader: ({ context: { queryClient } }) =>
    queryClient.ensureQueryData(getGetMyTasksQueryOptions()),
  component: MyTasksComponent,
  head: () => ({
    meta: [
      {
        name: "description",
        content: "View all tasks assigned to you across all boards.",
      },
      {
        title: "Tasks - Kanban",
      },
    ],
  }),
});

// ——— Helpers ———

function isOverdue(dueDate: string): boolean {
  const parsed = parseISO(dueDate);
  if (!isValid(parsed)) return false;
  return isBefore(startOfDay(parsed), startOfToday());
}

function formatDueDate(dueDate: string): string {
  const date = parseISO(dueDate);
  if (!isValid(date)) return "Not set";

  const today = startOfToday();
  const tomorrow = addDays(today, 1);

  if (isSameDay(date, today)) return "Today";
  if (isSameDay(date, tomorrow)) return "Tomorrow";

  return format(date, "MMM d");
}

// ——— Filter UI ———

function FilterCheckbox({ checked }: { checked: boolean | undefined }) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        "border-input flex size-4 shrink-0 items-center justify-center rounded-[4px] border",
        checked && "border-primary bg-primary text-primary-foreground",
      )}
    >
      {checked && <IconCheck className="size-3" />}
    </div>
  );
}

function MyTasksFilterBar({
  selectedPriorities,
  onPrioritiesChange,
  dueFilter,
  onDueFilterChange,
}: {
  selectedPriorities: string[];
  onPrioritiesChange: (priorities: string[]) => void;
  dueFilter: DueFilter;
  onDueFilterChange: (due: DueFilter) => void;
}) {
  const activeFilterCount =
    (selectedPriorities.length > 0 ? 1 : 0) + (dueFilter ? 1 : 0);

  const hasAnyFilter = activeFilterCount > 0;

  const togglePriority = (value: string) => {
    const updated = selectedPriorities.includes(value)
      ? selectedPriorities.filter((v) => v !== value)
      : [...selectedPriorities, value];
    onPrioritiesChange(updated);
  };

  const clearAll = () => {
    onPrioritiesChange([]);
    onDueFilterChange(undefined);
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn("h-8", hasAnyFilter && "border-primary bg-primary/5")}
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
          {/* Priority Section */}
          <div className="mb-1">
            <div className="text-muted-foreground flex items-center gap-1.5 px-2 py-1.5 font-semibold tracking-wide uppercase">
              Priority
            </div>
            <div className="space-y-0.5">
              {PRIORITY_OPTIONS.map((priority) => {
                const isSelected = selectedPriorities.includes(priority.value);
                return (
                  <button
                    key={priority.value}
                    type="button"
                    className={cn(
                      "hover:bg-accent flex w-full items-center gap-2 rounded-sm px-2 py-1.5",
                      isSelected && "bg-accent/50",
                    )}
                    onClick={() => togglePriority(priority.value)}
                  >
                    <FilterCheckbox checked={isSelected} />
                    {priority.label}
                  </button>
                );
              })}
            </div>
          </div>

          <Separator className="my-1" />

          {/* Due Date Section */}
          <div className="mb-1">
            <div className="text-muted-foreground flex items-center gap-1.5 px-2 py-1.5 font-semibold tracking-wide uppercase">
              <IconCalendar className="h-3.5 w-3.5" />
              Due Date
            </div>
            <div className="space-y-0.5">
              {DUE_DATE_OPTIONS.map((option) => {
                const isSelected = dueFilter === option.value;
                return (
                  <button
                    key={option.label}
                    type="button"
                    className={cn(
                      "hover:bg-accent flex w-full items-center gap-2 rounded-sm px-2 py-1.5",
                      isSelected && "bg-accent",
                    )}
                    onClick={() => onDueFilterChange(option.value)}
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

          {/* Clear All */}
          {hasAnyFilter && (
            <>
              <Separator className="my-1" />
              <div className="p-2">
                <button
                  type="button"
                  className="text-muted-foreground hover:text-foreground hover:bg-accent flex w-full items-center justify-center gap-1.5 rounded-sm px-2 py-1.5"
                  onClick={clearAll}
                >
                  Clear all filters
                </button>
              </div>
            </>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

// ——— Task Card for My Tasks ———

function MyTaskItem({ task }: { task: MyTaskDto }) {
  const overdue = task.dueDate ? isOverdue(task.dueDate) : false;

  return (
    <Item size="sm" variant="outline" className="bg-card items-baseline gap-2">
      <Link
        to="/boards/$boardId/tasks/$taskId"
        params={{ boardId: task.boardId, taskId: task.id }}
        search={{
          q: undefined,
          assignee: undefined,
          priority: undefined,
          labels: undefined,
          due: undefined,
          archive: undefined,
        }}
        className="min-w-0 flex-1 rounded-sm"
        aria-label={`Open task ${task.title}`}
      >
        <ItemContent className={cn("gap-1.5", task.isArchived && "opacity-70")}>
          <ItemTitle
            title={task.title}
            className={cn(
              "w-full leading-snug wrap-anywhere whitespace-normal",
              task.isCompleted && "text-muted-foreground line-through",
            )}
          >
            {task.title}
          </ItemTitle>

          <div className="flex flex-wrap items-center gap-1.5">
            <PrioritySignal priority={task.priority} />
            {task.labels &&
              task.labels.length > 0 &&
              [...task.labels]
                .sort((a, b) => a.name.localeCompare(b.name))
                .slice(0, 3)
                .map((label) => (
                  <LabelBadge key={label.id} label={label} size="sm" />
                ))}
            {task.labels && task.labels.length > 3 && (
              <span className="text-muted-foreground leading-none">
                +{task.labels.length - 3}
              </span>
            )}
          </div>

          <div className="flex min-h-6 items-end gap-2">
            {/* Board & column context */}
            <span className="text-muted-foreground flex items-center gap-1">
              <IconLayoutKanban className="h-3 w-3" />
              <span className="max-w-28 truncate">{task.boardName}</span>
              <span className="text-muted-foreground/60">·</span>
              <span className="max-w-20 truncate">{task.columnName}</span>
            </span>

            {task.dueDate && (
              <span
                className={cn(
                  "flex items-center gap-1 leading-none",
                  overdue ? "text-destructive" : "text-muted-foreground",
                )}
              >
                <IconCalendar className="h-3.5 w-3.5" />
                {formatDueDate(task.dueDate)}
              </span>
            )}
          </div>
        </ItemContent>
      </Link>
    </Item>
  );
}

// ——— Main Component ———

function filterByDue(tasks: MyTaskDto[], due: DueFilter): MyTaskDto[] {
  if (!due) return tasks;

  const today = startOfToday();

  return tasks.filter((task) => {
    if (due === "none") return !task.dueDate;
    if (!task.dueDate) return false;

    const parsed = parseISO(task.dueDate);
    if (!isValid(parsed)) return false;
    const dueDay = startOfDay(parsed);

    switch (due) {
      case "overdue":
        return isBefore(dueDay, today);
      case "today":
        return isSameDay(dueDay, today);
      case "week":
        return (
          (isSameDay(dueDay, today) || isAfter(dueDay, today)) &&
          (isBefore(dueDay, endOfWeek(today, { weekStartsOn: 1 })) ||
            isSameDay(dueDay, endOfWeek(today, { weekStartsOn: 1 })))
        );
      case "month":
        return (
          (isSameDay(dueDay, today) || isAfter(dueDay, today)) &&
          (isBefore(dueDay, endOfMonth(today)) ||
            isSameDay(dueDay, endOfMonth(today)))
        );
      default:
        return true;
    }
  });
}

function MyTasksComponent() {
  const search = Route.useSearch();
  const navigate = Route.useNavigate();

  const viewMode: ViewMode = search.view ?? "grouped";

  const [selectedPriorities, setSelectedPriorities] = useState<string[]>(
    search.priority ? search.priority.split(",") : [],
  );
  const [dueFilter, setDueFilter] = useState<DueFilter>(
    (search.dueBefore as DueFilter) ?? undefined,
  );

  // Build query params — priority filter is server-side, due date is client-side
  const apiParams = {
    priority:
      selectedPriorities.length > 0 ? selectedPriorities.join(",") : undefined,
  };

  const { data: response, isLoading } = useGetMyTasksSuspense(apiParams);

  const handlePrioritiesChange = (priorities: string[]) => {
    setSelectedPriorities(priorities);
    navigate({
      search: (prev) => ({
        ...prev,
        priority: priorities.length > 0 ? priorities.join(",") : undefined,
      }),
      replace: true,
    });
  };

  const handleDueFilterChange = (due: DueFilter) => {
    setDueFilter(due);
    navigate({
      search: (prev) => ({
        ...prev,
        dueBefore: due ?? undefined,
      }),
      replace: true,
    });
  };

  const toggleViewMode = () => {
    const newMode = viewMode === "grouped" ? "flat" : "grouped";
    navigate({
      search: (prev) => ({
        ...prev,
        view: newMode,
      }),
      replace: true,
    });
  };

  if (isLoading || !response) {
    return <LoadingSpinner title="Loading your tasks..." />;
  }

  // Apply client-side due date filtering
  const tasks = filterByDue(response.data, dueFilter);
  const hasAnyFilter = selectedPriorities.length > 0 || !!dueFilter;

  // Group tasks by board
  const tasksByBoard = tasks.reduce<
    Record<string, { boardName: string; boardId: string; tasks: MyTaskDto[] }>
  >((acc, task) => {
    if (!acc[task.boardId]) {
      acc[task.boardId] = {
        boardName: task.boardName,
        boardId: task.boardId,
        tasks: [],
      };
    }
    acc[task.boardId].tasks.push(task);
    return acc;
  }, {});

  const boardGroups = Object.values(tasksByBoard);

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6 px-4 py-6 sm:px-6">
      {/* Page Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold tracking-tight">Tasks</h1>
          <p className="text-muted-foreground">
            {tasks.length} task{tasks.length !== 1 ? "s" : ""} assigned to you
          </p>
        </div>
        <div className="flex items-center gap-2">
          <MyTasksFilterBar
            selectedPriorities={selectedPriorities}
            onPrioritiesChange={handlePrioritiesChange}
            dueFilter={dueFilter}
            onDueFilterChange={handleDueFilterChange}
          />
          <Button
            variant="outline"
            size="sm"
            className="h-8"
            onClick={toggleViewMode}
            title={
              viewMode === "grouped"
                ? "Switch to flat list"
                : "Switch to grouped view"
            }
          >
            {viewMode === "grouped" ? (
              <IconList className="h-3.5 w-3.5" />
            ) : (
              <IconLayoutGrid className="h-3.5 w-3.5" />
            )}
            {viewMode === "grouped" ? "Flat" : "Grouped"}
          </Button>
        </div>
      </div>

      {/* Empty state */}
      {tasks.length === 0 && (
        <div className="flex flex-1 items-center justify-center py-16">
          <Empty>
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <IconChecklist />
              </EmptyMedia>
              <EmptyTitle>
                {hasAnyFilter ? "No matching tasks" : "No tasks assigned"}
              </EmptyTitle>
              <EmptyDescription>
                {hasAnyFilter
                  ? "Try adjusting your filters to see more tasks."
                  : "Tasks assigned to you across any board will appear here."}
              </EmptyDescription>
            </EmptyHeader>
            {hasAnyFilter && (
              <EmptyContent>
                <Button
                  variant="outline"
                  onClick={() => {
                    handlePrioritiesChange([]);
                    handleDueFilterChange(undefined);
                  }}
                >
                  Clear filters
                </Button>
              </EmptyContent>
            )}
          </Empty>
        </div>
      )}

      {/* Flat View */}
      {tasks.length > 0 && viewMode === "flat" && (
        <ItemGroup>
          {tasks.map((task) => (
            <MyTaskItem key={task.id} task={task} />
          ))}
        </ItemGroup>
      )}

      {/* Grouped View */}
      {tasks.length > 0 && viewMode === "grouped" && (
        <div className="space-y-8">
          {boardGroups.map((group) => (
            <section key={group.boardId} className="space-y-3">
              <div className="flex items-center gap-2">
                <Link
                  to="/boards/$boardId"
                  params={{ boardId: group.boardId }}
                  search={{
                    q: undefined,
                    assignee: undefined,
                    priority: undefined,
                    labels: undefined,
                    due: undefined,
                    archive: undefined,
                  }}
                  className="hover:text-primary text-muted-foreground font-medium tracking-wider uppercase transition-colors"
                >
                  {group.boardName}
                </Link>
                <Badge variant="secondary" className="h-5 px-1.5 leading-none">
                  {group.tasks.length}
                </Badge>
              </div>
              <ItemGroup>
                {group.tasks.map((task) => (
                  <MyTaskItem key={task.id} task={task} />
                ))}
              </ItemGroup>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
