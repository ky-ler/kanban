import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { router } from "@/lib/router";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
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
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldSet,
} from "@/components/ui/field";
import { Textarea } from "@/components/ui/textarea";
import { useForm } from "@tanstack/react-form";
import { toast } from "sonner";
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
import { updateTaskBody } from "@/api/gen/endpoints/task-controller/task-controller.zod";
import type { TaskRequest } from "@/api/gen/model";
import { LoadingSpinner } from "@/components/loading-spinner";
import { formatDate } from "@/lib/format-date";
import { LabelPicker } from "@/features/labels/components/label-picker";
import { LabelBadge } from "@/features/labels/components/label-badge";

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
      onChange: updateTaskBody,
    },
    onSubmit: async ({ value }) => {
      toast.promise(
        updateTaskMutation.mutateAsync({ taskId: taskId, data: value }),
        {
          loading: "Updating task...",
          success: "Task updated!",
          error: "Failed to update task",
        },
      );
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
      router.navigate({ to: "/boards/$boardId", params: { boardId } });
    }
  };

  if (!board || !task || boardIsLoading || taskIsLoading) {
    return <LoadingSpinner />;
  }

  return (
    <Dialog
      open={true}
      modal={true}
      onOpenChange={returnToBoard}
      key={`task-${taskId}`}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{task.data.title}</DialogTitle>
          <DialogDescription>
            {isEditing ? "Edit task details" : `Task details`}
          </DialogDescription>
        </DialogHeader>

        {isEditing ? (
          <form onSubmit={handleSubmit}>
            <FieldGroup>
              <FieldSet>
                <FieldGroup>
                  <FieldGroup>
                    <form.Field
                      name="title"
                      children={(field) => {
                        const isInvalid = !field.state.meta.isValid;
                        return (
                          <Field data-invalid={isInvalid}>
                            <FieldLabel htmlFor="title">Task Title</FieldLabel>
                            <Input
                              id="title"
                              type="text"
                              placeholder="Enter task title"
                              value={field.state.value}
                              onChange={(e) =>
                                field.handleChange(e.target.value)
                              }
                              aria-invalid={isInvalid}
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
                              onChange={(e) =>
                                field.handleChange(e.target.value)
                              }
                              aria-invalid={isInvalid}
                              rows={4}
                              placeholder="Enter board description"
                            />
                            {!task.data.description && (
                              <FieldDescription>
                                Optionally, provide a description for your board
                              </FieldDescription>
                            )}
                            {isInvalid && (
                              <FieldError errors={field.state.meta.errors} />
                            )}
                          </Field>
                        );
                      }}
                    />
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
                            <FieldLabel htmlFor={field.name}>
                              Assignee
                            </FieldLabel>
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
                                <SelectItem
                                  value={null as never}
                                  key={undefined}
                                >
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
                            {!task.data.assignedTo && (
                              <FieldDescription>
                                Optionally, select an assignee for this task
                              </FieldDescription>
                            )}

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
                            <FieldLabel htmlFor={field.name}>
                              Priority
                            </FieldLabel>
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
                            <FieldLabel htmlFor={field.name}>
                              Due Date
                            </FieldLabel>
                            <Input
                              id={field.name}
                              name={field.name}
                              type="date"
                              value={field.state.value ?? ""}
                              onChange={(e) =>
                                field.handleChange(e.target.value)
                              }
                              aria-invalid={isInvalid}
                            />
                            {isInvalid && (
                              <FieldError errors={field.state.meta.errors} />
                            )}
                          </Field>
                        );
                      }}
                    />
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
                  </FieldGroup>
                </FieldGroup>
              </FieldSet>
            </FieldGroup>
          </form>
        ) : (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-[1fr_auto]">
            <Field>
              <FieldLabel>Description</FieldLabel>
              <FieldDescription>
                {task.data.description || "No description provided"}
              </FieldDescription>
            </Field>

            <FieldGroup className="md:max-w-[250px] md:min-w-[200px]">
              <Field>
                <FieldLabel>Column</FieldLabel>
                <FieldDescription>
                  {board?.data?.columns
                    ?.filter((col) => col.id === task.data.columnId)
                    .map((col) => col.name)}
                </FieldDescription>
              </Field>

              <Field>
                <FieldLabel>Assigned To</FieldLabel>
                <FieldDescription>
                  {task.data.assignedTo?.username || "Unassigned"}
                </FieldDescription>
              </Field>

              <Field>
                <FieldLabel>Priority</FieldLabel>
                <FieldDescription>
                  {task.data.priority
                    ? task.data.priority.charAt(0) +
                      task.data.priority.slice(1).toLowerCase()
                    : "None"}
                </FieldDescription>
              </Field>

              <Field>
                <FieldLabel>Due Date</FieldLabel>
                <FieldDescription>
                  {task.data.dueDate
                    ? formatDate(task.data.dueDate)
                    : "Not set"}
                </FieldDescription>
              </Field>

              <Field>
                <FieldLabel>Labels</FieldLabel>
                {task.data.labels && task.data.labels.length > 0 ? (
                  <div className="flex flex-wrap gap-1 mt-1">
                    {task.data.labels.map((label) => (
                      <LabelBadge key={label.id} label={label} size="sm" />
                    ))}
                  </div>
                ) : (
                  <FieldDescription>No labels</FieldDescription>
                )}
              </Field>

              <Field>
                <FieldLabel>Created By</FieldLabel>
                <FieldDescription>
                  {task.data.createdBy.username}
                </FieldDescription>
              </Field>

              <Field>
                <FieldLabel>Created</FieldLabel>
                <FieldDescription>
                  {formatDate(task.data.dateCreated)}
                </FieldDescription>
              </Field>

              <Field>
                <FieldLabel>Last Modified</FieldLabel>
                <FieldDescription>
                  {formatDate(task.data.dateModified)}
                </FieldDescription>
              </Field>
            </FieldGroup>
          </div>
        )}

        <DialogFooter>
          {isEditing ? (
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
                    {isSubmitting ? "Saving..." : "Save"}
                  </Button>
                </>
              )}
            </form.Subscribe>
          ) : (
            <Button onClick={() => setIsEditing(true)}>Edit</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
