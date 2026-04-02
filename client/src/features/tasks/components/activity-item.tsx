import type { ActivityLogDto } from "@/api/gen/model";
import { ActivityType } from "@/features/tasks/constants/activity-type";
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
  IconListCheck,
} from "@tabler/icons-react";

const activityConfig: Record<
  string,
  { icon: React.ElementType; label: string }
> = {
  [ActivityType.TASK_CREATED]: {
    icon: IconCirclePlus,
    label: "created this task",
  },
  [ActivityType.TASK_UPDATED]: {
    icon: IconEdit,
    label: "updated the task",
  },
  [ActivityType.TASK_MOVED]: {
    icon: IconArrowMoveRight,
    label: "moved the task",
  },
  [ActivityType.TASK_DELETED]: {
    icon: IconTrash,
    label: "deleted the task",
  },
  [ActivityType.TASK_COMPLETED]: {
    icon: IconCircleCheck,
    label: "completed the task",
  },
  [ActivityType.TASK_REOPENED]: {
    icon: IconRefresh,
    label: "reopened the task",
  },
  [ActivityType.TASK_ARCHIVED]: {
    icon: IconArchive,
    label: "archived the task",
  },
  [ActivityType.TASK_UNARCHIVED]: {
    icon: IconArchiveOff,
    label: "unarchived the task",
  },
  [ActivityType.ASSIGNEE_CHANGED]: {
    icon: IconUser,
    label: "changed assignee",
  },
  [ActivityType.LABELS_CHANGED]: {
    icon: IconTags,
    label: "changed labels",
  },
  [ActivityType.PRIORITY_CHANGED]: {
    icon: IconFlag,
    label: "changed priority",
  },
  [ActivityType.DUE_DATE_CHANGED]: {
    icon: IconCalendarEvent,
    label: "changed due date",
  },
  [ActivityType.COLUMN_CREATED]: {
    icon: IconCirclePlus,
    label: "created column",
  },
  [ActivityType.COLUMN_UPDATED]: {
    icon: IconEdit,
    label: "renamed column",
  },
  [ActivityType.COLUMN_DELETED]: {
    icon: IconTrash,
    label: "deleted column",
  },
  [ActivityType.COLUMN_MOVED]: {
    icon: IconArrowMoveRight,
    label: "moved column",
  },
  [ActivityType.COLUMN_ARCHIVED]: {
    icon: IconArchive,
    label: "archived column",
  },
  [ActivityType.COLUMN_RESTORED]: {
    icon: IconArchiveOff,
    label: "restored column",
  },
  [ActivityType.CHECKLIST_ITEM_ADDED]: {
    icon: IconListCheck,
    label: "added a checklist item",
  },
  [ActivityType.CHECKLIST_ITEM_UPDATED]: {
    icon: IconEdit,
    label: "updated a checklist item",
  },
  [ActivityType.CHECKLIST_ITEM_COMPLETED]: {
    icon: IconCircleCheck,
    label: "completed a checklist item",
  },
  [ActivityType.CHECKLIST_ITEM_UNCOMPLETED]: {
    icon: IconRefresh,
    label: "reopened a checklist item",
  },
  [ActivityType.CHECKLIST_ITEM_DELETED]: {
    icon: IconTrash,
    label: "deleted a checklist item",
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
    case ActivityType.TASK_UPDATED: {
      const parts: string[] = [];
      if (details.oldTitle && details.newTitle) {
        parts.push(`title from "${details.oldTitle}" to "${details.newTitle}"`);
      }
      if (details.descriptionChanged) {
        parts.push("description");
      }
      return parts.length > 0 ? `Changed ${parts.join(" and ")}` : null;
    }
    case ActivityType.TASK_MOVED: {
      const oldCol = details.oldColumnName as string | undefined;
      const newCol = details.newColumnName as string | undefined;
      if (oldCol && newCol && oldCol !== newCol) {
        return `From ${oldCol} to ${newCol}`;
      }
      return null;
    }
    case ActivityType.ASSIGNEE_CHANGED: {
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
    case ActivityType.PRIORITY_CHANGED: {
      const oldPriority =
        (details.oldPriority as string)?.toLowerCase() ?? "none";
      const newPriority =
        (details.newPriority as string)?.toLowerCase() ?? "none";
      return `From ${oldPriority} to ${newPriority}`;
    }
    case ActivityType.DUE_DATE_CHANGED: {
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
    case ActivityType.LABELS_CHANGED: {
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
    case ActivityType.COLUMN_UPDATED: {
      const oldName = details.oldName as string | undefined;
      const newName = details.newName as string | undefined;
      if (oldName && newName) {
        return `From "${oldName}" to "${newName}"`;
      }
      return null;
    }
    case ActivityType.COLUMN_MOVED: {
      const oldPos = details.oldPosition as number | undefined;
      const newPos = details.newPosition as number | undefined;
      if (oldPos !== undefined && newPos !== undefined) {
        return `From position ${oldPos + 1} to ${newPos + 1}`;
      }
      return null;
    }
    case ActivityType.CHECKLIST_ITEM_ADDED:
    case ActivityType.CHECKLIST_ITEM_UPDATED:
    case ActivityType.CHECKLIST_ITEM_COMPLETED:
    case ActivityType.CHECKLIST_ITEM_UNCOMPLETED:
    case ActivityType.CHECKLIST_ITEM_DELETED: {
      const title = details.title as string | undefined;
      return title ? `"${title}"` : null;
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
          <Icon />
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
