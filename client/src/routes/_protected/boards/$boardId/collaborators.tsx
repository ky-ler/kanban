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
import { useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { User, UserMinus, Shield, Users } from "lucide-react";
import { useAuth0Context } from "@/features/auth/hooks/use-auth0-context";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  getGetBoardQueryKey,
  getGetBoardQueryOptions,
  useGetBoardSuspense,
  useRemoveCollaborator,
} from "@/api/gen/endpoints/board-controller/board-controller";
import { CollaboratorDtoRole } from "@/api/gen/model";
import { LoadingSpinner } from "@/components/loading-spinner";

export const Route = createFileRoute(
  "/_protected/boards/$boardId/collaborators",
)({
  loader: ({ context: { queryClient }, params: { boardId } }) =>
    queryClient.ensureQueryData(getGetBoardQueryOptions(boardId)),
  component: CollaboratorsComponent,
});

// TODO: Add ability to add and change roles of collaborators
function CollaboratorsComponent() {
  const queryClient = useQueryClient();
  const { boardId } = Route.useParams();
  const { data: board, isLoading } = useGetBoardSuspense(boardId);
  const auth = useAuth0Context();

  const currentUserId = auth?.user?.sub;

  // Find current user's role in the board
  const currentUserRole = board?.data.collaborators.find(
    (collaborator) => collaborator.user?.id.toString() === currentUserId,
  )?.role;

  const isCurrentUserAdmin = currentUserRole === CollaboratorDtoRole.ADMIN;

  const removeCollaboratorMutation = useRemoveCollaborator({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: getGetBoardQueryKey(boardId),
        });
      },
    },
  });

  const handleRemoveCollaborator = (userId: string) => {
    toast.promise(removeCollaboratorMutation.mutateAsync({ boardId, userId }), {
      loading: "Removing collaborator...",
      success: "Collaborator removed successfully",
      error: "Failed to remove collaborator",
    });
  };

  const returnToBoard = (open: boolean) => {
    if (!open) {
      router.navigate({ to: "/boards/$boardId", params: { boardId } });
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case CollaboratorDtoRole.ADMIN:
        return <Shield className="h-3 w-3" />;
      case CollaboratorDtoRole.MEMBER:
        return <Users className="h-3 w-3" />;
      default:
        return <User className="h-3 w-3" />;
    }
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case CollaboratorDtoRole.ADMIN:
        return "bg-red-100 text-red-800 border-red-200";
      case CollaboratorDtoRole.MEMBER:
        return "bg-blue-100 text-blue-800 border-blue-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const getRolePriority = (role: string = CollaboratorDtoRole.GUEST) => {
    switch (role) {
      case CollaboratorDtoRole.ADMIN:
        return 0;
      case CollaboratorDtoRole.MEMBER:
        return 1;
      case CollaboratorDtoRole.GUEST:
        return 2;
      default:
        return 3;
    }
  };

  // Sort collaborators by role priority (ADMIN first, then MEMBER, then GUEST)
  const sortedCollaborators =
    board?.data.collaborators.slice().sort((a, b) => {
      return getRolePriority(a.role) - getRolePriority(b.role);
    }) || [];

  if (!board || isLoading) {
    return <LoadingSpinner />;
  }

  return (
    <Dialog
      open={true}
      modal={true}
      onOpenChange={returnToBoard}
      key={`collaborators-${boardId}`}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Board Collaborators
          </DialogTitle>
          <DialogDescription>
            Team members working on {board.data.name}
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-96 space-y-4 overflow-y-auto">
          {sortedCollaborators.map((collaborator) => (
            <div
              key={collaborator.user?.id}
              className="bg-card hover:bg-accent/50 flex items-center gap-4 rounded-lg border p-4 transition-colors"
            >
              <div className="bg-primary/10 flex h-10 w-10 items-center justify-center rounded-full">
                {collaborator.user?.profileImageUrl ? (
                  <img
                    src={collaborator.user.profileImageUrl}
                    alt={collaborator.user.username}
                    className="rounded-full object-cover"
                    loading="lazy"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <User className="text-primary h-5 w-5" />
                )}
              </div>
              <div className="flex-1 space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <h4 className="text-sm font-medium">
                    {collaborator.user?.username}
                  </h4>
                  <span
                    className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 text-xs font-medium ${getRoleBadgeColor(
                      collaborator.role ?? CollaboratorDtoRole.GUEST,
                    )}`}
                  >
                    {getRoleIcon(
                      collaborator.role ?? CollaboratorDtoRole.GUEST,
                    )}
                    {collaborator.role ?? CollaboratorDtoRole.GUEST}
                  </span>
                </div>
              </div>
              {isCurrentUserAdmin &&
                collaborator.role !== "ADMIN" &&
                collaborator.user?.id !== currentUserId && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={removeCollaboratorMutation.isPending}
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                      >
                        <UserMinus className="h-4 w-4" />
                        {removeCollaboratorMutation.isPending
                          ? "Removing..."
                          : "Remove"}
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>
                          Are you sure you want to remove this collaborator?
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                          This action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <Button
                          variant="destructive"
                          onClick={() =>
                            handleRemoveCollaborator(collaborator.user!.id)
                          }
                          disabled={removeCollaboratorMutation.isPending}
                        >
                          {removeCollaboratorMutation.isPending
                            ? "Removing..."
                            : "Remove"}
                        </Button>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
            </div>
          ))}
        </div>

        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline" onClick={() => returnToBoard(false)}>
              Close
            </Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
