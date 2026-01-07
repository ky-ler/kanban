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
import { GripVertical, MoreHorizontal, Pencil, Plus, Trash2 } from "lucide-react";
import { SortableTaskItem } from "@/features/tasks/components/sortable-task-item";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useState } from "react";
import { ColumnEditDialog } from "./column-edit-dialog";
import { ColumnDeleteDialog } from "./column-delete-dialog";

interface KanbanColumnProps {
  column: ColumnDto;
  tasks: TaskSummaryDto[];
  boardId: string;
  dragHandleProps?: Record<string, unknown>;
}

export const KanbanColumn = ({
  column,
  tasks,
  boardId,
  dragHandleProps,
}: KanbanColumnProps) => {
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

  const { setNodeRef } = useDroppable({
    id: column.id,
    data: {
      type: "column",
      column,
    },
  });

  const taskIds = tasks.map((task) => task.id);

  return (
    <>
      <Card
        ref={setNodeRef}
        className="h-fit gap-2 transition-colors sm:min-w-3xs"
      >
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <div className="flex items-center gap-1">
            {dragHandleProps && (
              <div
                {...dragHandleProps}
                className="cursor-grab touch-none rounded p-1 hover:bg-muted active:cursor-grabbing"
              >
                <GripVertical className="size-4 text-muted-foreground" />
              </div>
            )}
            <CardTitle className="text-base">{column.name}</CardTitle>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="size-8">
                <MoreHorizontal className="size-4" />
                <span className="sr-only">Column options</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setIsEditOpen(true)}>
                <Pencil className="mr-2 size-4" />
                Rename
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => setIsDeleteOpen(true)}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="mr-2 size-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
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

      <ColumnEditDialog
        open={isEditOpen}
        onOpenChange={setIsEditOpen}
        column={column}
        boardId={boardId}
      />

      <ColumnDeleteDialog
        open={isDeleteOpen}
        onOpenChange={setIsDeleteOpen}
        column={column}
        boardId={boardId}
        taskCount={tasks.length}
      />
    </>
  );
};
