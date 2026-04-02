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
  IconArchive,
  IconRestore,
  IconDots,
  IconPencil,
  IconPlus,
  IconX,
  IconListCheck,
} from "@tabler/icons-react";
import { SortableTaskItem } from "@/features/tasks/components/sortable-task-item";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useEffect, useRef, useState } from "react";
import { ColumnEditDialog } from "./column-edit-dialog";
import {
  useCreateTask,
  useUpdateTaskStatus,
} from "@/api/gen/endpoints/task-controller/task-controller";
import { CreateTaskBody } from "@/api/gen/endpoints/task-controller/task-controller.zod";
import { useUpdateColumnArchive } from "@/api/gen/endpoints/column-controller/column-controller";
import { UpdateColumnArchiveBody } from "@/api/gen/endpoints/column-controller/column-controller.zod";
import { getGetBoardQueryKey } from "@/api/gen/endpoints/board-controller/board-controller";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { handleMutationAuthError } from "@/features/auth/route-auth";
import { ScrollArea } from "@/components/ui/scroll-area";

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
  const [archiveConfirmOpen, setArchiveConfirmOpen] = useState(false);
  const [isArchivingAllTasks, setIsArchivingAllTasks] = useState(false);
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
        requestAnimationFrame(() => {
          inputRef.current?.focus();
        });
      },
    },
  });
  const updateColumnArchiveMutation = useUpdateColumnArchive({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: getGetBoardQueryKey(boardId),
        });
      },
      onError: (error) => {
        if (handleMutationAuthError(error)) {
          return;
        }
        toast.error("Failed to update column archive status");
      },
    },
  });
  const updateTaskStatusMutation = useUpdateTaskStatus({
    mutation: {
      onError: (error) => {
        if (handleMutationAuthError(error)) {
          return;
        }
        toast.error("Failed to update task status");
      },
    },
  });

  useEffect(() => {
    if (isAdding) {
      inputRef.current?.focus();
    }
  }, [isAdding]);

  useEffect(() => {
    if (column.isArchived) {
      setIsAdding(false);
      setTitle("");
    }
  }, [column.isArchived]);

  const handleSubmit = async () => {
    const trimmed = title.trim();
    if (!trimmed) return;

    const payload = { boardId, title: trimmed, columnId: column.id };
    const result = CreateTaskBody.safeParse(payload);
    if (!result.success) {
      toast.error(result.error.issues[0]?.message ?? "Invalid task title");
      return;
    }

    const toastId = toast.loading("Creating task...");
    try {
      await createTaskMutation.mutateAsync({
        data: payload,
      });
      toast.success("Task created!", { id: toastId });
    } catch (error) {
      if (handleMutationAuthError(error)) {
        toast.dismiss(toastId);
        return;
      }
      toast.error("Failed to create task", { id: toastId });
    }
  };

  const submitArchiveChange = async (
    shouldArchive: boolean,
    confirmArchiveTasks: boolean,
  ) => {
    const payload = { isArchived: shouldArchive, confirmArchiveTasks };
    const validationResult = UpdateColumnArchiveBody.safeParse(payload);
    if (!validationResult.success) {
      toast.error(
        validationResult.error.issues[0]?.message ?? "Invalid archive request",
      );
      return;
    }

    const toastId = toast.loading(
      shouldArchive ? "Archiving column..." : "Unarchiving column...",
    );
    try {
      await updateColumnArchiveMutation.mutateAsync({
        boardId,
        columnId: column.id,
        data: payload,
      });
      setArchiveConfirmOpen(false);
      toast.success(shouldArchive ? "Column archived" : "Column unarchived", {
        id: toastId,
      });
    } catch (error) {
      if (handleMutationAuthError(error)) {
        toast.dismiss(toastId);
        return;
      }
      toast.error("Failed to update column archive status", { id: toastId });
    }
  };

  const handleToggleArchive = () => {
    if (column.isArchived) {
      void submitArchiveChange(false, false);
      return;
    }
    setArchiveConfirmOpen(true);
  };

  const handleArchiveAllTasks = async () => {
    if (tasks.length === 0) {
      return;
    }

    setIsArchivingAllTasks(true);
    const toastId = toast.loading("Archiving tasks...");
    try {
      const results = await Promise.allSettled(
        tasks.map((task) =>
          updateTaskStatusMutation.mutateAsync({
            taskId: task.id,
            data: { isArchived: true },
          }),
        ),
      );

      for (const result of results) {
        if (
          result.status === "rejected" &&
          handleMutationAuthError(result.reason)
        ) {
          toast.dismiss(toastId);
          return;
        }
      }

      await queryClient.invalidateQueries({
        queryKey: getGetBoardQueryKey(boardId),
      });

      const archivedCount = results.filter(
        (result) => result.status === "fulfilled",
      ).length;
      const failedCount = results.length - archivedCount;

      if (failedCount === 0) {
        toast.success(
          archivedCount === 1
            ? "1 task archived"
            : `${archivedCount} tasks archived`,
          { id: toastId },
        );
        return;
      }

      toast.error(
        archivedCount === 0
          ? "Failed to archive tasks"
          : `Archived ${archivedCount} task${archivedCount === 1 ? "" : "s"}, ${failedCount} failed`,
        { id: toastId },
      );
    } catch (error) {
      if (handleMutationAuthError(error)) {
        toast.dismiss(toastId);
        return;
      }
      toast.error("Failed to archive tasks", { id: toastId });
    } finally {
      setIsArchivingAllTasks(false);
    }
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
        className="flex max-h-[75vh] w-72 max-w-72 flex-col gap-2 py-2 transition-colors md:max-h-[80vh]"
      >
        {dragHandleProps && (
          <CardHeader
            className="flex flex-shrink-0 touch-none flex-row items-center justify-between space-y-0 px-4 active:cursor-grabbing"
            {...dragHandleProps}
          >
            <CardTitle className="text-base">
              {column.name}
              {column.isArchived ? (
                <span className="text-destructive ml-2 font-normal">
                  Archived
                </span>
              ) : null}
            </CardTitle>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="size-8">
                  <IconDots />
                  <span className="sr-only">Column options</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-auto">
                <DropdownMenuItem onClick={() => setIsEditOpen(true)}>
                  <IconPencil className="mr-2" />
                  Rename
                </DropdownMenuItem>
                {!column.isArchived ? (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => void handleArchiveAllTasks()}
                      disabled={tasks.length === 0 || isArchivingAllTasks}
                      variant="destructive"
                    >
                      <IconListCheck className="mr-2" />
                      Archive all tasks
                    </DropdownMenuItem>
                  </>
                ) : null}
                <DropdownMenuItem
                  onClick={handleToggleArchive}
                  disabled={
                    updateColumnArchiveMutation.isPending || isArchivingAllTasks
                  }
                  variant={column.isArchived ? undefined : "destructive"}
                >
                  {column.isArchived ? (
                    <IconRestore className="mr-2" />
                  ) : (
                    <IconArchive className="mr-2" />
                  )}
                  {column.isArchived ? "Unarchive" : "Archive"}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </CardHeader>
        )}
        {tasks.length > 0 && (
          <CardContent className="flex min-h-0 flex-1 overflow-hidden px-0">
            <ScrollArea className="flex-1">
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
            </ScrollArea>
          </CardContent>
        )}
        <CardFooter className="flex-shrink-0 flex-col items-stretch gap-2 px-2">
          {isAdding && !column.isArchived ? (
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
                onBlur={(e) => {
                  e.preventDefault();
                  setIsAdding(false);
                }}
                disabled={createTaskMutation.isPending}
              />
              <div className="flex items-center gap-1">
                <Button
                  size="sm"
                  onClick={handleSubmit}
                  disabled={!title.trim() || createTaskMutation.isPending}
                >
                  Add task
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    setIsAdding(false);
                    setTitle("");
                  }}
                >
                  <IconX />
                </Button>
              </div>
            </>
          ) : (
            <Button
              variant="ghost"
              className="w-full justify-start"
              onClick={() => setIsAdding(true)}
              disabled={column.isArchived}
            >
              <IconPlus />
              {column.isArchived ? "Archived column" : "New task"}
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

      <AlertDialog
        open={archiveConfirmOpen}
        onOpenChange={setArchiveConfirmOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Archive this column?</AlertDialogTitle>
            <AlertDialogDescription>
              This will archive the column and all active tasks in it. You can
              restore it from Archived Items.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={updateColumnArchiveMutation.isPending}
              onClick={() => void submitArchiveChange(true, true)}
            >
              Archive
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
