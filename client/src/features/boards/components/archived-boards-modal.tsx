import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  IconArchive,
  IconCalendar,
  IconExternalLink,
  IconRestore,
  IconTrash,
} from "@tabler/icons-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
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
import {
  getGetArchivedBoardsForUserQueryKey,
  getGetBoardsForUserQueryKey,
  useGetArchivedBoardsForUser,
  useUpdateBoardArchive,
} from "@/api/gen/endpoints/board-controller/board-controller";
import type { BoardSummary } from "@/api/gen/model";
import { handleMutationAuthError } from "@/features/auth/route-auth";
import { useDeleteBoard } from "@/features/boards/hooks/use-delete-board";

interface ArchivedBoardsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ArchivedBoardsModal({
  open,
  onOpenChange,
}: ArchivedBoardsModalProps) {
  const queryClient = useQueryClient();
  const [deleteTarget, setDeleteTarget] = useState<BoardSummary | null>(null);
  const archivedBoardsQuery = useGetArchivedBoardsForUser({
    query: {
      enabled: open,
    },
  });

  const archivedBoards = useMemo(
    () => archivedBoardsQuery.data?.data ?? [],
    [archivedBoardsQuery.data?.data],
  );

  const { mutate: restoreBoard, isPending: isRestoring } =
    useUpdateBoardArchive({
      mutation: {
        onSuccess: () => {
          toast.success("Board restored");
          queryClient.invalidateQueries({
            queryKey: getGetBoardsForUserQueryKey(),
          });
          queryClient.invalidateQueries({
            queryKey: getGetArchivedBoardsForUserQueryKey(),
          });
        },
        onError: (error) => {
          if (handleMutationAuthError(error)) {
            return;
          }
          toast.error("Failed to restore board");
        },
      },
    });

  const deleteBoardMutation = useDeleteBoard();

  const handleDelete = async () => {
    if (!deleteTarget) return;

    try {
      await deleteBoardMutation.mutateAsync(deleteTarget.id);
      toast.success("Board deleted");
      queryClient.invalidateQueries({
        queryKey: getGetBoardsForUserQueryKey(),
      });
      queryClient.invalidateQueries({
        queryKey: getGetArchivedBoardsForUserQueryKey(),
      });
      setDeleteTarget(null);
    } catch (error) {
      if (handleMutationAuthError(error)) {
        return;
      }
      toast.error("Failed to delete board");
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-h-[80vh] overflow-y-auto sm:max-w-4xl">
          <DialogHeader>
            <DialogTitle>Archived Boards</DialogTitle>
            <DialogDescription>
              Restore or permanently delete archived boards.
            </DialogDescription>
          </DialogHeader>

          {archivedBoardsQuery.isLoading ? (
            <div className="text-muted-foreground py-8 text-center text-sm">
              Loading archived boards...
            </div>
          ) : archivedBoards.length === 0 ? (
            <Empty>
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <IconArchive />
                </EmptyMedia>
                <EmptyTitle>No archived boards</EmptyTitle>
                <EmptyDescription>
                  Archived boards will appear here when you close them.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {archivedBoards.map((board) => (
                <Card key={board.id}>
                  <CardHeader>
                    <div className="flex items-start gap-3">
                      <div className="min-w-0 flex-1">
                        <CardTitle className="line-clamp-1">
                          {board.name}
                        </CardTitle>
                        {board.description ? (
                          <CardDescription className="line-clamp-2">
                            {board.description}
                          </CardDescription>
                        ) : null}
                      </div>
                      <CardAction>
                        <Button asChild variant="ghost" size="icon">
                          <Link
                            to="/boards/$boardId"
                            params={{ boardId: board.id }}
                            search={{
                              q: undefined,
                              assignee: undefined,
                              priority: undefined,
                              labels: undefined,
                              due: undefined,
                              archive: undefined,
                            }}
                          >
                            <IconExternalLink />
                            <span className="sr-only">Open board</span>
                          </Link>
                        </Button>
                      </CardAction>
                    </div>
                  </CardHeader>
                  <CardContent className="flex flex-col gap-4">
                    <div className="text-muted-foreground flex items-center justify-between text-sm">
                      <span>
                        {board.completedTasks}/{board.totalTasks} tasks
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <IconCalendar className="size-3.5" />
                        {new Date(board.dateModified).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={isRestoring}
                        onClick={() =>
                          restoreBoard({
                            boardId: board.id,
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
                        disabled={deleteBoardMutation.isPending}
                        onClick={() => setDeleteTarget(board)}
                      >
                        <IconTrash data-icon="inline-start" />
                        Delete
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) {
            setDeleteTarget(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete board permanently?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget
                ? `Delete "${deleteTarget.name}" permanently. This cannot be undone.`
                : "Delete this board permanently."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={deleteBoardMutation.isPending}
              onClick={handleDelete}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
