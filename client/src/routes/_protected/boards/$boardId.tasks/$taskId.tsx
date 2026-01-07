import { useState } from "react";
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
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useForm } from "@tanstack/react-form";
import { toast } from "sonner";
import {
  AlignLeft,
  Calendar,
  History,
  Pencil,
  User,
  Flag,
  Columns,
  Tag,
  Clock,
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
import { getGetTaskActivityQueryKey } from "@/api/gen/endpoints/activity-log-controller/activity-log-controller";
import { updateTaskBody } from "@/api/gen/endpoints/task-controller/task-controller.zod";
import type { TaskRequest } from "@/api/gen/model";
import { LoadingSpinner } from "@/components/loading-spinner";
import { formatDate } from "@/lib/format-date";
import { LabelPicker } from "@/features/labels/components/label-picker";
import { LabelBadge } from "@/features/labels/components/label-badge";
import { ActivityList } from "@/features/tasks/components/activity-list";
import { useBoardEvents } from "@/features/boards/hooks/use-board-events";

export const Route = createFileRoute(
  "/_protected/boards/$boardId/tasks/$taskId",
)({
  loader: async ({ context: { queryClient }, params: { boardId, taskId } }) => {
    await Promise.all([
      queryClient.ensureQueryData(getGetBoardQueryOptions(boardId)),
      queryClient.ensureQueryData(getGetTaskQueryOptions(taskId)),
    ]);
  },
  component: TaskComponent,
});

function TaskComponent() {
  const [isEditing, setIsEditing] = useState(false);

  const queryClient = useQueryClient();
  const { boardId, taskId } = Route.useParams();

  const { data: board, isLoading: boardIsLoading } =
    useGetBoardSuspense(boardId);
  const { data: task, isLoading: taskIsLoading } = useGetTaskSuspense(taskId);

  // Subscribe to SSE events to refresh activity on changes
  useBoardEvents(boardId, {
    onEvent: (event) => {
      if (event.type === "ACTIVITY_LOGGED" && event.entityId === taskId) {
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
        setIsEditing(false);
      },
    },
  });

  const form = useForm({
    defaultValues: {
      boardId: boardId,
      title: task?.data.title ?? "",
      description: task?.data.description ?? "",
      columnId: task?.data.columnId ?? "",
      assigneeId: task?.data.assignedTo?.id ?? "",
      priority: task?.data.priority ?? "",
      dueDate: task?.data.dueDate ?? "",
      labelIds: task?.data.labels?.map((l) => l.id) ?? [],
    } as TaskRequest,
    validators: {
      onSubmit: ({ value }) => {
        const transformed = {
          ...value,
          dueDate: value.dueDate || undefined,
          priority: value.priority || undefined,
          assigneeId: value.assigneeId || undefined,
        };
        const result = updateTaskBody.safeParse(transformed);
        if (!result.success) {
          return result.error.formErrors.fieldErrors;
        }
        return undefined;
      },
    },
    onSubmit: async ({ value }) => {
      const data = {
        ...value,
        dueDate: value.dueDate || undefined,
        priority: value.priority || undefined,
        assigneeId: value.assigneeId || undefined,
      };
      toast.promise(updateTaskMutation.mutateAsync({ taskId: taskId, data }), {
        loading: "Updating task...",
        success: "Task updated!",
        error: "Failed to update task",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    form.handleSubmit();
  };

  const returnToBoard = (open: boolean) => {
    if (!open) {
      form.reset();
      router.navigate({
        to: "/boards/$boardId",
        params: { boardId },
        search: { q: undefined, assignee: undefined, priority: undefined, labels: undefined, due: undefined },
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
          <div className="flex items-start justify-between pr-8">
            <div className="space-y-1">
              <DialogTitle className="text-xl">{task.data.title}</DialogTitle>
              <p className="text-muted-foreground text-sm">
                in column <span className="font-medium">{columnName}</span>
              </p>
            </div>
            {!isEditing && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsEditing(true)}
              >
                <Pencil className="mr-2 h-4 w-4" />
                Edit
              </Button>
            )}
          </div>
        </DialogHeader>

        {/* Main content area */}
        <div className="flex min-h-0 flex-1 flex-col md:flex-row">
          {/* Left side - Main content */}
          <div className="flex-1 overflow-y-auto p-6">
            {isEditing ? (
              <form onSubmit={handleSubmit} className="space-y-4">
                <form.Field
                  name="title"
                  children={(field) => {
                    const isInvalid = !field.state.meta.isValid;
                    return (
                      <Field data-invalid={isInvalid}>
                        <FieldLabel htmlFor="title">Title</FieldLabel>
                        <Input
                          id="title"
                          type="text"
                          placeholder="Enter task title"
                          value={field.state.value}
                          onChange={(e) => field.handleChange(e.target.value)}
                          aria-invalid={isInvalid}
                        />
                        {isInvalid && (
                          <FieldError errors={field.state.meta.errors} />
                        )}
                      </Field>
                    );
                  }}
                />

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <form.Field
                    name="columnId"
                    children={(field) => {
                      const isInvalid = !field.state.meta.isValid;
                      return (
                        <Field data-invalid={isInvalid}>
                          <FieldLabel htmlFor={field.name}>Column</FieldLabel>
                          <Select
                            name={field.name}
                            value={field.state.value}
                            onValueChange={field.handleChange}
                            aria-invalid={isInvalid}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select column" />
                            </SelectTrigger>
                            <SelectContent>
                              {board?.data?.columns?.map((column) => (
                                <SelectItem
                                  key={column.id}
                                  value={String(column.id)}
                                >
                                  {column.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {isInvalid && (
                            <FieldError errors={field.state.meta.errors} />
                          )}
                        </Field>
                      );
                    }}
                  />

                  <form.Field
                    name="assigneeId"
                    children={(field) => {
                      const isInvalid = !field.state.meta.isValid;
                      return (
                        <Field data-invalid={isInvalid}>
                          <FieldLabel htmlFor={field.name}>Assignee</FieldLabel>
                          <Select
                            name={field.name}
                            value={field.state.value}
                            onValueChange={field.handleChange}
                            aria-invalid={isInvalid}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select assignee" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value={null as never} key={undefined}>
                                No assignee
                              </SelectItem>
                              {board?.data?.collaborators?.map(
                                (collaborator) => (
                                  <SelectItem
                                    key={collaborator?.user?.id}
                                    value={String(collaborator?.user?.id)}
                                  >
                                    {collaborator?.user?.username}
                                  </SelectItem>
                                ),
                              )}
                            </SelectContent>
                          </Select>
                          {isInvalid && (
                            <FieldError errors={field.state.meta.errors} />
                          )}
                        </Field>
                      );
                    }}
                  />

                  <form.Field
                    name="priority"
                    children={(field) => {
                      const isInvalid = !field.state.meta.isValid;
                      return (
                        <Field data-invalid={isInvalid}>
                          <FieldLabel htmlFor={field.name}>Priority</FieldLabel>
                          <Select
                            name={field.name}
                            value={field.state.value ?? ""}
                            onValueChange={field.handleChange}
                            aria-invalid={isInvalid}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select priority" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value={null as never} key="none">
                                No priority
                              </SelectItem>
                              <SelectItem value="LOW">Low</SelectItem>
                              <SelectItem value="MEDIUM">Medium</SelectItem>
                              <SelectItem value="HIGH">High</SelectItem>
                              <SelectItem value="URGENT">Urgent</SelectItem>
                            </SelectContent>
                          </Select>
                          {isInvalid && (
                            <FieldError errors={field.state.meta.errors} />
                          )}
                        </Field>
                      );
                    }}
                  />

                  <form.Field
                    name="dueDate"
                    children={(field) => {
                      const isInvalid = !field.state.meta.isValid;
                      return (
                        <Field data-invalid={isInvalid}>
                          <FieldLabel htmlFor={field.name}>Due Date</FieldLabel>
                          <Input
                            id={field.name}
                            name={field.name}
                            type="date"
                            value={field.state.value ?? ""}
                            onChange={(e) => field.handleChange(e.target.value)}
                            aria-invalid={isInvalid}
                          />
                          {isInvalid && (
                            <FieldError errors={field.state.meta.errors} />
                          )}
                        </Field>
                      );
                    }}
                  />
                </div>

                <form.Field
                  name="labelIds"
                  children={(field) => {
                    const isInvalid = !field.state.meta.isValid;
                    return (
                      <Field data-invalid={isInvalid}>
                        <FieldLabel htmlFor={field.name}>Labels</FieldLabel>
                        <LabelPicker
                          boardId={boardId}
                          selectedLabelIds={field.state.value ?? []}
                          onChange={field.handleChange}
                        />
                        {isInvalid && (
                          <FieldError errors={field.state.meta.errors} />
                        )}
                      </Field>
                    );
                  }}
                />

                <form.Field
                  name="description"
                  children={(field) => {
                    const isInvalid = !field.state.meta.isValid;
                    return (
                      <Field data-invalid={isInvalid}>
                        <FieldLabel htmlFor={field.name}>
                          Description
                        </FieldLabel>
                        <Textarea
                          id={field.name}
                          name={field.name}
                          value={field.state.value}
                          onChange={(e) => field.handleChange(e.target.value)}
                          aria-invalid={isInvalid}
                          rows={6}
                          placeholder="Add a more detailed description..."
                        />
                        {isInvalid && (
                          <FieldError errors={field.state.meta.errors} />
                        )}
                      </Field>
                    );
                  }}
                />

                <div className="flex gap-2 pt-4">
                  <form.Subscribe
                    selector={(state) => [
                      state.canSubmit,
                      state.isSubmitting,
                      state.isDefaultValue,
                    ]}
                  >
                    {([canSubmit, isSubmitting, isDefaultValue]) => (
                      <>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => {
                            setIsEditing(false);
                            form.reset();
                          }}
                          disabled={isSubmitting}
                        >
                          Cancel
                        </Button>
                        <Button
                          type="submit"
                          disabled={!canSubmit || isDefaultValue}
                          onClick={handleSubmit}
                        >
                          {isSubmitting ? "Saving..." : "Save Changes"}
                        </Button>
                      </>
                    )}
                  </form.Subscribe>
                </div>
              </form>
            ) : (
              <div className="space-y-6">
                {/* Details grid */}
                <div className="grid grid-cols-2 gap-3 sm:gap-4">
                  <div className="bg-muted/50 flex items-center gap-3 rounded-lg p-3">
                    <User className="text-muted-foreground h-4 w-4 shrink-0" />
                    <div className="min-w-0">
                      <p className="text-muted-foreground text-xs">Assignee</p>
                      <p className="truncate text-sm font-medium">
                        {task.data.assignedTo?.username || "Unassigned"}
                      </p>
                    </div>
                  </div>

                  <div className="bg-muted/50 flex items-center gap-3 rounded-lg p-3">
                    <Flag className="text-muted-foreground h-4 w-4 shrink-0" />
                    <div className="min-w-0">
                      <p className="text-muted-foreground text-xs">Priority</p>
                      <p className="text-sm font-medium">
                        {priorityLabel || "None"}
                      </p>
                    </div>
                  </div>

                  <div className="bg-muted/50 flex items-center gap-3 rounded-lg p-3">
                    <Calendar className="text-muted-foreground h-4 w-4 shrink-0" />
                    <div className="min-w-0">
                      <p className="text-muted-foreground text-xs">Due Date</p>
                      <p className="text-sm font-medium">
                        {task.data.dueDate
                          ? formatDate(task.data.dueDate)
                          : "Not set"}
                      </p>
                    </div>
                  </div>

                  <div className="bg-muted/50 flex items-center gap-3 rounded-lg p-3">
                    <Columns className="text-muted-foreground h-4 w-4 shrink-0" />
                    <div className="min-w-0">
                      <p className="text-muted-foreground text-xs">Column</p>
                      <p className="truncate text-sm font-medium">
                        {columnName}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Labels */}
                <div>
                  <div className="mb-2 flex items-center gap-2">
                    <Tag className="text-muted-foreground h-4 w-4" />
                    <h3 className="text-muted-foreground text-sm font-medium">
                      Labels
                    </h3>
                  </div>
                  {task.data.labels && task.data.labels.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5">
                      {task.data.labels.map((label) => (
                        <LabelBadge key={label.id} label={label} size="sm" />
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted-foreground text-sm italic">
                      No labels
                    </p>
                  )}
                </div>

                {/* Description */}
                <div>
                  <div className="mb-2 flex items-center gap-2">
                    <AlignLeft className="text-muted-foreground h-4 w-4" />
                    <h3 className="text-muted-foreground text-sm font-medium">
                      Description
                    </h3>
                  </div>
                  <div className="bg-muted/30 min-h-[100px] rounded-lg p-4">
                    <p className="text-sm whitespace-pre-wrap">
                      {task.data.description || (
                        <span className="text-muted-foreground italic">
                          No description provided
                        </span>
                      )}
                    </p>
                  </div>
                </div>

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
            )}
          </div>

          {/* Right side - Activity (hidden on mobile, shown on md+) */}
          <div className="bg-muted/30 flex shrink-0 flex-col border-t md:w-80 md:border-t-0 md:border-l">
            <div className="border-b px-4 py-3">
              <div className="flex items-center gap-2">
                <History className="text-muted-foreground h-4 w-4" />
                <h3 className="text-sm font-medium">Activity</h3>
              </div>
            </div>
            <ScrollArea className="h-48 md:h-auto md:flex-1">
              <div className="p-4">
                <ActivityList boardId={boardId} taskId={taskId} />
              </div>
            </ScrollArea>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
