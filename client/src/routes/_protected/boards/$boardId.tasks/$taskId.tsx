import { useState, useRef, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { router } from "@/lib/router";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import {
  AlignLeft,
  Calendar,
  Pencil,
  User,
  Flag,
  Columns,
  Tag,
  Clock,
  Check,
  X,
} from "lucide-react";
import {
  getGetBoardQueryKey,
  getGetBoardQueryOptions,
  useGetBoardSuspense,
} from "@/api/gen/endpoints/board-controller/board-controller";
import {
  getGetTaskQueryKey,
  getGetTaskQueryOptions,
  useGetTaskSuspense,
  useUpdateTask,
} from "@/api/gen/endpoints/task-controller/task-controller";
import {
  getGetTaskActivityQueryKey,
  getGetTaskActivityQueryOptions,
} from "@/api/gen/endpoints/activity-log-controller/activity-log-controller";
import {
  getGetTaskCommentsQueryKey,
  getGetTaskCommentsQueryOptions,
} from "@/api/gen/endpoints/comment-controller/comment-controller";
import { LoadingSpinner } from "@/components/loading-spinner";
import { formatDate } from "@/lib/format-date";
import { LabelPicker } from "@/features/labels/components/label-picker";
import { LabelBadge } from "@/features/labels/components/label-badge";
import { ActivityFeed } from "@/features/tasks/components/activity-feed";
import { useBoardSubscription } from "@/features/boards/hooks/use-board-subscription";
import { useAuth0Context } from "@/features/auth/hooks/use-auth0-context";
import { cn } from "@/lib/utils";

export const Route = createFileRoute(
  "/_protected/boards/$boardId/tasks/$taskId",
)({
  loader: async ({ context: { queryClient }, params: { boardId, taskId } }) => {
    await Promise.all([
      queryClient.ensureQueryData(getGetBoardQueryOptions(boardId)),
      queryClient.ensureQueryData(getGetTaskQueryOptions(taskId)),
      queryClient.ensureQueryData(
        getGetTaskActivityQueryOptions(boardId, taskId),
      ),
      queryClient.ensureQueryData(
        getGetTaskCommentsQueryOptions(boardId, taskId),
      ),
    ]);
  },
  component: TaskComponent,
});

type EditingField =
  | "title"
  | "assignee"
  | "priority"
  | "dueDate"
  | "column"
  | "labels"
  | "description"
  | null;

function TaskComponent() {
  const [editingField, setEditingField] = useState<EditingField>(null);
  const [editValue, setEditValue] = useState<string>("");

  const queryClient = useQueryClient();
  const { boardId, taskId } = Route.useParams();
  const auth = useAuth0Context();
  const currentUserId = auth?.user?.sub;

  const { data: board, isLoading: boardIsLoading } =
    useGetBoardSuspense(boardId);
  const { data: task, isLoading: taskIsLoading } = useGetTaskSuspense(taskId);

  // Subscribe to WebSocket events to refresh activity and comments on changes
  useBoardSubscription(boardId, {
    onEvent: (event) => {
      if (event.type === "ACTIVITY_LOGGED" && event.entityId === taskId) {
        queryClient.invalidateQueries({
          queryKey: getGetTaskActivityQueryKey(boardId, taskId),
        });
      }
      // Handle comment events - also invalidate task to refresh version
      if (
        event.type === "COMMENT_ADDED" ||
        event.type === "COMMENT_UPDATED" ||
        event.type === "COMMENT_DELETED"
      ) {
        queryClient.invalidateQueries({
          queryKey: getGetTaskCommentsQueryKey(boardId, taskId),
        });
        queryClient.invalidateQueries({
          queryKey: getGetTaskQueryKey(taskId),
        });
      }
      // Handle task updates - refresh task data in modal
      if (event.type === "TASK_UPDATED" && event.entityId === taskId) {
        queryClient.invalidateQueries({
          queryKey: getGetTaskQueryKey(taskId),
        });
        queryClient.invalidateQueries({
          queryKey: getGetTaskActivityQueryKey(boardId, taskId),
        });
      }
    },
  });

  const updateTaskMutation = useUpdateTask({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: getGetBoardQueryKey(boardId),
        });
        queryClient.invalidateQueries({
          queryKey: getGetTaskQueryKey(taskId),
        });
      },
      onError: () => {
        toast.error("Failed to update task");
      },
    },
  });

  const saveField = (field: string, value: string | string[] | undefined) => {
    if (!task) return;

    const data = {
      boardId,
      title: task.data.title,
      columnId: task.data.columnId,
      description: task.data.description ?? undefined,
      assigneeId: task.data.assignedTo?.id ?? undefined,
      priority: task.data.priority ?? undefined,
      dueDate: task.data.dueDate ?? undefined,
      labelIds: task.data.labels?.map((l) => l.id) ?? [],
    };

    // Update the specific field
    switch (field) {
      case "title":
        if (typeof value === "string" && value.trim()) {
          data.title = value.trim();
        }
        break;
      case "assignee":
        data.assigneeId = value as string | undefined;
        break;
      case "priority":
        data.priority = value as string | undefined;
        break;
      case "dueDate":
        data.dueDate = value as string | undefined;
        break;
      case "column":
        if (typeof value === "string") {
          data.columnId = value;
        }
        break;
      case "labels":
        if (Array.isArray(value)) {
          data.labelIds = value;
        }
        break;
      case "description":
        data.description = value as string | undefined;
        break;
    }

    updateTaskMutation.mutate({ taskId, data });
    setEditingField(null);
  };

  const returnToBoard = (open: boolean) => {
    if (!open) {
      router.navigate({
        to: "/boards/$boardId",
        params: { boardId },
        search: {
          q: undefined,
          assignee: undefined,
          priority: undefined,
          labels: undefined,
          due: undefined,
        },
      });
    }
  };

  if (!board || !task || boardIsLoading || taskIsLoading) {
    return <LoadingSpinner />;
  }

  const columnName = board?.data?.columns?.find(
    (col) => col.id === task.data.columnId,
  )?.name;

  const priorityLabel = task.data.priority
    ? task.data.priority.charAt(0) + task.data.priority.slice(1).toLowerCase()
    : null;

  return (
    <Dialog
      open={true}
      modal={true}
      onOpenChange={returnToBoard}
      key={`task-${taskId}`}
    >
      <DialogContent className="flex h-[80vh] max-h-[700px] flex-col gap-0 p-0 sm:max-w-5xl">
        {/* Header */}
        <DialogHeader className="shrink-0 border-b px-6 pt-6 pb-4">
          <div className="pr-8">
            <EditableTitle
              value={task.data.title}
              isEditing={editingField === "title"}
              onEdit={() => {
                setEditValue(task.data.title);
                setEditingField("title");
              }}
              onSave={(value) => saveField("title", value)}
              onCancel={() => setEditingField(null)}
              editValue={editValue}
              setEditValue={setEditValue}
            />
            <p className="text-muted-foreground mt-1 text-sm">
              in column <span className="font-medium">{columnName}</span>
            </p>
          </div>
        </DialogHeader>

        {/* Main content area */}
        <div className="flex min-h-0 flex-1 flex-col md:flex-row">
          {/* Left side - Main content */}
          <div className="flex-1 overflow-y-auto p-6">
            <div className="space-y-6">
              {/* Details grid */}
              <div className="grid grid-cols-2 gap-3 sm:gap-4">
                {/* Assignee */}
                <EditableSelectField
                  icon={
                    <User className="text-muted-foreground h-4 w-4 shrink-0" />
                  }
                  label="Assignee"
                  value={task.data.assignedTo?.id ?? "__none__"}
                  displayValue={task.data.assignedTo?.username || "Unassigned"}
                  isEditing={editingField === "assignee"}
                  onEdit={() => setEditingField("assignee")}
                  onSave={(value) =>
                    saveField(
                      "assignee",
                      value === "__none__" ? undefined : value,
                    )
                  }
                  options={[
                    { value: "__none__", label: "Unassigned" },
                    ...(board?.data?.collaborators?.map((c) => ({
                      value: c?.user?.id ?? "__none__",
                      label: c?.user?.username ?? "",
                    })) ?? []),
                  ]}
                />

                {/* Priority */}
                <EditableSelectField
                  icon={
                    <Flag className="text-muted-foreground h-4 w-4 shrink-0" />
                  }
                  label="Priority"
                  value={task.data.priority ?? "__none__"}
                  displayValue={priorityLabel || "None"}
                  isEditing={editingField === "priority"}
                  onEdit={() => setEditingField("priority")}
                  onSave={(value) =>
                    saveField(
                      "priority",
                      value === "__none__" ? undefined : value,
                    )
                  }
                  options={[
                    { value: "__none__", label: "None" },
                    { value: "LOW", label: "Low" },
                    { value: "MEDIUM", label: "Medium" },
                    { value: "HIGH", label: "High" },
                    { value: "URGENT", label: "Urgent" },
                  ]}
                />

                {/* Due Date */}
                <EditableDateField
                  icon={
                    <Calendar className="text-muted-foreground h-4 w-4 shrink-0" />
                  }
                  label="Due Date"
                  value={task.data.dueDate ?? ""}
                  displayValue={
                    task.data.dueDate
                      ? formatDate(task.data.dueDate)
                      : "Not Set"
                  }
                  isEditing={editingField === "dueDate"}
                  onEdit={() => setEditingField("dueDate")}
                  onSave={(value) => saveField("dueDate", value || undefined)}
                />

                {/* Column */}
                <EditableSelectField
                  icon={
                    <Columns className="text-muted-foreground h-4 w-4 shrink-0" />
                  }
                  label="Column"
                  value={task.data.columnId}
                  displayValue={columnName ?? ""}
                  isEditing={editingField === "column"}
                  onEdit={() => setEditingField("column")}
                  onSave={(value) => saveField("column", value)}
                  options={
                    board?.data?.columns?.map((col) => ({
                      value: col.id,
                      label: col.name,
                    })) ?? []
                  }
                />
              </div>

              {/* Labels */}
              <EditableLabels
                boardId={boardId}
                labels={task.data.labels ?? []}
                isEditing={editingField === "labels"}
                onEdit={() => setEditingField("labels")}
                onSave={(value) => saveField("labels", value)}
                onCancel={() => setEditingField(null)}
              />

              {/* Description */}
              <EditableDescription
                value={task.data.description ?? ""}
                isEditing={editingField === "description"}
                onEdit={() => {
                  setEditValue(task.data.description ?? "");
                  setEditingField("description");
                }}
                onSave={(value) => saveField("description", value || undefined)}
                onCancel={() => setEditingField(null)}
                editValue={editValue}
                setEditValue={setEditValue}
              />

              {/* Metadata */}
              <Separator />
              <div className="text-muted-foreground flex flex-wrap items-center gap-4 text-xs sm:gap-6">
                <div className="flex items-center gap-1.5">
                  <User className="h-3 w-3" />
                  <span>Created by {task.data.createdBy.username}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Clock className="h-3 w-3" />
                  <span>{formatDate(task.data.dateCreated)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right side - Activity & Comments */}
          <div className="bg-muted/30 flex shrink-0 flex-col border-t md:w-96 md:border-t-0 md:border-l">
            <div className="flex min-h-0 flex-1">
              <ScrollArea className="max-h-full min-h-0 flex-1">
                <div className="p-4">
                  <ActivityFeed
                    boardId={boardId}
                    taskId={taskId}
                    currentUserId={currentUserId}
                  />
                </div>
              </ScrollArea>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Editable Title Component
function EditableTitle({
  value,
  isEditing,
  onEdit,
  onSave,
  onCancel,
  editValue,
  setEditValue,
}: {
  value: string;
  isEditing: boolean;
  onEdit: () => void;
  onSave: (value: string) => void;
  onCancel: () => void;
  editValue: string;
  setEditValue: (value: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  if (isEditing) {
    return (
      <div className="flex items-center gap-2">
        <Input
          ref={inputRef}
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              onSave(editValue);
            } else if (e.key === "Escape") {
              onCancel();
            }
          }}
          onBlur={() => onSave(editValue)}
          className="text-xl font-semibold"
        />
      </div>
    );
  }

  return (
    <DialogTitle
      className="hover:text-primary cursor-pointer text-xl transition-colors"
      onClick={onEdit}
    >
      {value}
      <Pencil className="ml-2 inline h-4 w-4 opacity-0 transition-opacity group-hover:opacity-100" />
    </DialogTitle>
  );
}

// Editable Select Field Component
function EditableSelectField({
  icon,
  label,
  value,
  displayValue,
  isEditing,
  onEdit,
  onSave,
  options,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  displayValue: string;
  isEditing: boolean;
  onEdit: () => void;
  onSave: (value: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div
      className={cn(
        "bg-muted/50 flex items-center gap-3 rounded-lg p-3 transition-colors",
        !isEditing && "hover:bg-muted cursor-pointer",
      )}
      onClick={() => !isEditing && onEdit()}
    >
      {icon}
      <div className="min-w-0 flex-1">
        <p className="text-muted-foreground text-xs">{label}</p>
        {isEditing ? (
          <Select
            value={value}
            onValueChange={(newValue) => onSave(newValue)}
            open={true}
            onOpenChange={(open) => {
              if (!open) onSave(value);
            }}
          >
            <SelectTrigger className="h-7 border-0 bg-transparent p-0 text-sm font-medium shadow-none focus:ring-0">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {options.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <p className="truncate text-sm font-medium">{displayValue}</p>
        )}
      </div>
    </div>
  );
}

// Editable Date Field Component
function EditableDateField({
  icon,
  label,
  value,
  displayValue,
  isEditing,
  onEdit,
  onSave,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  displayValue: string;
  isEditing: boolean;
  onEdit: () => void;
  onSave: (value: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.showPicker?.();
    }
  }, [isEditing]);

  return (
    <div
      className={cn(
        "bg-muted/50 flex items-center gap-3 rounded-lg p-3 transition-colors",
        !isEditing && "hover:bg-muted cursor-pointer",
      )}
      onClick={() => !isEditing && onEdit()}
    >
      {icon}
      <div className="min-w-0 flex-1">
        <p className="text-muted-foreground text-xs">{label}</p>
        {isEditing ? (
          <Input
            ref={inputRef}
            type="date"
            value={value}
            onChange={(e) => onSave(e.target.value)}
            onBlur={() => onSave(value)}
            className="h-7 border-0 bg-transparent p-0 text-sm font-medium shadow-none focus:ring-0"
          />
        ) : (
          <p className="text-sm font-medium">{displayValue}</p>
        )}
      </div>
    </div>
  );
}

// Editable Labels Component
function EditableLabels({
  boardId,
  labels,
  isEditing,
  onEdit,
  onSave,
  onCancel,
}: {
  boardId: string;
  labels: { id: string; name: string; color: string }[];
  isEditing: boolean;
  onEdit: () => void;
  onSave: (value: string[]) => void;
  onCancel: () => void;
}) {
  const [selectedIds, setSelectedIds] = useState<string[]>(
    labels.map((l) => l.id),
  );

  useEffect(() => {
    setSelectedIds(labels.map((l) => l.id));
  }, [labels]);

  return (
    <div>
      <div className="mb-2 flex items-center gap-2">
        <Tag className="text-muted-foreground h-4 w-4" />
        <h3 className="text-muted-foreground text-sm font-medium">Labels</h3>
      </div>
      {isEditing ? (
        <div className="space-y-2">
          <LabelPicker
            boardId={boardId}
            selectedLabelIds={selectedIds}
            onChange={setSelectedIds}
          />
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setSelectedIds(labels.map((l) => l.id));
                onCancel();
              }}
            >
              <X className="mr-1 h-3 w-3" />
              Cancel
            </Button>
            <Button size="sm" onClick={() => onSave(selectedIds)}>
              <Check className="mr-1 h-3 w-3" />
              Save
            </Button>
          </div>
        </div>
      ) : (
        <div
          className="bg-muted/30 hover:bg-muted/50 cursor-pointer rounded-lg p-3 transition-colors"
          onClick={onEdit}
        >
          {labels.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {labels.map((label) => (
                <LabelBadge key={label.id} label={label} size="sm" />
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-sm italic">
              Click to add labels
            </p>
          )}
        </div>
      )}
    </div>
  );
}

// Editable Description Component
function EditableDescription({
  value,
  isEditing,
  onEdit,
  onSave,
  onCancel,
  editValue,
  setEditValue,
}: {
  value: string;
  isEditing: boolean;
  onEdit: () => void;
  onSave: (value: string) => void;
  onCancel: () => void;
  editValue: string;
  setEditValue: (value: string) => void;
}) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [isEditing]);

  return (
    <div>
      <div className="mb-2 flex items-center gap-2">
        <AlignLeft className="text-muted-foreground h-4 w-4" />
        <h3 className="text-muted-foreground text-sm font-medium">
          Description
        </h3>
      </div>
      {isEditing ? (
        <div className="space-y-2">
          <Textarea
            ref={textareaRef}
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            rows={6}
            placeholder="Add a more detailed description..."
            className="resize-none"
          />
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={onCancel}>
              <X className="mr-1 h-3 w-3" />
              Cancel
            </Button>
            <Button size="sm" onClick={() => onSave(editValue)}>
              <Check className="mr-1 h-3 w-3" />
              Save
            </Button>
          </div>
        </div>
      ) : (
        <div
          className="bg-muted/30 hover:bg-muted/50 min-h-[100px] cursor-pointer rounded-lg p-4 transition-colors"
          onClick={onEdit}
        >
          <p className="text-sm whitespace-pre-wrap">
            {value || (
              <span className="text-muted-foreground italic">
                Click to add a description...
              </span>
            )}
          </p>
        </div>
      )}
    </div>
  );
}
