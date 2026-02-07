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
  TouchSensor,
} from "@dnd-kit/core";
import {
  arrayMove,
  sortableKeyboardCoordinates,
  SortableContext,
  horizontalListSortingStrategy,
} from "@dnd-kit/sortable";
import { useState, useCallback, useMemo } from "react";
import { TaskItem } from "@/features/tasks/components/task-item";
import { useMoveTaskOptimistic } from "../hooks/use-move-task-optimistic";
import { useMoveColumnOptimistic } from "../hooks/use-move-column-optimistic";
import { ItemOverlay } from "@/features/tasks/components/item-overlay";
import { SortableColumn } from "./sortable-column";
import { AddColumnButton } from "./add-column-button";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";

interface KanbanBoardProps {
  columns: ColumnDto[];
  tasks: TaskSummaryDto[];
  boardId: string;
}

type DragItemType = "task" | "column";

interface ActiveItem {
  id: UniqueIdentifier;
  type: DragItemType;
  data: TaskSummaryDto | ColumnDto;
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
      .sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
  });
  return map;
};

export const KanbanBoard = ({ columns, tasks, boardId }: KanbanBoardProps) => {
  const [activeItem, setActiveItem] = useState<ActiveItem | null>(null);

  // Temporary state for drag preview - persists until mutation settles
  const [tempTasks, setTempTasks] = useState<TaskSummaryDto[] | null>(null);
  const [tempColumns, setTempColumns] = useState<ColumnDto[] | null>(null);

  // Use temp state during/after drag, fall back to props
  const displayTasks = tempTasks ?? tasks;
  const displayColumns = tempColumns ?? columns;

  const moveTaskMutation = useMoveTaskOptimistic(boardId);
  const moveColumnMutation = useMoveColumnOptimistic(boardId);

  // Configure sensors with activation constraints to avoid conflicts with clicks
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 200,
        tolerance: 5,
      },
    }),
  );

  // Sort columns by position (memoized to avoid re-sorting on every render)
  const sortedColumns = useMemo(
    () => [...displayColumns].sort((a, b) => a.position - b.position),
    [displayColumns],
  );

  // Column IDs for sortable context
  const columnIds = useMemo(
    () => sortedColumns.map((col) => col.id),
    [sortedColumns],
  );

  // Group tasks by column using display state for live preview (memoized)
  const columnTasksMap = useMemo(
    () => groupTasksByColumn(displayTasks, sortedColumns),
    [displayTasks, sortedColumns],
  );

  // Determine if an ID belongs to a column or a task
  const getItemType = useCallback(
    (id: UniqueIdentifier): DragItemType | null => {
      if (columns.some((col) => col.id === id)) return "column";
      if (tasks.some((task) => task.id === id)) return "task";
      return null;
    },
    [columns, tasks],
  );

  // Find which column contains a given task (uses displayTasks for preview)
  const findColumnByTaskId = useCallback(
    (taskId: UniqueIdentifier): string | undefined => {
      return displayTasks.find((task) => task.id === taskId)?.columnId;
    },
    [displayTasks],
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
    const type = getItemType(active.id);

    if (type === "task") {
      const task = tasks.find((t) => t.id === active.id);
      if (task) {
        setActiveItem({ id: active.id, type: "task", data: task });
        setTempTasks(tasks);
      }
    } else if (type === "column") {
      const column = columns.find((c) => c.id === active.id);
      if (column) {
        setActiveItem({ id: active.id, type: "column", data: column });
        setTempColumns(columns);
      }
    }
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over || !activeItem) return;

    // Only handle task cross-column moves here
    if (activeItem.type !== "task") return;

    const activeColumnId = findColumnByTaskId(active.id);
    const overType = getItemType(over.id);

    // Determine the target column
    let overColumnId: string | undefined;
    if (overType === "column") {
      overColumnId = over.id as string;
    } else if (overType === "task") {
      overColumnId = findColumnByTaskId(over.id);
    }

    if (!activeColumnId || !overColumnId) return;

    // Same column - let SortableContext handle it
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
    const currentActiveItem = activeItem;

    setActiveItem(null);

    if (!over || !currentActiveItem) {
      setTempTasks(null);
      setTempColumns(null);
      return;
    }

    // Handle column reorder
    if (currentActiveItem.type === "column") {
      const activeIndex = sortedColumns.findIndex((c) => c.id === active.id);
      const overIndex = sortedColumns.findIndex((c) => c.id === over.id);

      if (activeIndex !== -1 && overIndex !== -1 && activeIndex !== overIndex) {
        // Update temp state for final position
        const newColumns = arrayMove(sortedColumns, activeIndex, overIndex).map(
          (col, index) => ({ ...col, position: index }),
        );
        setTempColumns(newColumns);

        // Call mutation
        await moveColumnMutation.mutateAsync({
          boardId,
          columnId: active.id as string,
          newPosition: overIndex,
        });
      }

      setTempColumns(null);
      return;
    }

    // Handle task reorder
    if (currentActiveItem.type === "task") {
      const originalColumnId = findOriginalColumnByTaskId(active.id);
      const overType = getItemType(over.id);
      let overColumnId: string | undefined;

      if (overType === "column") {
        overColumnId = over.id as string;
      } else if (overType === "task") {
        overColumnId = findColumnByTaskId(over.id);
      }

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

          // Compute neighbor IDs from the reordered list
          const afterTaskId =
            overIndex > 0 ? newColumnTasks[overIndex - 1].id : undefined;
          const beforeTaskId =
            overIndex < newColumnTasks.length - 1
              ? newColumnTasks[overIndex + 1].id
              : undefined;

          // Call mutation
          await moveTaskMutation.mutateAsync({
            boardId,
            taskId: active.id as string,
            newColumnId: originalColumnId,
            afterTaskId,
            beforeTaskId,
          });
        }
      } else if (originalColumnId !== overColumnId) {
        // Cross-column move - temp state already updated in handleDragOver
        const destColumnTasks = columnTasksMap[overColumnId] || [];
        const taskIndexInDest = destColumnTasks.findIndex(
          (t) => t.id === active.id,
        );
        const dropIndex =
          taskIndexInDest === -1 ? destColumnTasks.length : taskIndexInDest;

        // Compute neighbor IDs (excluding the moved task itself)
        const otherDestTasks = destColumnTasks.filter(
          (t) => t.id !== active.id,
        );
        const afterTaskId =
          dropIndex > 0 ? otherDestTasks[dropIndex - 1]?.id : undefined;
        const beforeTaskId = otherDestTasks[dropIndex]?.id;

        await moveTaskMutation.mutateAsync({
          boardId,
          taskId: active.id as string,
          newColumnId: overColumnId,
          afterTaskId,
          beforeTaskId,
        });
      }

      setTempTasks(null);
    }
  };

  const handleDragCancel = () => {
    setActiveItem(null);
    setTempTasks(null);
    setTempColumns(null);
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
            <SortableContext
              items={columnIds}
              strategy={horizontalListSortingStrategy}
            >
              {sortedColumns.map((column) => (
                <SortableColumn
                  key={column.id}
                  column={column}
                  tasks={columnTasksMap[column.id] || []}
                  boardId={boardId}
                />
              ))}
            </SortableContext>
            <div className="pr-4">
              <AddColumnButton boardId={boardId} />
            </div>
          </div>
        </div>
      </div>
      <DragOverlay
        dropAnimation={{
          duration: 150,
          easing: "cubic-bezier(0.2, 0, 0, 1)",
        }}
      >
        {activeItem?.type === "task" ? (
          <ItemOverlay>
            <TaskItem
              task={activeItem.data as TaskSummaryDto}
              boardId={boardId}
            />
          </ItemOverlay>
        ) : activeItem?.type === "column" ? (
          <ItemOverlay>
            <Card className="h-fit gap-2 opacity-90 sm:min-w-3xs">
              <CardHeader>
                <CardTitle className="text-base">
                  {(activeItem.data as ColumnDto).name}
                </CardTitle>
              </CardHeader>
            </Card>
          </ItemOverlay>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
};
