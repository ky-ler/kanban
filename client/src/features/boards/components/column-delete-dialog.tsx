import { useQueryClient } from "@tanstack/react-query";
import type { ColumnDto } from "@/api/gen/model";
import { useDeleteColumn } from "@/api/gen/endpoints/column-controller/column-controller";
import { getGetBoardQueryKey } from "@/api/gen/endpoints/board-controller/board-controller";
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
import { useState } from "react";

interface ColumnDeleteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  column: ColumnDto;
  boardId: string;
  taskCount: number;
}

export const ColumnDeleteDialog = ({
  open,
  onOpenChange,
  column,
  boardId,
  taskCount,
}: ColumnDeleteDialogProps) => {
  const queryClient = useQueryClient();
  const deleteColumnMutation = useDeleteColumn();
  const [error, setError] = useState<string | null>(null);

  const handleDelete = async () => {
    setError(null);
    try {
      await deleteColumnMutation.mutateAsync({
        boardId,
        columnId: column.id,
      });
      queryClient.invalidateQueries({
        queryKey: getGetBoardQueryKey(boardId),
      });
      onOpenChange(false);
    } catch {
      setError(
        "Cannot delete column. Make sure all tasks are moved or deleted first.",
      );
    }
  };

  const hasTasksWarning = taskCount > 0;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Column</AlertDialogTitle>
          <AlertDialogDescription>
            {hasTasksWarning ? (
              <>
                This column contains <strong>{taskCount}</strong> task
                {taskCount !== 1 ? "s" : ""}. You must move or delete all tasks
                before deleting this column.
              </>
            ) : (
              <>
                Are you sure you want to delete the column "
                <strong>{column.name}</strong>"? This action cannot be undone.
              </>
            )}
          </AlertDialogDescription>
          {error && (
            <p className="text-sm text-destructive mt-2">{error}</p>
          )}
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={hasTasksWarning || deleteColumnMutation.isPending}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {deleteColumnMutation.isPending ? "Deleting..." : "Delete"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
