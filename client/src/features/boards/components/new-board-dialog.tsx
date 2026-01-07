import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldSet,
} from "@/components/ui/field";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useForm } from "@tanstack/react-form";
import { Button } from "@/components/ui/button";
import { useQueryClient } from "@tanstack/react-query";
// import { type BoardForm, type Board, boardSchema } from "@/types/Board";
import { router } from "@/lib/router";
import { toast } from "sonner";
import { useState } from "react";
import {
  getGetBoardsForUserQueryKey,
  useCreateBoard,
} from "@/api/gen/endpoints/board-controller/board-controller";
import type { BoardRequest } from "@/api/gen/model";
import { createBoardBody } from "@/api/gen/endpoints/board-controller/board-controller.zod";

export const NewBoardDialog = ({ trigger }: { trigger: React.ReactNode }) => {
  const [isOpen, setIsOpen] = useState(false);
  const queryClient = useQueryClient();

  const createBoardMutation = useCreateBoard({
    mutation: {
      onSuccess: ({ data }) => {
        queryClient.invalidateQueries({
          queryKey: getGetBoardsForUserQueryKey(),
        });
        router.navigate({
          to: "/boards/$boardId",
          params: { boardId: data.id.toString() },
          search: { q: undefined, assignee: undefined, priority: undefined, labels: undefined, due: undefined },
        });
        setIsOpen(false);
      },
    },
  });

  const form = useForm({
    defaultValues: { name: "", description: "" } as BoardRequest,
    validators: { onSubmit: createBoardBody },
    onSubmit: async ({ value }) => {
      toast.promise(createBoardMutation.mutateAsync({ data: value }), {
        loading: "Creating board...",
        success: "Board created!",
        error: "Failed to create board",
      });
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    form.handleSubmit(e);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen} key="create-board">
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogTitle>Create New Board</DialogTitle>
        <DialogDescription>
          Fill out the form below to create a new board.
        </DialogDescription>
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
                        type="text"
                        placeholder="Enter board name"
                        value={field.state.value ?? ""}
                        onChange={(e) => field.handleChange(e.target.value)}
                        aria-invalid={isInvalid}
                      />
                      {/* <FieldDescription>
                        Enter a brief name for your board
                      </FieldDescription> */}
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
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsOpen(false)}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  onClick={handleSubmit}
                  disabled={!canSubmit || isDefaultValue}
                >
                  {isSubmitting ? "Creating..." : "Create"}
                </Button>
              </>
            )}
          </form.Subscribe>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
