import { useMemo, type HTMLAttributes } from "react";
import type { CollaboratorDto } from "@/api/gen/model";
import {
  DndContext,
  type DragEndEvent,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  useCreateChecklistItem,
  useDeleteChecklistItem,
  useGetChecklistItems,
  getGetChecklistItemsQueryKey,
  useToggleChecklistItem,
  useUpdateChecklistItem,
  useReorderChecklistItem,
} from "@/api/gen/endpoints/checklist-item-controller/checklist-item-controller";
import { getGetBoardQueryKey } from "@/api/gen/endpoints/board-controller/board-controller";
import { getGetTaskQueryKey } from "@/api/gen/endpoints/task-controller/task-controller";
import { useQueryClient } from "@tanstack/react-query";
import { IconListCheck } from "@tabler/icons-react";
import { toast } from "sonner";
import { ChecklistItem } from "./checklist-item";
import { ChecklistInput } from "./checklist-input";
import { ChecklistProgress } from "./checklist-progress";

interface ChecklistSectionProps {
  boardId: string;
  taskId: string;
  collaborators: CollaboratorDto[];
  disabled?: boolean;
}

function SortableChecklistRow({
  id,
  children,
}: {
  id: string;
  children: (
    dragHandleProps: HTMLAttributes<HTMLButtonElement>,
  ) => React.ReactNode;
}) {
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({
      id,
    });

  return (
    <div
      ref={setNodeRef}
      className="min-w-0"
      style={{ transform: CSS.Transform.toString(transform), transition }}
    >
      {children({ ...attributes, ...listeners })}
    </div>
  );
}

export function ChecklistSection({
  boardId,
  taskId,
  collaborators,
  disabled = false,
}: ChecklistSectionProps) {
  const queryClient = useQueryClient();

  const { data, isLoading } = useGetChecklistItems(boardId, taskId);
  const items = useMemo(
    () =>
      [...(data?.data ?? [])].sort(
        (a, b) =>
          (a.position ?? Number.MAX_SAFE_INTEGER) -
          (b.position ?? Number.MAX_SAFE_INTEGER),
      ),
    [data?.data],
  );

  const progress = useMemo(() => {
    const total = items.length;
    const completed = items.filter((item) => item.isCompleted).length;
    return { total, completed };
  }, [items]);

  const invalidateChecklist = () => {
    queryClient.invalidateQueries({
      queryKey: getGetChecklistItemsQueryKey(boardId, taskId),
    });
    queryClient.invalidateQueries({
      queryKey: getGetTaskQueryKey(taskId),
    });
    queryClient.invalidateQueries({
      queryKey: getGetBoardQueryKey(boardId),
    });
  };

  const createMutation = useCreateChecklistItem({
    mutation: {
      onSuccess: () => {
        invalidateChecklist();
      },
      onError: () => toast.error("Failed to create checklist item"),
    },
  });

  const toggleMutation = useToggleChecklistItem({
    mutation: {
      onSuccess: () => {
        invalidateChecklist();
      },
      onError: () => toast.error("Failed to update checklist item"),
    },
  });

  const updateMutation = useUpdateChecklistItem({
    mutation: {
      onSuccess: () => {
        invalidateChecklist();
      },
      onError: () => toast.error("Failed to update checklist item"),
    },
  });

  const deleteMutation = useDeleteChecklistItem({
    mutation: {
      onSuccess: () => {
        invalidateChecklist();
      },
      onError: () => toast.error("Failed to delete checklist item"),
    },
  });

  const reorderMutation = useReorderChecklistItem({
    mutation: {
      onSuccess: () => {
        invalidateChecklist();
      },
      onError: () => toast.error("Failed to reorder checklist item"),
    },
  });

  const sensors = useSensors(
    useSensor(MouseSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 150, tolerance: 5 },
    }),
  );

  const handleCreate = (title: string) => {
    createMutation.mutate({
      boardId,
      taskId,
      data: { title, isCompleted: false },
    });
  };

  const handleToggle = (itemId: string) => {
    toggleMutation.mutate({ boardId, taskId, itemId });
  };

  const handleDelete = (itemId: string) => {
    deleteMutation.mutate({ boardId, taskId, itemId });
  };

  const handleUpdate = (
    itemId: string,
    overrides: Partial<{
      title: string;
      dueDate?: string;
      assigneeId?: string;
    }>,
  ) => {
    const current = items.find((item) => item.id === itemId);
    if (!current) {
      return;
    }

    const assigneeId =
      "assigneeId" in overrides ? overrides.assigneeId : current.assignedTo?.id;
    const dueDate =
      "dueDate" in overrides ? overrides.dueDate : current.dueDate;

    updateMutation.mutate({
      boardId,
      taskId,
      itemId,
      data: {
        title: overrides.title ?? current.title,
        isCompleted: current.isCompleted,
        dueDate,
        assigneeId,
      },
    });
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) {
      return;
    }
    const oldIndex = items.findIndex((item) => item.id === active.id);
    const newIndex = items.findIndex((item) => item.id === over.id);
    if (oldIndex < 0 || newIndex < 0) {
      return;
    }

    const reordered = arrayMove(items, oldIndex, newIndex);
    const moved = reordered[newIndex];
    if (!moved) {
      return;
    }

    const previousPosition = reordered[newIndex - 1]?.position ?? 0;
    const nextPosition = reordered[newIndex + 1]?.position;
    let newPosition: number;

    if (nextPosition == null) {
      newPosition = previousPosition + 1_000_000;
    } else if (previousPosition <= 0) {
      newPosition = Math.max(1, Math.floor(nextPosition / 2));
    } else {
      newPosition = Math.floor((previousPosition + nextPosition) / 2);
    }

    if (
      newPosition === previousPosition ||
      (nextPosition != null && newPosition === nextPosition)
    ) {
      newPosition = (newIndex + 1) * 1_000_000;
    }

    reorderMutation.mutate({
      boardId,
      taskId,
      itemId: moved.id,
      data: { newPosition },
    });
  };

  return (
    <div>
      <div className="mb-2 flex items-center gap-2">
        <IconListCheck className="text-muted-foreground h-4 w-4" />
        <h3 className="text-muted-foreground font-medium">Checklist</h3>
      </div>

      <div className="space-y-3">
        <ChecklistProgress progress={progress} />
        {!disabled && (
          <ChecklistInput
            onSubmit={handleCreate}
            isPending={createMutation.isPending}
          />
        )}
        {isLoading ? (
          <div className="text-muted-foreground text-sm">
            Loading checklist…
          </div>
        ) : (
          <DndContext
            sensors={sensors}
            onDragEnd={disabled ? () => {} : handleDragEnd}
          >
            <SortableContext
              items={items.map((item) => item.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-2">
                {items.map((item) => (
                  <SortableChecklistRow key={item.id} id={item.id}>
                    {(dragHandleProps) => (
                      <ChecklistItem
                        item={item}
                        collaborators={collaborators}
                        disabled={disabled}
                        isPending={
                          updateMutation.isPending ||
                          toggleMutation.isPending ||
                          deleteMutation.isPending
                        }
                        onToggle={handleToggle}
                        onUpdateTitle={(itemId, title) =>
                          handleUpdate(itemId, { title })
                        }
                        onUpdateAssignee={(itemId, assigneeId) =>
                          handleUpdate(itemId, { assigneeId })
                        }
                        onUpdateDueDate={(itemId, dueDate) =>
                          handleUpdate(itemId, { dueDate })
                        }
                        onDelete={handleDelete}
                        dragHandleProps={dragHandleProps}
                      />
                    )}
                  </SortableChecklistRow>
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}
      </div>
    </div>
  );
}
