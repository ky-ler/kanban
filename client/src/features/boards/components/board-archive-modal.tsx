import { useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  IconArchive,
  IconColumns3,
  IconRestore,
  IconTrash,
} from "@tabler/icons-react";
import type { ColumnDto, TaskSummaryDto } from "@/api/gen/model";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
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
import { getGetBoardQueryKey } from "@/api/gen/endpoints/board-controller/board-controller";
import {
  useDeleteColumn,
  useUpdateColumnArchive,
} from "@/api/gen/endpoints/column-controller/column-controller";
import {
  useDeleteTask,
  useUpdateTaskStatus,
} from "@/api/gen/endpoints/task-controller/task-controller";
import { handleMutationAuthError } from "@/features/auth/route-auth";

type ArchiveTab = "tasks" | "columns";

interface BoardArchiveModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  boardId: string;
  tab: ArchiveTab;
  onTabChange: (tab: ArchiveTab) => void;
  columns: ColumnDto[];
  tasks: TaskSummaryDto[];
}

export function BoardArchiveModal({
  open,
  onOpenChange,
  boardId,
  tab,
  onTabChange,
  columns,
  tasks,
}: BoardArchiveModalProps) {
  const queryClient = useQueryClient();
  const [deleteTaskTarget, setDeleteTaskTarget] =
    useState<TaskSummaryDto | null>(null);
  const [deleteColumnTarget, setDeleteColumnTarget] =
    useState<ColumnDto | null>(null);

  const columnById = useMemo(
    () => new Map(columns.map((column) => [column.id, column])),
    [columns],
  );

  const archivedColumns = useMemo(
    () =>
      [...columns]
        .filter((column) => column.isArchived)
        .sort((a, b) => a.name.localeCompare(b.name)),
    [columns],
  );

  const archivedTasks = useMemo(
    () =>
      [...tasks]
        .filter((task) => {
          if (!task.isArchived) return false;
          const parentColumn = columnById.get(task.columnId);
          return Boolean(parentColumn && !parentColumn.isArchived);
        })
        .sort((a, b) => a.title.localeCompare(b.title)),
    [columnById, tasks],
  );

  const archivedTaskCountByColumnId = useMemo(() => {
    const counts = new Map<string, number>();
    tasks.forEach((task) => {
      if (!task.isArchived) return;
      counts.set(task.columnId, (counts.get(task.columnId) ?? 0) + 1);
    });
    return counts;
  }, [tasks]);

  const invalidateBoard = () =>
    queryClient.invalidateQueries({
      queryKey: getGetBoardQueryKey(boardId),
    });

  const restoreTaskMutation = useUpdateTaskStatus({
    mutation: {
      onSuccess: () => {
        toast.success("Task restored");
        invalidateBoard();
      },
      onError: (error) => {
        if (handleMutationAuthError(error)) return;
        toast.error("Failed to restore task");
      },
    },
  });

  const deleteTaskMutation = useDeleteTask({
    mutation: {
      onSuccess: () => {
        toast.success("Task deleted");
        invalidateBoard();
        setDeleteTaskTarget(null);
      },
      onError: (error) => {
        if (handleMutationAuthError(error)) return;
        toast.error("Failed to delete task");
      },
    },
  });

  const restoreColumnMutation = useUpdateColumnArchive({
    mutation: {
      onSuccess: () => {
        toast.success("Column restored");
        invalidateBoard();
      },
      onError: (error) => {
        if (handleMutationAuthError(error)) return;
        toast.error("Failed to restore column");
      },
    },
  });

  const deleteColumnMutation = useDeleteColumn({
    mutation: {
      onSuccess: () => {
        toast.success("Column deleted");
        invalidateBoard();
        setDeleteColumnTarget(null);
      },
      onError: (error) => {
        if (handleMutationAuthError(error)) return;
        toast.error("Failed to delete column");
      },
    },
  });

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-h-[80vh] overflow-y-auto sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>Archived Items</DialogTitle>
            <DialogDescription>
              Restore or permanently delete archived tasks and columns.
            </DialogDescription>
          </DialogHeader>

          <Tabs
            value={tab}
            onValueChange={(value) => onTabChange(value as ArchiveTab)}
          >
            <TabsList>
              <TabsTrigger value="tasks">Tasks</TabsTrigger>
              <TabsTrigger value="columns">Columns</TabsTrigger>
            </TabsList>

            <TabsContent value="tasks" className="mt-4">
              {archivedTasks.length === 0 ? (
                <Empty>
                  <EmptyHeader>
                    <EmptyMedia variant="icon">
                      <IconArchive />
                    </EmptyMedia>
                    <EmptyTitle>No archived tasks</EmptyTitle>
                    <EmptyDescription>
                      Archived tasks only appear here when their parent column
                      is still active.
                    </EmptyDescription>
                  </EmptyHeader>
                </Empty>
              ) : (
                <div className="flex flex-col gap-3">
                  {archivedTasks.map((task) => {
                    const parentColumn = columnById.get(task.columnId);
                    return (
                      <Card key={task.id}>
                        <CardHeader>
                          <CardTitle className="text-base">
                            {task.title}
                          </CardTitle>
                          <CardDescription className="flex items-center gap-2">
                            <span>Column</span>
                            <Badge variant="outline">
                              {parentColumn?.name ?? "Unknown"}
                            </Badge>
                          </CardDescription>
                        </CardHeader>
                        <CardContent className="flex gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled={restoreTaskMutation.isPending}
                            onClick={() =>
                              restoreTaskMutation.mutate({
                                taskId: task.id,
                                data: { isArchived: false },
                              })
                            }
                          >
                            <IconRestore data-icon="inline-start" />
                            Restore
                          </Button>
                          <Button
                            type="button"
                            variant="destructive"
                            size="sm"
                            disabled={deleteTaskMutation.isPending}
                            onClick={() => setDeleteTaskTarget(task)}
                          >
                            <IconTrash data-icon="inline-start" />
                            Delete
                          </Button>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </TabsContent>

            <TabsContent value="columns" className="mt-4">
              {archivedColumns.length === 0 ? (
                <Empty>
                  <EmptyHeader>
                    <EmptyMedia variant="icon">
                      <IconColumns3 />
                    </EmptyMedia>
                    <EmptyTitle>No archived columns</EmptyTitle>
                    <EmptyDescription>
                      Archived columns will appear here after you archive them
                      from the board.
                    </EmptyDescription>
                  </EmptyHeader>
                </Empty>
              ) : (
                <div className="flex flex-col gap-3">
                  {archivedColumns.map((column) => (
                    <Card key={column.id}>
                      <CardHeader>
                        <CardTitle className="text-base">
                          {column.name}
                        </CardTitle>
                        <CardDescription>
                          {archivedTaskCountByColumnId.get(column.id) ?? 0}{" "}
                          archived task
                          {(archivedTaskCountByColumnId.get(column.id) ?? 0) ===
                          1
                            ? ""
                            : "s"}
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="flex gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={restoreColumnMutation.isPending}
                          onClick={() =>
                            restoreColumnMutation.mutate({
                              boardId,
                              columnId: column.id,
                              data: {
                                isArchived: false,
                                confirmArchiveTasks: false,
                              },
                            })
                          }
                        >
                          <IconRestore data-icon="inline-start" />
                          Restore
                        </Button>
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          disabled={deleteColumnMutation.isPending}
                          onClick={() => setDeleteColumnTarget(column)}
                        >
                          <IconTrash data-icon="inline-start" />
                          Delete
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={deleteTaskTarget !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteTaskTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete task permanently?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTaskTarget
                ? `Delete "${deleteTaskTarget.title}" permanently.`
                : "Delete this task permanently."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={deleteTaskMutation.isPending}
              onClick={() => {
                if (!deleteTaskTarget) return;
                deleteTaskMutation.mutate({ taskId: deleteTaskTarget.id });
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={deleteColumnTarget !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteColumnTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete column permanently?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteColumnTarget
                ? `Delete "${deleteColumnTarget.name}" and its archived tasks permanently.`
                : "Delete this column permanently."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={deleteColumnMutation.isPending}
              onClick={() => {
                if (!deleteColumnTarget) return;
                deleteColumnMutation.mutate({
                  boardId,
                  columnId: deleteColumnTarget.id,
                });
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
