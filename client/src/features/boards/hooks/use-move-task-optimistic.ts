import { useMutation, useQueryClient } from "@tanstack/react-query";
import { moveTask } from "@/api/gen/endpoints/task-controller/task-controller";
import { getGetBoardQueryKey } from "@/api/gen/endpoints/board-controller/board-controller";
import type { BoardDto, MoveTaskRequest } from "@/api/gen/model";

interface UseMoveTaskOptimisticParams {
  boardId: string;
  taskId: string;
  newColumnId: string;
  newPosition: number;
}

export const useMoveTaskOptimistic = (boardId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      taskId,
      newColumnId,
      newPosition,
    }: UseMoveTaskOptimisticParams) => {
      const data: MoveTaskRequest = {
        newPosition,
        newColumnId,
      };
      return moveTask(taskId, data);
    },

    onMutate: async ({ taskId, newColumnId, newPosition }) => {
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
          const taskIndex = tasks.findIndex((t) => t.id === taskId);

          if (taskIndex === -1) return old;

          const task = tasks[taskIndex];
          const oldColumnId = task.columnId;

          // If moving to same column and same position, no update needed
          if (oldColumnId === newColumnId && task.position === newPosition) {
            return old;
          }

          // Create new task with updated position/column
          const updatedTask = {
            ...task,
            columnId: newColumnId,
            position: newPosition,
          };

          // Filter out the task being moved
          const otherTasks = tasks.filter((t) => t.id !== taskId);

          // Recalculate positions for affected tasks
          let updatedTasks = otherTasks;

          // If cross-column move, adjust source column positions
          if (oldColumnId !== newColumnId) {
            updatedTasks = updatedTasks.map((t) => {
              if (t.columnId === oldColumnId && t.position > task.position) {
                return { ...t, position: t.position - 1 };
              }
              return t;
            });
          }

          // Adjust destination column positions
          updatedTasks = updatedTasks.map((t) => {
            if (t.columnId === newColumnId) {
              if (oldColumnId === newColumnId) {
                // Same column reorder
                if (newPosition < task.position) {
                  // Moving up
                  if (t.position >= newPosition && t.position < task.position) {
                    return { ...t, position: t.position + 1 };
                  }
                } else {
                  // Moving down
                  if (t.position <= newPosition && t.position > task.position) {
                    return { ...t, position: t.position - 1 };
                  }
                }
              } else {
                // Cross-column move
                if (t.position >= newPosition) {
                  return { ...t, position: t.position + 1 };
                }
              }
            }
            return t;
          });

          // Add the moved task and sort by position
          const finalTasks = [...updatedTasks, updatedTask].sort(
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

    onSettled: () => {
      // Always refetch after mutation (success or error) to ensure consistency
      queryClient.invalidateQueries({
        queryKey: getGetBoardQueryKey(boardId),
      });
    },
  });
};
