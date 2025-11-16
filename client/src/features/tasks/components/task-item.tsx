import {
  Item,
  ItemMedia,
  ItemContent,
  // ItemHeader,
  ItemTitle,
  // ItemDescription,
  ItemActions,
} from "@/components/ui/item";
import { User } from "lucide-react";
import { Link } from "@tanstack/react-router";
import type { TaskSummaryDto } from "@/api/gen/model";

export const TaskItem = ({
  task,
  boardId,
}: Readonly<{
  task: TaskSummaryDto;
  boardId: string;
}>) => {
  return (
    <Item asChild size="sm" variant="outline">
      <Link
        to={"/boards/$boardId/tasks/$taskId"}
        params={{ boardId, taskId: task.id }}
        aria-label={`Open task ${task.title}`}
      >
        <ItemContent>
          <ItemTitle
            title={task.title}
            className="w-full wrap-anywhere whitespace-normal"
          >
            {task.title}
          </ItemTitle>
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
