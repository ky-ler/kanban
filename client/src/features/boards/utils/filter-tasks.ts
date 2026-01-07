import type { TaskSummaryDto } from "@/api/gen/model";

export interface TaskFilters {
  query?: string; // search query for title/description
  assignee?: string; // user ID or "unassigned"
  priorities?: string[];
  labelIds?: string[];
  due?: "overdue" | "today" | "week" | "none";
}

export function hasActiveFilters(filters: TaskFilters): boolean {
  return !!(
    filters.query ||
    filters.assignee ||
    (filters.priorities && filters.priorities.length > 0) ||
    (filters.labelIds && filters.labelIds.length > 0) ||
    filters.due
  );
}

export function filterTasks(
  tasks: TaskSummaryDto[],
  filters: TaskFilters
): TaskSummaryDto[] {
  if (!hasActiveFilters(filters)) {
    return tasks;
  }

  return tasks.filter((task) => {
    // Search filter (title and description)
    if (filters.query) {
      const q = filters.query.toLowerCase();
      const titleMatch = task.title.toLowerCase().includes(q);
      const descMatch = task.description?.toLowerCase().includes(q) ?? false;
      if (!titleMatch && !descMatch) return false;
    }

    // Assignee filter
    if (filters.assignee) {
      if (filters.assignee === "unassigned") {
        if (task.assignedTo) return false;
      } else {
        if (task.assignedTo?.id !== filters.assignee) return false;
      }
    }

    // Priority filter (multi-select)
    if (filters.priorities && filters.priorities.length > 0) {
      if (!task.priority || !filters.priorities.includes(task.priority)) {
        return false;
      }
    }

    // Labels filter (multi-select - task must have at least one matching label)
    if (filters.labelIds && filters.labelIds.length > 0) {
      if (!task.labels || task.labels.length === 0) return false;
      const taskLabelIds = task.labels.map((l) => l.id);
      const hasMatchingLabel = filters.labelIds.some((id) =>
        taskLabelIds.includes(id)
      );
      if (!hasMatchingLabel) return false;
    }

    // Due date filter
    if (filters.due) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      if (filters.due === "none") {
        if (task.dueDate) return false;
      } else if (!task.dueDate) {
        return false;
      } else {
        const dueDate = new Date(task.dueDate);
        dueDate.setHours(0, 0, 0, 0);

        switch (filters.due) {
          case "overdue":
            if (dueDate >= today) return false;
            break;
          case "today":
            if (dueDate.getTime() !== today.getTime()) return false;
            break;
          case "week": {
            const weekFromNow = new Date(today);
            weekFromNow.setDate(weekFromNow.getDate() + 7);
            if (dueDate < today || dueDate > weekFromNow) return false;
            break;
          }
        }
      }
    }

    return true;
  });
}

// Parse URL search params into TaskFilters
export function parseFiltersFromSearch(search: {
  q?: string;
  assignee?: string;
  priority?: string;
  labels?: string;
  due?: string;
}): TaskFilters {
  return {
    query: search.q || undefined,
    assignee: search.assignee || undefined,
    priorities: search.priority ? search.priority.split(",") : undefined,
    labelIds: search.labels ? search.labels.split(",") : undefined,
    due: search.due as TaskFilters["due"],
  };
}

// Convert TaskFilters to URL search params
export function filtersToSearchParams(filters: TaskFilters): {
  q?: string;
  assignee?: string;
  priority?: string;
  labels?: string;
  due?: string;
} {
  return {
    q: filters.query || undefined,
    assignee: filters.assignee || undefined,
    priority:
      filters.priorities && filters.priorities.length > 0
        ? filters.priorities.join(",")
        : undefined,
    labels:
      filters.labelIds && filters.labelIds.length > 0
        ? filters.labelIds.join(",")
        : undefined,
    due: filters.due || undefined,
  };
}
