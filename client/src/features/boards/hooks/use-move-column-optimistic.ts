import { useMutation, useQueryClient } from "@tanstack/react-query";
import { moveColumn } from "@/api/gen/endpoints/column-controller/column-controller";
import { getGetBoardQueryKey } from "@/api/gen/endpoints/board-controller/board-controller";
import { useBoardWebSocket } from "../context/board-websocket-context";
import type { BoardDto, MoveColumnRequest } from "@/api/gen/model";
import { handleMutationAuthError } from "@/features/auth/route-auth";

interface UseMoveColumnOptimisticParams {
  boardId: string;
  columnId: string;
  newPosition: number;
}

export const useMoveColumnOptimistic = (boardId: string) => {
  const queryClient = useQueryClient();
  const ws = useBoardWebSocket();

  return useMutation({
    mutationFn: async ({
      columnId,
      newPosition,
    }: UseMoveColumnOptimisticParams) => {
      const data: MoveColumnRequest = {
        newPosition,
      };
      return moveColumn(boardId, columnId, data);
    },

    onMutate: async ({ columnId, newPosition }) => {
      ws?.registerPendingMutation(columnId);

      await queryClient.cancelQueries({
        queryKey: getGetBoardQueryKey(boardId),
      });

      const previousBoard = queryClient.getQueryData<{ data: BoardDto }>(
        getGetBoardQueryKey(boardId),
      );

      queryClient.setQueryData<{ data: BoardDto }>(
        getGetBoardQueryKey(boardId),
        (old) => {
          if (!old) return old;

          const columns = old.data.columns || [];
          const activeColumns = columns.filter((column) => !column.isArchived);
          const archivedColumns = columns.filter((column) => column.isArchived);
          const columnIndex = activeColumns.findIndex((c) => c.id === columnId);

          if (columnIndex === -1) return old;

          const column = activeColumns[columnIndex];
          const oldPosition = column.position;

          if (oldPosition === newPosition) {
            return old;
          }

          const updatedColumn = {
            ...column,
            position: newPosition,
          };

          const otherColumns = activeColumns.filter((c) => c.id !== columnId);

          const updatedColumns = otherColumns.map((c) => {
            if (newPosition < oldPosition) {
              if (c.position >= newPosition && c.position < oldPosition) {
                return { ...c, position: c.position + 1 };
              }
            } else {
              if (c.position <= newPosition && c.position > oldPosition) {
                return { ...c, position: c.position - 1 };
              }
            }
            return c;
          });

          const finalColumns = [
            ...updatedColumns,
            updatedColumn,
            ...archivedColumns,
          ].sort((a, b) => a.position - b.position);

          return {
            ...old,
            data: {
              ...old.data,
              columns: finalColumns,
            },
          };
        },
      );

      return { previousBoard };
    },

    onError: (error, _variables, context) => {
      if (context?.previousBoard) {
        queryClient.setQueryData(
          getGetBoardQueryKey(boardId),
          context.previousBoard,
        );
      }
      handleMutationAuthError(error);
    },

    onSettled: (_data, error, variables) => {
      ws?.clearPendingMutation(variables.columnId);
      if (error) {
        queryClient.invalidateQueries({
          queryKey: getGetBoardQueryKey(boardId),
        });
      }
    },
  });
};
