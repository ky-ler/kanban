import type { ColumnDto, TaskSummaryDto } from "@/api/gen/model";
import {
  DndContext,
  type DragEndEvent,
  DragOverlay,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  closestCenter,
  type DragStartEvent,
  type DragOverEvent,
  type UniqueIdentifier,
} from "@dnd-kit/core";
import { arrayMove, sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import { useState, useCallback } from "react";
import { KanbanColumn } from "./kanban-column";
import { TaskItem } from "@/features/tasks/components/task-item";
import { useMoveTaskOptimistic } from "../hooks/use-move-task-optimistic";
import { ItemOverlay } from "@/features/tasks/components/item-overlay";

interface KanbanBoardProps {
  columns: ColumnDto[];
  tasks: TaskSummaryDto[];
  boardId: string;
}

// Group tasks by column ID
const groupTasksByColumn = (
  tasks: TaskSummaryDto[],
  columns: ColumnDto[],
): Record<string, TaskSummaryDto[]> => {
  const map: Record<string, TaskSummaryDto[]> = {};
  columns.forEach((column) => {
    map[column.id] = tasks
      .filter((task) => task.columnId === column.id)
      .sort((a, b) => a.position - b.position);
  });
  return map;
};

export const KanbanBoard = ({ columns, tasks, boardId }: KanbanBoardProps) => {
  const [activeId, setActiveId] = useState<UniqueIdentifier | null>(null);
  const [activeTask, setActiveTask] = useState<TaskSummaryDto | null>(null);

  // Temporary state for drag preview - persists until mutation settles
  const [tempTasks, setTempTasks] = useState<TaskSummaryDto[] | null>(null);

  // Use tempTasks during/after drag, fall back to props
  const displayTasks = tempTasks ?? tasks;

  const moveTaskMutation = useMoveTaskOptimistic(boardId);

  // Configure sensors with activation constraints to avoid conflicts with clicks
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        delay: 100,
        tolerance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  // Sort columns by position
  const sortedColumns = [...columns].sort((a, b) => a.position - b.position);

  // Group tasks by column using display state for live preview
  const columnTasksMap = groupTasksByColumn(displayTasks, sortedColumns);

  // Find which column contains a given task or column ID (uses displayTasks for preview)
  const findColumnByItemId = useCallback(
    (itemId: UniqueIdentifier): string | undefined => {
      // Check if it's a column ID
      if (columns.some((col) => col.id === itemId)) {
        return itemId as string;
      }
      // Find the column containing this task
      return displayTasks.find((task) => task.id === itemId)?.columnId;
    },
    [columns, displayTasks],
  );

  // Find original column from props (not affected by drag preview state)
  const findOriginalColumnByTaskId = useCallback(
    (taskId: UniqueIdentifier): string | undefined => {
      return tasks.find((task) => task.id === taskId)?.columnId;
    },
    [tasks],
  );

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    setActiveId(active.id);
    // Initialize tempTasks from current tasks on drag start
    setTempTasks(tasks);
    const task = tasks.find((t) => t.id === active.id);
    setActiveTask(task ?? null);
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over) return;

    const activeColumnId = findColumnByItemId(active.id);
    const overColumnId = findColumnByItemId(over.id);

    if (!activeColumnId || !overColumnId) return;

    // Same column, same item - no action needed
    if (activeColumnId === overColumnId && active.id === over.id) return;

    // Same column reorder is handled by SortableContext, skip here
    if (activeColumnId === overColumnId) return;

    // Cross-column move: update temp state for preview
    setTempTasks((prevTasks) => {
      if (!prevTasks) return prevTasks;

      const activeTaskItem = prevTasks.find((t) => t.id === active.id);
      if (!activeTaskItem) return prevTasks;

      // Remove task from current position
      const tasksWithoutActive = prevTasks.filter((t) => t.id !== active.id);

      // Create updated task with new column
      const updatedTask: TaskSummaryDto = {
        ...activeTaskItem,
        columnId: overColumnId,
      };

      // If dropping on a column (empty area), add to end
      if (over.id === overColumnId) {
        return [...tasksWithoutActive, updatedTask];
      }

      // If dropping on a task, insert at that position
      const overTaskIndex = tasksWithoutActive.findIndex(
        (t) => t.id === over.id,
      );
      if (overTaskIndex === -1) {
        return [...tasksWithoutActive, updatedTask];
      }

      // Insert before the over task
      return [
        ...tasksWithoutActive.slice(0, overTaskIndex),
        updatedTask,
        ...tasksWithoutActive.slice(overTaskIndex),
      ];
    });
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    setActiveId(null);
    setActiveTask(null);

    if (!over) {
      setTempTasks(null); // Reset to props
      return;
    }

    // Use ORIGINAL column from props to detect actual change
    const originalColumnId = findOriginalColumnByTaskId(active.id);
    const overColumnId = findColumnByItemId(over.id);

    if (!originalColumnId || !overColumnId) {
      setTempTasks(null);
      return;
    }

    // Same column reorder
    if (originalColumnId === overColumnId && active.id !== over.id) {
      const columnTasks = columnTasksMap[originalColumnId] || [];
      const activeIndex = columnTasks.findIndex((t) => t.id === active.id);
      const overIndex = columnTasks.findIndex((t) => t.id === over.id);

      if (activeIndex !== -1 && overIndex !== -1) {
        const newColumnTasks = arrayMove(
          columnTasks,
          activeIndex,
          overIndex,
        ).map((task, index) => ({
          ...task,
          columnId: originalColumnId,
          position: index,
        }));

        // Update temp state for final position
        setTempTasks((prevTasks) => {
          if (!prevTasks) return prevTasks;
          const otherTasks = prevTasks.filter(
            (t) => t.columnId !== originalColumnId,
          );
          return [...otherTasks, ...newColumnTasks];
        });

        // Call mutation and wait for it to settle
        await moveTaskMutation.mutateAsync({
          boardId,
          taskId: active.id as string,
          newColumnId: originalColumnId,
          newPosition: overIndex,
        });
      }
    } else if (originalColumnId !== overColumnId) {
      // Cross-column move - temp state already updated in handleDragOver
      // Calculate final position from the current display state
      const destColumnTasks = columnTasksMap[overColumnId] || [];

      // Find where the task is now in the destination column
      const taskIndexInDest = destColumnTasks.findIndex(
        (t) => t.id === active.id,
      );
      const newPosition =
        taskIndexInDest === -1 ? destColumnTasks.length : taskIndexInDest;

      // Call mutation and wait for it to settle
      await moveTaskMutation.mutateAsync({
        boardId,
        taskId: active.id as string,
        newColumnId: overColumnId,
        newPosition,
      });
    }

    // Clear temp state after mutation settles - falls back to React Query cache
    setTempTasks(null);
  };

  const handleDragCancel = () => {
    setActiveId(null);
    setActiveTask(null);
    setTempTasks(null); // Reset to props on cancel
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <div className="flex grow px-4">
        <div className="-mx-4 overflow-x-auto">
          <div className="flex space-x-4 px-4">
            {sortedColumns.map((column) => (
              <KanbanColumn
                key={column.id}
                column={column}
                tasks={columnTasksMap[column.id] || []}
                boardId={boardId}
              />
            ))}
          </div>
        </div>
      </div>
      <DragOverlay
        dropAnimation={{
          duration: 150,
          easing: "cubic-bezier(0.2, 0, 0, 1)",
        }}
      >
        {activeId && activeTask ? (
          <ItemOverlay>
            <TaskItem task={activeTask} boardId={boardId} />
          </ItemOverlay>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
};
