import {
  useEffect,
  useRef,
  useMemo,
  useState,
  type HTMLAttributes,
} from "react";
import type { ChecklistItemDto, CollaboratorDto } from "@/api/gen/model";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { IconCalendar, IconGripVertical, IconTrash } from "@tabler/icons-react";
import { format, isValid, parseISO } from "date-fns";
import { cn } from "@/lib/utils";

interface ChecklistItemProps {
  item: ChecklistItemDto;
  collaborators: CollaboratorDto[];
  isPending?: boolean;
  disabled?: boolean;
  onToggle: (itemId: string) => void;
  onUpdateTitle: (itemId: string, title: string) => void;
  onUpdateAssignee: (itemId: string, assigneeId?: string) => void;
  onUpdateDueDate: (itemId: string, dueDate?: string) => void;
  onDelete: (itemId: string) => void;
  dragHandleProps?: HTMLAttributes<HTMLButtonElement>;
}

export function ChecklistItem({
  item,
  collaborators,
  isPending = false,
  disabled = false,
  onToggle,
  onUpdateTitle,
  onUpdateAssignee,
  onUpdateDueDate,
  onDelete,
  dragHandleProps,
}: ChecklistItemProps) {
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleValue, setTitleValue] = useState(item.title);
  const [dueDateOpen, setDueDateOpen] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const selectedDate = useMemo(() => {
    if (!item.dueDate) return undefined;
    const parsed = parseISO(item.dueDate);
    return isValid(parsed) ? parsed : undefined;
  }, [item.dueDate]);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [titleValue, isEditingTitle]);

  const handleSaveTitle = () => {
    const nextTitle = titleValue.trim();
    if (!nextTitle || nextTitle === item.title) {
      setTitleValue(item.title);
      setIsEditingTitle(false);
      return;
    }
    onUpdateTitle(item.id, nextTitle);
    setIsEditingTitle(false);
  };

  const collaboratorUsers = collaborators
    .map((collaborator) => collaborator.user)
    .filter(
      (user): user is NonNullable<(typeof collaborators)[number]["user"]> =>
        Boolean(user?.id),
    );

  return (
    <div className="group min-w-0 rounded-md border p-2">
      <div className="flex min-w-0 items-start gap-2">
        {!disabled && (
          <button
            type="button"
            className="text-muted-foreground hover:text-foreground mt-0.5 shrink-0 cursor-grab"
            aria-label="Drag checklist item"
            {...dragHandleProps}
          >
            <IconGripVertical className="h-4 w-4" />
          </button>
        )}

        <Checkbox
          checked={item.isCompleted}
          disabled={isPending || disabled}
          onCheckedChange={() => onToggle(item.id)}
          className="mt-0.5 shrink-0"
        />

        <div className="min-w-0 flex-1">
          {isEditingTitle ? (
            <textarea
              ref={textareaRef}
              value={titleValue}
              onChange={(event) => setTitleValue(event.target.value)}
              onBlur={handleSaveTitle}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  handleSaveTitle();
                }
                if (event.key === "Escape") {
                  setTitleValue(item.title);
                  setIsEditingTitle(false);
                }
              }}
              autoFocus
              rows={1}
              maxLength={500}
              className="w-full resize-none bg-transparent text-sm leading-5 [overflow-wrap:anywhere] outline-none"
            />
          ) : (
            <button
              type="button"
              className={cn(
                "w-full text-left text-sm leading-5 [overflow-wrap:anywhere]",
                item.isCompleted && "text-muted-foreground line-through",
              )}
              onClick={disabled ? undefined : () => setIsEditingTitle(true)}
              disabled={disabled}
            >
              {item.title}
            </button>
          )}

          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            <Select
              value={item.assignedTo?.id ?? "__none__"}
              onValueChange={(value) =>
                onUpdateAssignee(
                  item.id,
                  value === "__none__" ? undefined : value,
                )
              }
              disabled={disabled}
            >
              <SelectTrigger className="h-7 w-32 text-xs">
                <SelectValue placeholder="Assignee" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">Unassigned</SelectItem>
                {collaboratorUsers.map((user) => (
                  <SelectItem key={user.id} value={user.id}>
                    {user.username}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Popover open={dueDateOpen} onOpenChange={setDueDateOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant={selectedDate ? "secondary" : "ghost"}
                  size="default"
                  className={cn(
                    "gap-1 px-2 text-xs",
                    !selectedDate && "w-8 px-0",
                  )}
                  disabled={disabled}
                >
                  <IconCalendar className="h-4 w-4 shrink-0" />
                  {selectedDate && <span>{format(selectedDate, "MMM d")}</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  defaultMonth={selectedDate}
                  onSelect={(date) => {
                    onUpdateDueDate(
                      item.id,
                      date ? format(date, "yyyy-MM-dd") : undefined,
                    );
                    setDueDateOpen(false);
                  }}
                />
                <div className="border-t p-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start"
                    disabled={!item.dueDate}
                    onClick={() => {
                      onUpdateDueDate(item.id, undefined);
                      setDueDateOpen(false);
                    }}
                  >
                    Clear date
                  </Button>
                </div>
              </PopoverContent>
            </Popover>

            {!disabled && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="hover:text-destructive transition-colors"
                onClick={() => onDelete(item.id)}
              >
                <IconTrash className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
