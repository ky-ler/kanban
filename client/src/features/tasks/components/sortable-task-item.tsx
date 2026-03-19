import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { TaskSummaryDto } from "@/api/gen/model";
import { TaskItem } from "./task-item";
import { cn } from "@/lib/utils";

interface SortableTaskItemProps {
  task: TaskSummaryDto;
  boardId: string;
  dropIndicator?: "before" | "after" | null;
}

export const SortableTaskItem = ({
  task,
  boardId,
  dropIndicator = null,
}: SortableTaskItemProps) => {
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
      className={cn(
        "relative touch-none",
        isDragging && "z-10 opacity-50",
        dropIndicator &&
          "before:bg-primary/90 before:absolute before:inset-x-0 before:h-1 before:rounded-full before:shadow-[0_0_0_4px_var(--color-background)] before:content-['']",
        dropIndicator === "before" && "before:-top-1.5",
        dropIndicator === "after" && "before:-bottom-1.5",
      )}
    >
      <TaskItem task={task} boardId={boardId} />
    </div>
  );
};
