import type { ActivityLogDto } from "@/api/gen/model";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { DateTooltip } from "@/components/date-tooltip";
import { formatDistanceToNow } from "date-fns";
import {
  IconCirclePlus,
  IconEdit,
  IconArrowMoveRight,
  IconTrash,
  IconCircleCheck,
  IconRefresh,
  IconArchive,
  IconArchiveOff,
  IconUser,
  IconTags,
  IconFlag,
  IconCalendarEvent,
} from "@tabler/icons-react";

const activityConfig: Record<
  string,
  { icon: React.ElementType; label: string }
> = {
  TASK_CREATED: {
    icon: IconCirclePlus,
    label: "created this task",
  },
  TASK_UPDATED: {
    icon: IconEdit,
    label: "updated the task",
  },
  TASK_MOVED: {
    icon: IconArrowMoveRight,
    label: "moved the task",
  },
  TASK_DELETED: {
    icon: IconTrash,
    label: "deleted the task",
  },
  TASK_COMPLETED: {
    icon: IconCircleCheck,
    label: "completed the task",
  },
  TASK_REOPENED: {
    icon: IconRefresh,
    label: "reopened the task",
  },
  TASK_ARCHIVED: {
    icon: IconArchive,
    label: "archived the task",
  },
  TASK_UNARCHIVED: {
    icon: IconArchiveOff,
    label: "unarchived the task",
  },
  ASSIGNEE_CHANGED: {
    icon: IconUser,
    label: "changed assignee",
  },
  LABELS_CHANGED: {
    icon: IconTags,
    label: "changed labels",
  },
  PRIORITY_CHANGED: {
    icon: IconFlag,
    label: "changed priority",
  },
  DUE_DATE_CHANGED: {
    icon: IconCalendarEvent,
    label: "changed due date",
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
      const oldUsername = details.oldAssigneeUsername as string | undefined;
      const newUsername = details.newAssigneeUsername as string | undefined;
      if (oldUsername && newUsername) {
        return `Reassigned from ${oldUsername} to ${newUsername}`;
      }
      if (newUsername) {
        return `Assigned to ${newUsername}`;
      }
      if (oldUsername) {
        return `Unassigned ${oldUsername}`;
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
    case "LABELS_CHANGED": {
      const added = details.addedLabels as string[] | undefined;
      const removed = details.removedLabels as string[] | undefined;
      const parts: string[] = [];
      if (added && added.length > 0) {
        parts.push(`Added ${added.join(", ")}`);
      }
      if (removed && removed.length > 0) {
        parts.push(`Removed ${removed.join(", ")}`);
      }
      return parts.length > 0 ? parts.join(" and ") : null;
    }
    default:
      return null;
  }
}

export function ActivityItem({ activity }: { activity: ActivityLogDto }) {
  const config = activityConfig[activity.type] ?? {
    icon: IconEdit,
    label: activity.type.toLowerCase().replace(/_/g, " "),
  };

  const Icon = config.icon;
  const details = parseDetails(activity.details);
  const formattedDetails = formatActivityDetails(activity.type, details);

  const date = new Date(activity.dateCreated);
  const timeAgo = formatDistanceToNow(date, { addSuffix: true });

  return (
    <div className="flex gap-3 py-2">
      <Avatar>
        <AvatarFallback>
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
