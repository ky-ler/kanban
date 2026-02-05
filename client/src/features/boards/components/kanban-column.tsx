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
import { Input } from "@/components/ui/input";
import {
  GripVertical,
  MoreHorizontal,
  Pencil,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import { SortableTaskItem } from "@/features/tasks/components/sortable-task-item";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useEffect, useRef, useState } from "react";
import { ColumnEditDialog } from "./column-edit-dialog";
import { ColumnDeleteDialog } from "./column-delete-dialog";
import { useCreateTask } from "@/api/gen/endpoints/task-controller/task-controller";
import { getGetBoardQueryKey } from "@/api/gen/endpoints/board-controller/board-controller";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

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
  const [isAdding, setIsAdding] = useState(false);
  const [title, setTitle] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  const createTaskMutation = useCreateTask({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: getGetBoardQueryKey(boardId),
        });
        setTitle("");
        inputRef.current?.focus();
      },
    },
  });

  useEffect(() => {
    if (isAdding) {
      inputRef.current?.focus();
    }
  }, [isAdding]);

  const handleSubmit = () => {
    const trimmed = title.trim();
    if (!trimmed) return;

    toast.promise(
      createTaskMutation.mutateAsync({
        data: { boardId, title: trimmed, columnId: column.id },
      }),
      {
        loading: "Creating task...",
        success: "Task created!",
        error: "Failed to create task",
      },
    );
  };

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
        className="flex max-h-[65vh] flex-col gap-2 py-2 transition-colors sm:min-w-3xs"
      >
        <CardHeader className="flex flex-shrink-0 flex-row items-center justify-between space-y-0">
          <div className="flex items-center gap-1">
            {dragHandleProps && (
              <div
                {...dragHandleProps}
                className="hover:bg-muted cursor-grab touch-none rounded p-1 active:cursor-grabbing"
              >
                <GripVertical className="text-muted-foreground size-4" />
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
        <CardContent className="flex min-h-0 flex-1 overflow-hidden px-0">
          <div className="mr-1.5 flex-1 overflow-y-auto">
            <SortableContext
              items={taskIds}
              strategy={verticalListSortingStrategy}
            >
              <div className="flex flex-col gap-2 px-2">
                {tasks.map((task) => (
                  <SortableTaskItem
                    key={task.id}
                    task={task}
                    boardId={boardId}
                  />
                ))}
              </div>
            </SortableContext>
          </div>
        </CardContent>
        <CardFooter className="flex-shrink-0 flex-col items-stretch gap-2 px-2">
          {isAdding ? (
            <>
              <Input
                ref={inputRef}
                placeholder="Enter a title..."
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleSubmit();
                  } else if (e.key === "Escape") {
                    setIsAdding(false);
                    setTitle("");
                  }
                }}
                disabled={createTaskMutation.isPending}
              />
              <div className="flex items-center gap-1">
                <Button
                  size="sm"
                  onClick={handleSubmit}
                  disabled={!title.trim() || createTaskMutation.isPending}
                >
                  Add card
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-8"
                  onClick={() => {
                    setIsAdding(false);
                    setTitle("");
                  }}
                >
                  <X className="size-4" />
                </Button>
              </div>
            </>
          ) : (
            <Button
              variant="ghost"
              className="w-full justify-start"
              onClick={() => setIsAdding(true)}
            >
              <Plus className="size-4" />
              Add a card
            </Button>
          )}
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
