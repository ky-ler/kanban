import type { ColumnDto, TaskSummaryDto } from "@/api/gen/model";
import {
  DndContext,
  type DragEndEvent,
  DragOverlay,
  MouseSensor,
  KeyboardSensor,
  KeyboardCode,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragOverEvent,
  type UniqueIdentifier,
  TouchSensor,
  pointerWithin,
  rectIntersection,
  closestCenter,
  type CollisionDetection,
  getFirstCollision,
  MeasuringStrategy,
} from "@dnd-kit/core";
import {
  arrayMove,
  sortableKeyboardCoordinates,
  SortableContext,
  horizontalListSortingStrategy,
} from "@dnd-kit/sortable";
import { useState, useCallback, useMemo, useRef, useEffect } from "react";
import { TaskItem } from "@/features/tasks/components/task-item";
import { useMoveTaskOptimistic } from "../hooks/use-move-task-optimistic";
import { useMoveColumnOptimistic } from "../hooks/use-move-column-optimistic";
import { ItemOverlay } from "@/features/tasks/components/item-overlay";
import { SortableColumn } from "./sortable-column";
import { AddColumnButton } from "./add-column-button";
import { KanbanColumn } from "./kanban-column";

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

  const [tempTasks, setTempTasks] = useState<TaskSummaryDto[] | null>(null);
  const [tempColumns, setTempColumns] = useState<ColumnDto[] | null>(null);

  // Refs for stable collision detection (per official dnd-kit pattern)
  const lastOverId = useRef<UniqueIdentifier | null>(null);
  const recentlyMovedToNewContainer = useRef(false);

  const displayTasks = tempTasks ?? tasks;
  const displayColumns = tempColumns ?? columns;

  const moveTaskMutation = useMoveTaskOptimistic(boardId);
  const moveColumnMutation = useMoveColumnOptimistic(boardId);

  const sensors = useSensors(
    useSensor(MouseSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
      keyboardCodes: {
        start: [KeyboardCode.Space],
        cancel: [KeyboardCode.Esc],
        end: [KeyboardCode.Space, KeyboardCode.Enter, KeyboardCode.Tab],
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 200,
        tolerance: 5,
      },
    }),
  );

  const sortedColumns = useMemo(
    () => [...displayColumns].sort((a, b) => a.position - b.position),
    [displayColumns],
  );

  const columnIds = useMemo(
    () => sortedColumns.map((col) => col.id),
    [sortedColumns],
  );

  const columnTasksMap = useMemo(
    () => groupTasksByColumn(displayTasks, sortedColumns),
    [displayTasks, sortedColumns],
  );

  const getItemType = useCallback(
    (id: UniqueIdentifier): DragItemType | null => {
      if (columns.some((col) => col.id === id)) return "column";
      if (tasks.some((task) => task.id === id)) return "task";
      return null;
    },
    [columns, tasks],
  );

  const findColumnByTaskId = useCallback(
    (taskId: UniqueIdentifier): string | undefined => {
      return displayTasks.find((task) => task.id === taskId)?.columnId;
    },
    [displayTasks],
  );

  const findOriginalColumnByTaskId = useCallback(
    (taskId: UniqueIdentifier): string | undefined => {
      return tasks.find((task) => task.id === taskId)?.columnId;
    },
    [tasks],
  );

  const resolveOverColumnId = useCallback(
    (
      over: DragOverEvent["over"] | DragEndEvent["over"],
    ): string | undefined => {
      if (!over) {
        return undefined;
      }

      const overType = getItemType(over.id);
      if (overType === "column") {
        return over.id as string;
      }

      if (overType === "task") {
        return (
          findColumnByTaskId(over.id) ?? findOriginalColumnByTaskId(over.id)
        );
      }

      const sortableContainerId = (
        over.data.current as { sortable?: { containerId?: UniqueIdentifier } }
      )?.sortable?.containerId;

      if (!sortableContainerId) {
        return undefined;
      }

      if (sortedColumns.some((column) => column.id === sortableContainerId)) {
        return sortableContainerId as string;
      }

      return (
        findColumnByTaskId(sortableContainerId) ??
        findOriginalColumnByTaskId(sortableContainerId)
      );
    },
    [
      findColumnByTaskId,
      findOriginalColumnByTaskId,
      getItemType,
      sortedColumns,
    ],
  );

  // Reset recentlyMovedToNewContainer after each render to stabilize collision detection
  useEffect(() => {
    requestAnimationFrame(() => {
      recentlyMovedToNewContainer.current = false;
    });
  }, [displayTasks]);

  // Custom collision detection strategy optimized for multiple containers (per official dnd-kit pattern)
  const collisionDetectionStrategy: CollisionDetection = useCallback(
    (args) => {
      // When dragging a column, only consider other columns
      if (activeItem?.type === "column") {
        return closestCenter({
          ...args,
          droppableContainers: args.droppableContainers.filter((container) =>
            columnIds.includes(container.id as string),
          ),
        });
      }

      // For tasks: first find any droppable intersecting with the pointer
      const pointerIntersections = pointerWithin(args);
      const intersections =
        pointerIntersections.length > 0
          ? pointerIntersections
          : rectIntersection(args);
      let overId = getFirstCollision(intersections, "id");

      if (overId != null) {
        // If overId is a column, find the closest task within that column
        if (columnIds.includes(overId as string)) {
          const columnTasks = columnTasksMap[overId as string] || [];
          if (columnTasks.length > 0) {
            const closestTask = closestCenter({
              ...args,
              droppableContainers: args.droppableContainers.filter(
                (container) =>
                  container.id !== overId &&
                  columnTasks.some((task) => task.id === container.id),
              ),
            })[0];
            if (closestTask) {
              overId = closestTask.id;
            }
          }
        }

        lastOverId.current = overId;
        return [{ id: overId }];
      }

      // When task moves to new container, layout shifts and overId may become null
      // Use cached lastOverId to prevent jitter
      if (recentlyMovedToNewContainer.current) {
        lastOverId.current = activeItem?.id ?? null;
      }

      return lastOverId.current ? [{ id: lastOverId.current }] : [];
    },
    [activeItem, columnIds, columnTasksMap],
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

    // Column dragging is finalized on drag end.
    if (activeItem.type === "column") {
      return;
    }

    // Task dragging: only handle cross-column moves (per official dnd-kit pattern)
    // Intra-column reordering is handled by handleDragEnd using arrayMove
    const activeColumnId = findColumnByTaskId(active.id);
    const overColumnId = resolveOverColumnId(over);

    if (!activeColumnId || !overColumnId) return;

    // Skip if still in the same column - let dnd-kit handle visual transforms
    if (activeColumnId === overColumnId) return;

    // Cross-column move: update tempTasks with proper position values
    setTempTasks((prevTasks) => {
      if (!prevTasks) return prevTasks;

      const activeTaskItem = prevTasks.find((t) => t.id === active.id);
      if (!activeTaskItem) return prevTasks;

      const tasksWithoutActive = prevTasks.filter((t) => t.id !== active.id);
      const overColumnTasks = tasksWithoutActive.filter(
        (t) => t.columnId === overColumnId,
      );

      // Determine insertion index using isBelowOverItem check (per official pattern)
      let newIndex: number;
      const overType = getItemType(over.id);

      if (overType === "column" || over.id === overColumnId) {
        // Dropped on empty column or column itself - add at end
        newIndex = overColumnTasks.length;
      } else {
        // Dropped on a task - determine above or below based on cursor position
        const overIndex = overColumnTasks.findIndex((t) => t.id === over.id);
        if (overIndex === -1) {
          newIndex = overColumnTasks.length;
        } else {
          const isBelowOverItem =
            over &&
            active.rect.current.translated &&
            active.rect.current.translated.top >
              over.rect.top + over.rect.height;

          newIndex = isBelowOverItem ? overIndex + 1 : overIndex;
        }
      }

      // Build new task list for the destination column with sequential positions
      const newOverColumnTasks = [
        ...overColumnTasks.slice(0, newIndex),
        { ...activeTaskItem, columnId: overColumnId },
        ...overColumnTasks.slice(newIndex),
      ].map((task, index) => ({ ...task, position: index }));

      // Merge with other columns' tasks
      const otherTasks = tasksWithoutActive.filter(
        (t) => t.columnId !== overColumnId,
      );

      recentlyMovedToNewContainer.current = true;

      return [...otherTasks, ...newOverColumnTasks];
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

    // Column reordering
    if (currentActiveItem.type === "column") {
      const overColumnId = resolveOverColumnId(over);

      const activeIndex = sortedColumns.findIndex((c) => c.id === active.id);
      const overIndex = sortedColumns.findIndex((c) => c.id === overColumnId);

      if (activeIndex !== -1 && overIndex !== -1 && activeIndex !== overIndex) {
        const newColumns = arrayMove(sortedColumns, activeIndex, overIndex).map(
          (col, index) => ({ ...col, position: index }),
        );
        setTempColumns(newColumns);

        try {
          await moveColumnMutation.mutateAsync({
            boardId,
            columnId: active.id as string,
            newPosition: overIndex,
          });
        } catch {
          // Mutation hook handles rollback/auth redirect.
        }
      }

      setTempColumns(null);
      return;
    }

    // Task reordering
    if (currentActiveItem.type === "task") {
      // Find where the task currently is (using tempTasks which reflects cross-column moves)
      const currentColumnId = findColumnByTaskId(active.id);
      const overColumnId = resolveOverColumnId(over);

      if (!currentColumnId || !overColumnId) {
        setTempTasks(null);
        return;
      }

      // Get the current column's tasks from columnTasksMap (which uses displayTasks/tempTasks)
      const columnTasks = columnTasksMap[currentColumnId] || [];
      const activeIndex = columnTasks.findIndex((t) => t.id === active.id);

      // Determine the over index - either from a task or from the column itself
      let overIndex: number;
      const overType = getItemType(over.id);

      if (overType === "task") {
        overIndex = columnTasks.findIndex((t) => t.id === over.id);
      } else {
        // Dropping on column - find position based on where it would land
        overIndex = columnTasks.length - 1;
      }

      // Apply arrayMove for final positioning (handles both same-column and post-cross-column)
      if (activeIndex !== -1 && overIndex !== -1 && activeIndex !== overIndex) {
        const newColumnTasks = arrayMove(
          columnTasks,
          activeIndex,
          overIndex,
        ).map((task, index) => ({
          ...task,
          columnId: currentColumnId,
          position: index,
        }));

        setTempTasks((prevTasks) => {
          if (!prevTasks) return prevTasks;
          const otherTasks = prevTasks.filter(
            (t) => t.columnId !== currentColumnId,
          );
          return [...otherTasks, ...newColumnTasks];
        });

        // Find the task's final position in the reordered array
        const finalIndex = newColumnTasks.findIndex((t) => t.id === active.id);
        const afterTaskId =
          finalIndex > 0 ? newColumnTasks[finalIndex - 1].id : undefined;
        const beforeTaskId =
          finalIndex < newColumnTasks.length - 1
            ? newColumnTasks[finalIndex + 1].id
            : undefined;

        try {
          await moveTaskMutation.mutateAsync({
            boardId,
            taskId: active.id as string,
            newColumnId: currentColumnId,
            afterTaskId,
            beforeTaskId,
          });
        } catch {
          // Mutation hook handles rollback/auth redirect.
        }
      } else if (activeIndex !== -1) {
        // Task is in a new column but position didn't change via arrayMove
        // This happens when cross-column move to a specific position
        const finalIndex = activeIndex;
        const afterTaskId =
          finalIndex > 0 ? columnTasks[finalIndex - 1].id : undefined;
        const beforeTaskId =
          finalIndex < columnTasks.length - 1
            ? columnTasks[finalIndex + 1].id
            : undefined;

        // Check if we actually moved to a different column from the original
        const originalColumnId = findOriginalColumnByTaskId(active.id);
        if (
          originalColumnId !== currentColumnId ||
          afterTaskId ||
          beforeTaskId
        ) {
          try {
            await moveTaskMutation.mutateAsync({
              boardId,
              taskId: active.id as string,
              newColumnId: currentColumnId,
              afterTaskId,
              beforeTaskId,
            });
          } catch {
            // Mutation hook handles rollback/auth redirect.
          }
        }
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
      collisionDetection={collisionDetectionStrategy}
      measuring={{
        droppable: {
          strategy: MeasuringStrategy.Always,
        },
      }}
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
            <div className="opacity-80">
              <KanbanColumn
                column={activeItem.data as ColumnDto}
                tasks={columnTasksMap[(activeItem.data as ColumnDto).id] || []}
                boardId={boardId}
                dragHandleProps={{}}
              />
            </div>
          </ItemOverlay>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
};
