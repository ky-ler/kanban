import { useState } from "react";
import { useForm } from "@tanstack/react-form";
import { useQueryClient } from "@tanstack/react-query";
import { useCreateColumn } from "@/api/gen/endpoints/column-controller/column-controller";
import { createColumnBody } from "@/api/gen/endpoints/column-controller/column-controller.zod";
import { getGetBoardQueryKey } from "@/api/gen/endpoints/board-controller/board-controller";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldSet,
} from "@/components/ui/field";
import { Plus } from "lucide-react";

interface AddColumnButtonProps {
  boardId: string;
}

export const AddColumnButton = ({ boardId }: AddColumnButtonProps) => {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();
  const createColumnMutation = useCreateColumn();

  const form = useForm({
    defaultValues: {
      name: "",
    },
    validators: { onSubmit: createColumnBody },
    onSubmit: async ({ value }) => {
      await createColumnMutation.mutateAsync({
        boardId,
        data: { name: value.name },
      });
      queryClient.invalidateQueries({
        queryKey: getGetBoardQueryKey(boardId),
      });
      form.reset();
      setOpen(false);
    },
  });

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
    if (!isOpen) {
      form.reset();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    form.handleSubmit(e);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          className="h-fit w-3xs flex-col gap-2 rounded-xl border-dashed py-6"
        >
          <Plus className="size-6" />
          <span>Add Column</span>
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Column</DialogTitle>
          <DialogDescription>
            Create a new column for your board.
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
                      <FieldLabel htmlFor={field.name}>Name</FieldLabel>
                      <Input
                        id={field.name}
                        name={field.name}
                        type="text"
                        placeholder="Enter column name"
                        value={field.state.value ?? ""}
                        onChange={(e) => field.handleChange(e.target.value)}
                        aria-invalid={isInvalid}
                        autoFocus
                      />
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
                  onClick={() => handleOpenChange(false)}
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
