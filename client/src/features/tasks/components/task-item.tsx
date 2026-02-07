import { Item, ItemContent, ItemTitle } from "@/components/ui/item";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { User, Calendar, AlignLeft, MessageSquare } from "lucide-react";
import { Link } from "@tanstack/react-router";
import {
  addDays,
  format,
  isBefore,
  isSameDay,
  isValid,
  parseISO,
  startOfDay,
  startOfToday,
} from "date-fns";
import type { TaskSummaryDto } from "@/api/gen/model";
import { cn } from "@/lib/utils";
import { LabelBadge } from "@/features/labels/components/label-badge";

const priorityConfig: Record<string, { label: string; className: string }> = {
  LOW: {
    label: "Low",
    className:
      "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  },
  MEDIUM: {
    label: "Med",
    className: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
  },
  HIGH: {
    label: "High",
    className:
      "bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300",
  },
  URGENT: {
    label: "Urgent",
    className: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300",
  },
};

function isOverdue(dueDate: string): boolean {
  const parsedDueDate = parseISO(dueDate);
  if (!isValid(parsedDueDate)) return false;

  const today = startOfToday();
  const due = startOfDay(parsedDueDate);
  return isBefore(due, today);
}

function formatDueDate(dueDate: string): string {
  const date = parseISO(dueDate);
  if (!isValid(date)) return "Not set";

  const today = startOfToday();
  const tomorrow = addDays(today, 1);

  if (isSameDay(date, today)) {
    return "Today";
  }
  if (isSameDay(date, tomorrow)) {
    return "Tomorrow";
  }

  return format(date, "MMM d");
}

export const TaskItem = ({
  task,
  boardId,
}: Readonly<{
  task: TaskSummaryDto;
  boardId: string;
}>) => {
  const priority = task.priority ? priorityConfig[task.priority] : null;
  const overdue = task.dueDate ? isOverdue(task.dueDate) : false;
  const commentCount = task.commentCount ?? 0;
  const hasDescription = task.hasDescription;
  const hasComments = commentCount > 0;
  const hasTopMeta = Boolean(
    priority || (task.labels && task.labels.length > 0),
  );
  const hasBottomMeta = Boolean(
    task.dueDate || task.assignedTo || hasDescription || hasComments,
  );

  return (
    <Item asChild size="sm" variant="outline">
      <Link
        to={"/boards/$boardId/tasks/$taskId"}
        params={{ boardId, taskId: task.id }}
        search={{
          q: undefined,
          assignee: undefined,
          priority: undefined,
          labels: undefined,
          due: undefined,
        }}
        aria-label={`Open task ${task.title}`}
      >
        <ItemContent className="gap-1.5">
          <ItemTitle
            title={task.title}
            className="w-full text-base leading-snug wrap-anywhere whitespace-normal"
          >
            {task.title}
          </ItemTitle>
          {hasTopMeta && (
            <div className="flex flex-wrap items-center gap-1.5">
              {priority && (
                <Badge
                  variant="outline"
                  className={cn(
                    "h-6 px-2.5 text-sm leading-none",
                    priority.className,
                  )}
                >
                  {priority.label}
                </Badge>
              )}
              {task.labels && task.labels.length > 0 && (
                <>
                  {[...task.labels]
                    .sort((a, b) => a.name.localeCompare(b.name))
                    .slice(0, 3)
                    .map((label) => (
                      <LabelBadge key={label.id} label={label} size="md" />
                    ))}
                  {task.labels.length > 3 && (
                    <span className="text-muted-foreground text-sm leading-none">
                      +{task.labels.length - 3}
                    </span>
                  )}
                </>
              )}
            </div>
          )}
          {hasBottomMeta && (
            <div className="flex min-h-6 items-end gap-2">
              {task.dueDate && (
                <span
                  className={cn(
                    "flex items-center gap-1 text-sm leading-none",
                    overdue
                      ? "text-red-600 dark:text-red-400"
                      : "text-muted-foreground",
                  )}
                >
                  <Calendar className="h-3.5 w-3.5" />
                  {formatDueDate(task.dueDate)}
                </span>
              )}
              {hasDescription && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="text-muted-foreground inline-flex items-center">
                      <AlignLeft className="h-3.5 w-3.5" />
                    </span>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">
                    This task has a description
                  </TooltipContent>
                </Tooltip>
              )}
              {hasComments && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="text-muted-foreground inline-flex items-center gap-1 text-sm leading-none">
                      <MessageSquare className="h-3.5 w-3.5" />
                      {commentCount}
                    </span>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">
                    {`This task has ${commentCount} ${commentCount === 1 ? "comment" : "comments"}`}
                  </TooltipContent>
                </Tooltip>
              )}
              {task.assignedTo ? (
                <div className="ml-auto">
                  {task.assignedTo.profileImageUrl ? (
                    <img
                      src={task.assignedTo.profileImageUrl}
                      alt={task.assignedTo.username}
                      title={task.assignedTo.username}
                      className="size-6 rounded-full object-cover"
                      loading="lazy"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div
                      className="bg-muted flex size-6 items-center justify-center rounded-full"
                      title={task.assignedTo.username}
                    >
                      <User className="text-muted-foreground h-3.5 w-3.5" />
                    </div>
                  )}
                </div>
              ) : null}
            </div>
          )}
        </ItemContent>
      </Link>
    </Item>
  );
};
