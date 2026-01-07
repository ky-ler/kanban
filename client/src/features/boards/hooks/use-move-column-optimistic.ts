import { useMutation, useQueryClient } from "@tanstack/react-query";
import { moveColumn } from "@/api/gen/endpoints/column-controller/column-controller";
import { getGetBoardQueryKey } from "@/api/gen/endpoints/board-controller/board-controller";
import type { BoardDto, MoveColumnRequest } from "@/api/gen/model";

interface UseMoveColumnOptimisticParams {
  boardId: string;
  columnId: string;
  newPosition: number;
}

export const useMoveColumnOptimistic = (boardId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ columnId, newPosition }: UseMoveColumnOptimisticParams) => {
      const data: MoveColumnRequest = {
        newPosition,
      };
      return moveColumn(boardId, columnId, data);
    },

    onMutate: async ({ columnId, newPosition }) => {
      // Cancel any outgoing refetches to avoid overwriting optimistic update
      await queryClient.cancelQueries({
        queryKey: getGetBoardQueryKey(boardId),
      });

      // Snapshot the previous value
      const previousBoard = queryClient.getQueryData<{ data: BoardDto }>(
        getGetBoardQueryKey(boardId),
      );

      // Optimistically update the cache
      queryClient.setQueryData<{ data: BoardDto }>(
        getGetBoardQueryKey(boardId),
        (old) => {
          if (!old) return old;

          const columns = old.data.columns || [];
          const columnIndex = columns.findIndex((c) => c.id === columnId);

          if (columnIndex === -1) return old;

          const column = columns[columnIndex];
          const oldPosition = column.position;

          // If moving to same position, no update needed
          if (oldPosition === newPosition) {
            return old;
          }

          // Create new column with updated position
          const updatedColumn = {
            ...column,
            position: newPosition,
          };

          // Filter out the column being moved
          const otherColumns = columns.filter((c) => c.id !== columnId);

          // Recalculate positions for affected columns
          const updatedColumns = otherColumns.map((c) => {
            if (newPosition < oldPosition) {
              // Moving left: shift columns in range [newPosition, oldPosition) right
              if (c.position >= newPosition && c.position < oldPosition) {
                return { ...c, position: c.position + 1 };
              }
            } else {
              // Moving right: shift columns in range (oldPosition, newPosition] left
              if (c.position <= newPosition && c.position > oldPosition) {
                return { ...c, position: c.position - 1 };
              }
            }
            return c;
          });

          // Add the moved column and sort by position
          const finalColumns = [...updatedColumns, updatedColumn].sort(
            (a, b) => a.position - b.position,
          );

          return {
            ...old,
            data: {
              ...old.data,
              columns: finalColumns,
            },
          };
        },
      );

      // Return context with snapshot for rollback
      return { previousBoard };
    },

    onError: (_err, _variables, context) => {
      // Rollback to previous state on error
      if (context?.previousBoard) {
        queryClient.setQueryData(
          getGetBoardQueryKey(boardId),
          context.previousBoard,
        );
      }
    },

    onSettled: () => {
      // Always refetch after mutation (success or error) to ensure consistency
      queryClient.invalidateQueries({
        queryKey: getGetBoardQueryKey(boardId),
      });
    },
  });
};
