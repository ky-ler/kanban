import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { ColumnDto, TaskSummaryDto } from "@/api/gen/model";
import { KanbanColumn } from "./kanban-column";
import { cn } from "@/lib/utils";

interface SortableColumnProps {
  column: ColumnDto;
  tasks: TaskSummaryDto[];
  boardId: string;
}

export const SortableColumn = ({
  column,
  tasks,
  boardId,
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
      className={cn(isDragging && "z-10 opacity-50")}
    >
      <KanbanColumn
        column={column}
        tasks={tasks}
        boardId={boardId}
        dragHandleProps={{ ...attributes, ...listeners }}
      />
    </div>
  );
};
