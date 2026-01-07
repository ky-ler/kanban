import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { useDroppable } from "@dnd-kit/core";
import type { ColumnDto, TaskSummaryDto } from "@/api/gen/model";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "@tanstack/react-router";
import { Plus } from "lucide-react";
import { SortableTaskItem } from "@/features/tasks/components/sortable-task-item";

interface KanbanColumnProps {
  column: ColumnDto;
  tasks: TaskSummaryDto[];
  boardId: string;
}

export const KanbanColumn = ({ column, tasks, boardId }: KanbanColumnProps) => {
  const { setNodeRef } = useDroppable({
    id: column.id,
    data: {
      type: "column",
      column,
    },
  });

  const taskIds = tasks.map((task) => task.id);

  return (
    <Card
      ref={setNodeRef}
      className="h-fit gap-2 transition-colors sm:min-w-3xs"
    >
      <CardHeader>
        <CardTitle>{column.name}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        <SortableContext items={taskIds} strategy={verticalListSortingStrategy}>
          {tasks.map((task) => (
            <SortableTaskItem key={task.id} task={task} boardId={boardId} />
          ))}
        </SortableContext>
      </CardContent>
      <CardFooter>
        <Button asChild variant="secondary" className="w-full justify-start">
          <Link
            to="/boards/$boardId/tasks/create"
            params={{ boardId }}
            search={{ columnId: column.id }}
          >
            <Plus className="size-5" />
            Add a Task
          </Link>
        </Button>
      </CardFooter>
    </Card>
  );
};
