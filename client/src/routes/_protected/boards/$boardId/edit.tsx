import { createFileRoute } from "@tanstack/react-router";
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
import { router } from "@/lib/router";
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
import { Edit } from "lucide-react";
import {
  getGetBoardQueryKey,
  getGetBoardQueryOptions,
  useGetBoardSuspense,
  useUpdateBoard,
} from "@/api/gen/endpoints/board-controller/board-controller";
import type { BoardRequest } from "@/api/gen/model";
import { updateBoardBody } from "@/api/gen/endpoints/board-controller/board-controller.zod";

export const Route = createFileRoute("/_protected/boards/$boardId/edit")({
  loader: ({ context: { queryClient }, params: { boardId } }) =>
    queryClient.ensureQueryData(getGetBoardQueryOptions(boardId)),
  component: EditBoardComponent,
});

function EditBoardComponent() {
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
      toast.promise(updateBoardMutation.mutateAsync({ boardId, data: value }), {
        loading: "Updating board...",
        success: "Board updated!",
        error: "Failed to update board",
      });
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
      router.navigate({
        to: "/boards/$boardId",
        params: { boardId },
        search: { q: undefined, assignee: undefined, priority: undefined, labels: undefined, due: undefined },
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
            <Edit className="h-5 w-5" />
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
