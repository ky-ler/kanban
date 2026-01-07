import {
  Item,
  ItemMedia,
  ItemContent,
  ItemTitle,
  ItemActions,
} from "@/components/ui/item";
import { Badge } from "@/components/ui/badge";
import { User, Calendar } from "lucide-react";
import { Link } from "@tanstack/react-router";
import type { TaskSummaryDto } from "@/api/gen/model";
import { cn } from "@/lib/utils";
import { LabelBadge } from "@/features/labels/components/label-badge";

const priorityConfig: Record<
  string,
  { label: string; className: string }
> = {
  LOW: {
    label: "Low",
    className: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  },
  MEDIUM: {
    label: "Med",
    className: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
  },
  HIGH: {
    label: "High",
    className: "bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300",
  },
  URGENT: {
    label: "Urgent",
    className: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300",
  },
};

function isOverdue(dueDate: string): boolean {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(dueDate);
  return due < today;
}

function formatDueDate(dueDate: string): string {
  const date = new Date(dueDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  if (date.toDateString() === today.toDateString()) {
    return "Today";
  }
  if (date.toDateString() === tomorrow.toDateString()) {
    return "Tomorrow";
  }

  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
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

  return (
    <Item asChild size="sm" variant="outline">
      <Link
        to={"/boards/$boardId/tasks/$taskId"}
        params={{ boardId, taskId: task.id }}
        aria-label={`Open task ${task.title}`}
      >
        <ItemContent className="gap-1.5">
          <ItemTitle
            title={task.title}
            className="w-full wrap-anywhere whitespace-normal"
          >
            {task.title}
          </ItemTitle>
          {(priority || task.dueDate || (task.labels && task.labels.length > 0)) && (
            <div className="flex items-center gap-1.5 flex-wrap">
              {priority && (
                <Badge
                  variant="outline"
                  className={cn("text-[10px] px-1.5 py-0", priority.className)}
                >
                  {priority.label}
                </Badge>
              )}
              {task.labels && task.labels.length > 0 && (
                <>
                  {task.labels.slice(0, 3).map((label) => (
                    <LabelBadge key={label.id} label={label} size="sm" />
                  ))}
                  {task.labels.length > 3 && (
                    <span className="text-[10px] text-muted-foreground">
                      +{task.labels.length - 3}
                    </span>
                  )}
                </>
              )}
              {task.dueDate && (
                <span
                  className={cn(
                    "text-[10px] flex items-center gap-0.5",
                    overdue
                      ? "text-red-600 dark:text-red-400"
                      : "text-muted-foreground",
                  )}
                >
                  <Calendar className="h-3 w-3" />
                  {formatDueDate(task.dueDate)}
                </span>
              )}
            </div>
          )}
        </ItemContent>
        <ItemActions>
          {task.assignedTo ? (
            <ItemMedia className="size-5">
              {task.assignedTo.profileImageUrl ? (
                <img
                  src={task.assignedTo.profileImageUrl}
                  alt={task.assignedTo.username}
                  title={task.assignedTo.username}
                  className="rounded-full object-cover"
                  loading="lazy"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="bg-muted flex size-5 items-center justify-center">
                  <User className="text-muted-foreground h-4 w-4" />
                </div>
              )}
            </ItemMedia>
          ) : null}
        </ItemActions>
      </Link>
    </Item>
  );
};
export default TaskItem;
