import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
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
import { useForm } from "@tanstack/react-form";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldSet,
} from "@/components/ui/field";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { IconEdit } from "@tabler/icons-react";
import {
  getGetBoardQueryKey,
  getGetBoardQueryOptions,
  useGetBoardSuspense,
  useUpdateBoard,
} from "@/api/gen/endpoints/board-controller/board-controller";
import type { BoardRequest } from "@/api/gen/model";
import { updateBoardBody } from "@/api/gen/endpoints/board-controller/board-controller.zod";
import {
  handleMutationAuthError,
  rethrowProtectedRouteError,
} from "@/features/auth/route-auth";

export const Route = createFileRoute("/_protected/boards/$boardId/edit")({
  loader: async ({
    context: { queryClient },
    params: { boardId },
    location,
  }) => {
    try {
      return await queryClient.ensureQueryData(
        getGetBoardQueryOptions(boardId),
      );
    } catch (error) {
      rethrowProtectedRouteError(
        error,
        `${location.pathname}${location.searchStr}${location.hash}`,
      );
    }
  },
  component: EditBoardComponent,
  head: ({ loaderData }) => ({
    meta: [
      {
        name: "description",
        content: `Edit the details of your kanban board: ${loaderData?.data.name}.`,
      },
      {
        title: `Edit Board - ${loaderData?.data.name} - Kanban`,
      },
    ],
  }),
});

function EditBoardComponent() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { boardId } = Route.useParams();

  const { data: board } = useGetBoardSuspense(boardId);

  const updateBoardMutation = useUpdateBoard({
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
      name: board?.data.name ?? "",
      description: board?.data.description ?? "",
      isArchived: board?.data.isArchived ?? false,
    } as BoardRequest,
    validators: { onSubmit: updateBoardBody },
    onSubmit: async ({ value }) => {
      const toastId = toast.loading("Updating board...");
      try {
        await updateBoardMutation.mutateAsync({ boardId, data: value });
        toast.success("Board updated!", { id: toastId });
      } catch (error) {
        if (handleMutationAuthError(error)) {
          toast.dismiss(toastId);
          return;
        }
        toast.error("Failed to update board", { id: toastId });
      }
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    form.handleSubmit(e);
  };

  const returnToBoard = (open: boolean) => {
    if (!open) {
      form.reset();
      navigate({
        to: "/boards/$boardId",
        params: { boardId },
        search: {
          q: undefined,
          assignee: undefined,
          priority: undefined,
          labels: undefined,
          due: undefined,
          archive: undefined,
        },
      });
    }
  };

  return (
    <Dialog
      open={true}
      modal={true}
      onOpenChange={returnToBoard}
      key={`edit-${boardId}`}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <IconEdit className="h-5 w-5" />
            Edit Board
          </DialogTitle>
          <DialogDescription>
            Make changes to your board here.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <FieldGroup>
            <FieldSet>
              <form.Field
                name="name"
                children={(field) => {
                  const isInvalid = !field.state.meta.isValid;
                  return (
                    <Field data-invalid={isInvalid}>
                      <FieldLabel htmlFor={field.name}>Board Name</FieldLabel>
                      <Input
                        id={field.name}
                        name={field.name}
                        placeholder="Enter board name"
                        value={field.state.value}
                        onBlur={field.handleBlur}
                        onChange={(e) => field.handleChange(e.target.value)}
                        aria-invalid={isInvalid}
                        type="text"
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
                      <FieldLabel htmlFor={field.name}>Description</FieldLabel>
                      <Textarea
                        id={field.name}
                        name={field.name}
                        value={field.state.value}
                        onBlur={field.handleBlur}
                        onChange={(e) => field.handleChange(e.target.value)}
                        aria-invalid={isInvalid}
                        rows={4}
                        placeholder="Enter board description"
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
                  >
                    Cancel
                  </Button>
                </DialogClose>
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
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
