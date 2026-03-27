export const PRIORITY_OPTIONS = [
  { value: "LOW", label: "Low" },
  { value: "MEDIUM", label: "Medium" },
  { value: "HIGH", label: "High" },
  { value: "URGENT", label: "Urgent" },
] as const;

export type TaskPriorityValue = (typeof PRIORITY_OPTIONS)[number]["value"];

type PriorityMeta = {
  label: string;
  level: 1 | 2 | 3 | 4;
};

export const PRIORITY_META: Record<TaskPriorityValue, PriorityMeta> = {
  LOW: {
    label: "Low",
    level: 1,
  },
  MEDIUM: {
    label: "Medium",
    level: 2,
  },
  HIGH: {
    label: "High",
    level: 3,
  },
  URGENT: {
    label: "Urgent",
    level: 4,
  },
};

export function isTaskPriorityValue(value: string): value is TaskPriorityValue {
  return value in PRIORITY_META;
}

export function getPriorityMeta(priority?: string | null): PriorityMeta | null {
  if (!priority || !isTaskPriorityValue(priority)) {
    return null;
  }

  return PRIORITY_META[priority];
}
