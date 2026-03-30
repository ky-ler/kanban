import type { ActivityLogDto } from "@/api/gen/model";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { DateTooltip } from "@/components/date-tooltip";
import { formatDistanceToNow } from "date-fns";
import {
  IconPlus,
  IconPencil,
  IconArrowRight,
  IconTrash,
  IconUserCircle,
  IconTag,
  IconAlertCircle,
  IconCalendar,
} from "@tabler/icons-react";

const activityConfig: Record<
  string,
  { icon: React.ElementType; label: string; color: string }
> = {
  TASK_CREATED: {
    icon: IconPlus,
    label: "created this task",
    color: "text-chart-1",
  },
  TASK_UPDATED: {
    icon: IconPencil,
    label: "updated the task",
    color: "text-chart-2",
  },
  TASK_MOVED: {
    icon: IconArrowRight,
    label: "moved the task",
    color: "text-chart-3",
  },
  TASK_DELETED: {
    icon: IconTrash,
    label: "deleted the task",
    color: "text-destructive",
  },
  ASSIGNEE_CHANGED: {
    icon: IconUserCircle,
    label: "changed assignee",
    color: "text-chart-5",
  },
  LABELS_CHANGED: {
    icon: IconTag,
    label: "changed labels",
    color: "text-chart-4",
  },
  PRIORITY_CHANGED: {
    icon: IconAlertCircle,
    label: "changed priority",
    color: "text-chart-1",
  },
  DUE_DATE_CHANGED: {
    icon: IconCalendar,
    label: "changed due date",
    color: "text-chart-2",
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
    case "TASK_MOVED": {
      const oldCol = details.oldColumnName as string | undefined;
      const newCol = details.newColumnName as string | undefined;
      if (oldCol && newCol && oldCol !== newCol) {
        return `From ${oldCol} to ${newCol}`;
      }
      return null;
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
    icon: IconPencil,
    label: activity.type.toLowerCase().replace(/_/g, " "),
    color: "text-muted-foreground",
  };

  const Icon = config.icon;
  const details = parseDetails(activity.details);
  const formattedDetails = formatActivityDetails(activity.type, details);

  const date = new Date(activity.dateCreated);
  const timeAgo = formatDistanceToNow(date, { addSuffix: true });

  return (
    <div className="flex gap-3 py-2">
      <Avatar>
        <AvatarFallback className={config.color}>
          <Icon className="size-4" />
        </AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <div className="flex items-center">
          <span className="truncate font-medium">{activity.user.username}</span>
          &nbsp;
          <span className="text-muted-foreground">{config.label}</span>
        </div>
        {formattedDetails && (
          <p className="text-muted-foreground mt-0.5 wrap-anywhere whitespace-normal">
            {formattedDetails}
          </p>
        )}
        <DateTooltip date={date} showTime>
          <p className="text-muted-foreground/70 mt-0.5 w-fit cursor-default">
            {timeAgo}
          </p>
        </DateTooltip>
      </div>
    </div>
  );
}
