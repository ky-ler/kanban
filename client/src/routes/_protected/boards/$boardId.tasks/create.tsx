import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
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
import { router } from "@/lib/router";
import { useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useForm } from "@tanstack/react-form";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { LoadingSpinner } from "@/components/loading-spinner";
import { Alert } from "@/components/ui/alert";
import {
  getGetBoardQueryKey,
  getGetBoardQueryOptions,
  useGetBoardSuspense,
} from "@/api/gen/endpoints/board-controller/board-controller";
import type { TaskRequest } from "@/api/gen/model";
import { useCreateTask } from "@/api/gen/endpoints/task-controller/task-controller";
import { createTaskBody } from "@/api/gen/endpoints/task-controller/task-controller.zod";

export const Route = createFileRoute(
  "/_protected/boards/$boardId/tasks/create",
)({
  validateSearch: (search: Record<string, unknown>) => {
    return {
      columnId: search.columnId as string | undefined,
    };
  },
  loader: ({ context: { queryClient }, params: { boardId } }) =>
    queryClient.ensureQueryData(getGetBoardQueryOptions(boardId)),
  component: CreateTaskComponent,
});

function CreateTaskComponent() {
  const queryClient = useQueryClient();
  const { boardId } = Route.useParams();
  const { columnId } = Route.useSearch();
  const { data: board, isLoading } = useGetBoardSuspense(boardId);

  const createTaskMutation = useCreateTask({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: getGetBoardQueryKey(boardId),
        });

        returnToBoard(false);
      },
    },
  });

  const form = useForm({
    defaultValues: {
      boardId: boardId,
      title: "",
      description: "",
      assigneeId: "",
      columnId: columnId ?? "",
    } as TaskRequest,
    validators: {
      onSubmit: createTaskBody,
    },
    onSubmit: async ({ value }) => {
      toast.promise(createTaskMutation.mutateAsync({ data: value }), {
        loading: "Creating task...",
        success: "Task created!",
        error: "Failed to create task",
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
      router.navigate({ to: "/boards/$boardId", params: { boardId } });
    }
  };

  if (!board || isLoading) {
    return <LoadingSpinner />;
  }

  if (!board.data.columns || board.data.columns.length === 0) {
    return (
      <Alert variant="destructive">
        This board has no columns. Please create a column before adding tasks.
      </Alert>
    );
  }

  return (
    <Dialog
      open={true}
      modal={true}
      onOpenChange={returnToBoard}
      key={`create-task-${boardId}`}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Create Task
          </DialogTitle>
          <DialogDescription>
            Create a new task for this board. Fill in the details below.
          </DialogDescription>
        </DialogHeader>
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
                          <FieldLabel htmlFor={field.name}>
                            Task Title
                          </FieldLabel>
                          <Input
                            id={field.name}
                            name={field.name}
                            type="text"
                            placeholder="Enter task title"
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
                  <form.Field
                    name="description"
                    children={(field) => {
                      const isInvalid = !field.state.meta.isValid;
                      return (
                        <Field data-invalid={isInvalid}>
                          <FieldLabel htmlFor="board-description">
                            Description
                          </FieldLabel>
                          <Textarea
                            id={field.name}
                            name={field.name}
                            placeholder="Enter board description"
                            rows={4}
                            value={field.state.value ?? ""}
                            onChange={(e) => field.handleChange(e.target.value)}
                            aria-invalid={isInvalid}
                          />
                          <FieldDescription>
                            Optionally, provide a description for your board
                          </FieldDescription>
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
                            value={field.state.value ?? ""}
                            onValueChange={field.handleChange}
                            aria-invalid={isInvalid}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select column" />
                            </SelectTrigger>
                            <SelectContent>
                              {board.data.columns
                                ?.sort((a, b) => a.position - b.position)
                                .map((column) => (
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
                            value={field.state.value ?? ""}
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
                              {board.data.collaborators
                                ?.sort((a, b) => {
                                  const aName = a.user?.username ?? "";
                                  const bName = b.user?.username ?? "";
                                  return aName.localeCompare(bName);
                                })
                                .map((collaborator) => (
                                  <SelectItem
                                    key={collaborator.user?.id}
                                    value={String(collaborator.user?.id)}
                                  >
                                    {collaborator.user?.username}
                                  </SelectItem>
                                ))}
                            </SelectContent>
                          </Select>
                          <FieldDescription>
                            Optionally, select the assignee for this task
                          </FieldDescription>
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
        <DialogFooter>
          <form.Subscribe
            selector={(state) => [
              state.canSubmit,
              state.isSubmitting,
              state.isDefaultValue,
            ]}
          >
            {([canSubmit, isSubmitting, isDefaultValue]) => (
              <>
                <DialogClose asChild>
                  <Button
                    type="button"
                    variant="outline"
                    disabled={isSubmitting}
                    onClick={() => returnToBoard(false)}
                  >
                    Cancel
                  </Button>
                </DialogClose>
                <Button
                  type="submit"
                  onClick={handleSubmit}
                  disabled={!canSubmit || isDefaultValue}
                >
                  {isSubmitting ? "Creating..." : "Create Task"}
                </Button>
              </>
            )}
          </form.Subscribe>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
