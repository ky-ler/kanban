import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { TaskSummaryDto } from "@/api/gen/model";
import { TaskItem } from "./task-item";
import { cn } from "@/lib/utils";
import { useNavigate } from "@tanstack/react-router";
import type { KeyboardEventHandler } from "react";

interface SortableTaskItemProps {
  task: TaskSummaryDto;
  boardId: string;
}

export const SortableTaskItem = ({ task, boardId }: SortableTaskItemProps) => {
  const navigate = useNavigate();
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

  const handleKeyDown: KeyboardEventHandler<HTMLDivElement> = (event) => {
    listeners?.onKeyDown?.(event);

    if (event.defaultPrevented) {
      return;
    }

    if (event.key !== "Enter" || event.target !== event.currentTarget) {
      return;
    }

    event.preventDefault();
    void navigate({
      to: "/boards/$boardId/tasks/$taskId",
      params: { boardId, taskId: task.id },
      search: {
        q: undefined,
        assignee: undefined,
        priority: undefined,
        labels: undefined,
        due: undefined,
        archive: undefined,
      },
    });
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onKeyDown={handleKeyDown}
      className={cn(
        "relative touch-none [-webkit-touch-callout:none]",
        isDragging && "z-10 opacity-50",
      )}
    >
      <TaskItem task={task} boardId={boardId} />
    </div>
  );
};
