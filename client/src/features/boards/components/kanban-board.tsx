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

interface ColumnDropPreview {
  overColumnId: string;
  placement: "before" | "after";
}

interface TaskDropPreview {
  overTaskId: string;
  placement: "before" | "after";
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
  const [columnDropPreview, setColumnDropPreview] =
    useState<ColumnDropPreview | null>(null);
  const [taskDropPreview, setTaskDropPreview] =
    useState<TaskDropPreview | null>(null);

  const [tempTasks, setTempTasks] = useState<TaskSummaryDto[] | null>(null);
  const [tempColumns, setTempColumns] = useState<ColumnDto[] | null>(null);

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

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const type = getItemType(active.id);

    if (type === "task") {
      const task = tasks.find((t) => t.id === active.id);
      if (task) {
        setActiveItem({ id: active.id, type: "task", data: task });
        setTempTasks(tasks);
        setTaskDropPreview(null);
      }
    } else if (type === "column") {
      const column = columns.find((c) => c.id === active.id);
      if (column) {
        setActiveItem({ id: active.id, type: "column", data: column });
        setTempColumns(columns);
        setColumnDropPreview(null);
      }
    }
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over || !activeItem) return;

    if (activeItem.type === "column") {
      const overColumnId = resolveOverColumnId(over);
      const activeIndex = sortedColumns.findIndex(
        (column) => column.id === active.id,
      );
      const overIndex = sortedColumns.findIndex(
        (column) => column.id === overColumnId,
      );

      if (
        !overColumnId ||
        activeIndex === -1 ||
        overIndex === -1 ||
        activeIndex === overIndex
      ) {
        setColumnDropPreview(null);
        return;
      }

      setColumnDropPreview({
        overColumnId,
        placement: activeIndex < overIndex ? "after" : "before",
      });
      return;
    }

    const activeColumnId = findColumnByTaskId(active.id);
    const overColumnId = resolveOverColumnId(over);

    if (!activeColumnId || !overColumnId) return;

    const overType = getItemType(over.id);
    if (overType === "task" && over.id !== active.id) {
      const overColumnTasks = columnTasksMap[overColumnId] || [];
      const activeIndex = overColumnTasks.findIndex((t) => t.id === active.id);
      const overIndex = overColumnTasks.findIndex((t) => t.id === over.id);
      setTaskDropPreview({
        overTaskId: over.id as string,
        placement:
          activeIndex !== -1 && activeIndex < overIndex ? "after" : "before",
      });
    } else if (overType !== "task") {
      setTaskDropPreview(null);
    }

    if (activeColumnId === overColumnId) return;

    setTempTasks((prevTasks) => {
      if (!prevTasks) return prevTasks;

      const activeTaskItem = prevTasks.find((t) => t.id === active.id);
      if (!activeTaskItem) return prevTasks;

      const tasksWithoutActive = prevTasks.filter((t) => t.id !== active.id);

      const updatedTask: TaskSummaryDto = {
        ...activeTaskItem,
        columnId: overColumnId,
      };

      if (over.id === overColumnId) {
        return [...tasksWithoutActive, updatedTask];
      }

      const overTaskIndex = tasksWithoutActive.findIndex(
        (t) => t.id === over.id,
      );
      if (overTaskIndex === -1) {
        return [...tasksWithoutActive, updatedTask];
      }

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
    setTaskDropPreview(null);

    if (!over || !currentActiveItem) {
      setTempTasks(null);
      setTempColumns(null);
      setColumnDropPreview(null);
      return;
    }

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
      setColumnDropPreview(null);
      return;
    }

    if (currentActiveItem.type === "task") {
      const originalColumnId = findOriginalColumnByTaskId(active.id);
      const overColumnId = resolveOverColumnId(over);

      if (!originalColumnId || !overColumnId) {
        setTempTasks(null);
        return;
      }

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

          setTempTasks((prevTasks) => {
            if (!prevTasks) return prevTasks;
            const otherTasks = prevTasks.filter(
              (t) => t.columnId !== originalColumnId,
            );
            return [...otherTasks, ...newColumnTasks];
          });

          const afterTaskId =
            overIndex > 0 ? newColumnTasks[overIndex - 1].id : undefined;
          const beforeTaskId =
            overIndex < newColumnTasks.length - 1
              ? newColumnTasks[overIndex + 1].id
              : undefined;

          try {
            await moveTaskMutation.mutateAsync({
              boardId,
              taskId: active.id as string,
              newColumnId: originalColumnId,
              afterTaskId,
              beforeTaskId,
            });
          } catch {
            // Mutation hook handles rollback/auth redirect.
          }
        }
      } else if (originalColumnId !== overColumnId) {
        const destColumnTasks = columnTasksMap[overColumnId] || [];
        const taskIndexInDest = destColumnTasks.findIndex(
          (t) => t.id === active.id,
        );
        const dropIndex =
          taskIndexInDest === -1 ? destColumnTasks.length : taskIndexInDest;

        const otherDestTasks = destColumnTasks.filter(
          (t) => t.id !== active.id,
        );
        const afterTaskId =
          dropIndex > 0 ? otherDestTasks[dropIndex - 1]?.id : undefined;
        const beforeTaskId = otherDestTasks[dropIndex]?.id;

        try {
          await moveTaskMutation.mutateAsync({
            boardId,
            taskId: active.id as string,
            newColumnId: overColumnId,
            afterTaskId,
            beforeTaskId,
          });
        } catch {
          // Mutation hook handles rollback/auth redirect.
        }
      }

      setTempTasks(null);
    }

    setColumnDropPreview(null);
  };

  const handleDragCancel = () => {
    setActiveItem(null);
    setTempTasks(null);
    setTempColumns(null);
    setColumnDropPreview(null);
    setTaskDropPreview(null);
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
                  dropIndicator={
                    columnDropPreview?.overColumnId === column.id
                      ? columnDropPreview.placement
                      : null
                  }
                  taskDropPreview={taskDropPreview}
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
