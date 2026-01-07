import type { ActivityLogDto } from "@/api/gen/model";
import { formatDistanceToNow } from "date-fns";
import {
  Plus,
  Pencil,
  ArrowRight,
  Trash2,
  UserCircle,
  Tag,
  AlertCircle,
  Calendar,
} from "lucide-react";

const activityConfig: Record<
  string,
  { icon: React.ElementType; label: string; color: string }
> = {
  TASK_CREATED: {
    icon: Plus,
    label: "created this task",
    color: "text-green-600 dark:text-green-400",
  },
  TASK_UPDATED: {
    icon: Pencil,
    label: "updated the task",
    color: "text-blue-600 dark:text-blue-400",
  },
  TASK_MOVED: {
    icon: ArrowRight,
    label: "moved the task",
    color: "text-purple-600 dark:text-purple-400",
  },
  TASK_DELETED: {
    icon: Trash2,
    label: "deleted the task",
    color: "text-red-600 dark:text-red-400",
  },
  ASSIGNEE_CHANGED: {
    icon: UserCircle,
    label: "changed assignee",
    color: "text-orange-600 dark:text-orange-400",
  },
  LABELS_CHANGED: {
    icon: Tag,
    label: "changed labels",
    color: "text-pink-600 dark:text-pink-400",
  },
  PRIORITY_CHANGED: {
    icon: AlertCircle,
    label: "changed priority",
    color: "text-yellow-600 dark:text-yellow-400",
  },
  DUE_DATE_CHANGED: {
    icon: Calendar,
    label: "changed due date",
    color: "text-cyan-600 dark:text-cyan-400",
  },
};

function parseDetails(
  details: string | null | undefined,
): Record<string, unknown> | null {
  if (!details) return null;
  try {
    return JSON.parse(details);
  } catch {
    return null;
  }
}

function formatActivityDetails(
  type: string,
  details: Record<string, unknown> | null,
): string | null {
  if (!details) return null;

  switch (type) {
    case "TASK_UPDATED": {
      const parts: string[] = [];
      if (details.oldTitle && details.newTitle) {
        parts.push(`title from "${details.oldTitle}" to "${details.newTitle}"`);
      }
      if (details.descriptionChanged) {
        parts.push("description");
      }
      return parts.length > 0 ? `Changed ${parts.join(" and ")}` : null;
    }
    case "ASSIGNEE_CHANGED": {
      const newUsername = details.newAssigneeUsername as string | undefined;
      if (newUsername) {
        return `Assigned to ${newUsername}`;
      }
      return "Unassigned the task";
    }
    case "PRIORITY_CHANGED": {
      const oldPriority =
        (details.oldPriority as string)?.toLowerCase() ?? "none";
      const newPriority =
        (details.newPriority as string)?.toLowerCase() ?? "none";
      return `From ${oldPriority} to ${newPriority}`;
    }
    case "DUE_DATE_CHANGED": {
      const oldDate = details.oldDueDate as string | null;
      const newDate = details.newDueDate as string | null;
      if (!oldDate && newDate) {
        return `Set to ${newDate}`;
      }
      if (oldDate && !newDate) {
        return "Removed due date";
      }
      return `Changed from ${oldDate} to ${newDate}`;
    }
    default:
      return null;
  }
}

export function ActivityItem({ activity }: { activity: ActivityLogDto }) {
  const config = activityConfig[activity.type] ?? {
    icon: Pencil,
    label: activity.type.toLowerCase().replace(/_/g, " "),
    color: "text-gray-600 dark:text-gray-400",
  };

  const Icon = config.icon;
  const details = parseDetails(activity.details);
  const formattedDetails = formatActivityDetails(activity.type, details);

  const timeAgo = formatDistanceToNow(new Date(activity.dateCreated), {
    addSuffix: true,
  });

  return (
    <div className="flex gap-3 py-2">
      <div
        className={`bg-muted flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${config.color}`}
      >
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 text-sm">
          <span className="truncate font-medium">{activity.user.username}</span>
          <span className="text-muted-foreground">{config.label}</span>
        </div>
        {formattedDetails && (
          <p className="text-muted-foreground mt-0.5 text-xs">
            {formattedDetails}
          </p>
        )}
        <p className="text-muted-foreground/70 mt-0.5 text-xs">{timeAgo}</p>
      </div>
    </div>
  );
}
