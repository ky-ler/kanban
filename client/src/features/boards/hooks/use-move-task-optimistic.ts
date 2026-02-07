import { useMutation, useQueryClient } from "@tanstack/react-query";
import { moveTask } from "@/api/gen/endpoints/task-controller/task-controller";
import { getGetBoardQueryKey } from "@/api/gen/endpoints/board-controller/board-controller";
import { useBoardWebSocket } from "../context/board-websocket-context";
import type { BoardDto, MoveTaskRequest } from "@/api/gen/model";

interface UseMoveTaskOptimisticParams {
  boardId: string;
  taskId: string;
  newColumnId: string;
  afterTaskId?: string;
  beforeTaskId?: string;
}

export const useMoveTaskOptimistic = (boardId: string) => {
  const queryClient = useQueryClient();
  const ws = useBoardWebSocket();

  return useMutation({
    mutationFn: async ({
      taskId,
      newColumnId,
      afterTaskId,
      beforeTaskId,
    }: UseMoveTaskOptimisticParams) => {
      const data: MoveTaskRequest = {
        afterTaskId,
        beforeTaskId,
        newColumnId,
      };
      return moveTask(taskId, data);
    },

    onMutate: async ({ taskId, newColumnId, afterTaskId, beforeTaskId }) => {
      // Register pending mutation to suppress self-triggered WebSocket invalidation
      ws?.registerPendingMutation(taskId);
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

          const tasks = old.data.tasks || [];
          const task = tasks.find((t) => t.id === taskId);
          if (!task) return old;

          // Remove the task from its current position
          const otherTasks = tasks.filter((t) => t.id !== taskId);

          // Get the tasks in the target column, sorted by position
          const targetColumnTasks = otherTasks
            .filter((t) => t.columnId === newColumnId)
            .sort((a, b) => a.position - b.position);

          // Determine the insert index
          let insertIndex: number;
          if (afterTaskId) {
            const afterIndex = targetColumnTasks.findIndex(
              (t) => t.id === afterTaskId,
            );
            insertIndex =
              afterIndex === -1 ? targetColumnTasks.length : afterIndex + 1;
          } else if (beforeTaskId) {
            const beforeIndex = targetColumnTasks.findIndex(
              (t) => t.id === beforeTaskId,
            );
            insertIndex = beforeIndex === -1 ? 0 : beforeIndex;
          } else {
            insertIndex = targetColumnTasks.length;
          }

          // Insert the task and reassign display positions per column
          targetColumnTasks.splice(insertIndex, 0, {
            ...task,
            columnId: newColumnId,
          });

          // Reassign positions for the target column (sequential for display)
          const updatedTargetTasks = targetColumnTasks.map((t, i) => ({
            ...t,
            position: i,
          }));

          // Rebuild the full task list
          const nonTargetTasks = otherTasks.filter(
            (t) => t.columnId !== newColumnId,
          );
          const finalTasks = [...nonTargetTasks, ...updatedTargetTasks].sort(
            (a, b) => a.position - b.position,
          );

          return {
            ...old,
            data: {
              ...old.data,
              tasks: finalTasks,
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

    onSettled: (_data, error, variables) => {
      // Clear pending mutation tracking
      ws?.clearPendingMutation(variables.taskId);
      // Only refetch on error — on success the optimistic cache is already correct
      if (error) {
        queryClient.invalidateQueries({
          queryKey: getGetBoardQueryKey(boardId),
        });
      }
    },
  });
};
