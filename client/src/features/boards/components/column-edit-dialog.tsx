import { useForm } from "@tanstack/react-form";
import { useQueryClient } from "@tanstack/react-query";
import type { ColumnDto } from "@/api/gen/model";
import { useUpdateColumn } from "@/api/gen/endpoints/column-controller/column-controller";
import { updateColumnBody } from "@/api/gen/endpoints/column-controller/column-controller.zod";
import { getGetBoardQueryKey } from "@/api/gen/endpoints/board-controller/board-controller";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldSet,
} from "@/components/ui/field";

interface ColumnEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  column: ColumnDto;
  boardId: string;
}

export const ColumnEditDialog = ({
  open,
  onOpenChange,
  column,
  boardId,
}: ColumnEditDialogProps) => {
  const queryClient = useQueryClient();
  const updateColumnMutation = useUpdateColumn();

  const form = useForm({
    defaultValues: {
      name: column.name,
    },
    validators: { onSubmit: updateColumnBody },
    onSubmit: async ({ value }) => {
      await updateColumnMutation.mutateAsync({
        boardId,
        columnId: column.id,
        data: { name: value.name },
      });
      queryClient.invalidateQueries({
        queryKey: getGetBoardQueryKey(boardId),
      });
      onOpenChange(false);
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    form.handleSubmit(e);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Rename Column</DialogTitle>
          <DialogDescription>
            Enter a new name for this column.
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
                        placeholder="Column name"
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
            selector={(state) => [state.canSubmit, state.isSubmitting]}
          >
            {([canSubmit, isSubmitting]) => (
              <>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  onClick={handleSubmit}
                  disabled={!canSubmit}
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
};
