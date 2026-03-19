import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { ColumnDto, TaskSummaryDto } from "@/api/gen/model";
import { KanbanColumn } from "./kanban-column";
import { cn } from "@/lib/utils";

interface TaskDropPreview {
  overTaskId: string;
  placement: "before" | "after";
}

interface SortableColumnProps {
  column: ColumnDto;
  tasks: TaskSummaryDto[];
  boardId: string;
  dropIndicator?: "before" | "after" | null;
  taskDropPreview?: TaskDropPreview | null;
}

export const SortableColumn = ({
  column,
  tasks,
  boardId,
  dropIndicator = null,
  taskDropPreview = null,
}: SortableColumnProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: column.id,
    data: {
      type: "column",
      column,
    },
    transition: {
      duration: 150,
      easing: "cubic-bezier(0.2, 0, 0, 1)",
    },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition: isDragging ? undefined : transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "relative shrink-0",
        isDragging && "opacity-40",
        dropIndicator &&
          "after:bg-primary/90 after:absolute after:inset-y-6 after:w-1 after:rounded-full after:shadow-[0_0_0_4px_var(--color-background)] after:content-['']",
        dropIndicator === "before" && "after:-left-2",
        dropIndicator === "after" && "after:-right-2",
      )}
    >
      <KanbanColumn
        column={column}
        tasks={tasks}
        boardId={boardId}
        dragHandleProps={{ ...attributes, ...listeners }}
        taskDropPreview={taskDropPreview}
      />
    </div>
  );
};
