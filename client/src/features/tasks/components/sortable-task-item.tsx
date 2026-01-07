import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { TaskSummaryDto } from "@/api/gen/model";
import { TaskItem } from "./task-item";
import { cn } from "@/lib/utils";

interface SortableTaskItemProps {
  task: TaskSummaryDto;
  boardId: string;
}

export const SortableTaskItem = ({ task, boardId }: SortableTaskItemProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: task.id,
    data: {
      type: "task",
      task,
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
      {...attributes}
      {...listeners}
      className={cn(isDragging && "z-10 opacity-50")}
    >
      <TaskItem task={task} boardId={boardId} />
    </div>
  );
};
