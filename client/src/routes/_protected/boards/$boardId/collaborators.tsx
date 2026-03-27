import { Badge } from "@/components/ui/badge";
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
import {
  Item,
  ItemActions,
  ItemContent,
  ItemTitle,
} from "@/components/ui/item";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { router } from "@/lib/router";
import { useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  IconUser,
  IconUserMinus,
  IconShield,
  IconUsers,
  IconLink,
} from "@tabler/icons-react";
import { InvitesTab } from "@/features/boards/components/invites-tab";
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
import {
  handleMutationAuthError,
  rethrowProtectedRouteError,
} from "@/features/auth/route-auth";

export const Route = createFileRoute(
  "/_protected/boards/$boardId/collaborators",
)({
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
  component: CollaboratorsComponent,
  head: ({ loaderData }) => ({
    meta: [
      {
        name: "description",
        content: `Manage collaborators and invites for your board: ${loaderData?.data.name}.`,
      },
      {
        title: `Collaborators - ${loaderData?.data.name} - Kanban`,
      },
    ],
  }),
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

  const handleRemoveCollaborator = async (userId: string) => {
    const toastId = toast.loading("Removing collaborator...");
    try {
      await removeCollaboratorMutation.mutateAsync({ boardId, userId });
      toast.success("Collaborator removed successfully", { id: toastId });
    } catch (error) {
      if (handleMutationAuthError(error)) {
        toast.dismiss(toastId);
        return;
      }
      toast.error("Failed to remove collaborator", { id: toastId });
    }
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
          archive: undefined,
        },
      });
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case CollaboratorDtoRole.ADMIN:
        return <IconShield className="h-3 w-3" />;
      case CollaboratorDtoRole.MEMBER:
        return <IconUsers className="h-3 w-3" />;
      default:
        return <IconUser className="h-3 w-3" />;
    }
  };

  const getRoleBadgeVariant = (
    role: string,
  ): "destructive" | "secondary" | "outline" => {
    switch (role) {
      case CollaboratorDtoRole.ADMIN:
        return "destructive";
      case CollaboratorDtoRole.MEMBER:
        return "secondary";
      default:
        return "outline";
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
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <IconUsers className="h-5 w-5" />
            Manage Team
          </DialogTitle>
          <DialogDescription>
            Collaborators and invites for {board.data.name}
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="collaborators">
          {isCurrentUserAdmin && (
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="collaborators">
                <IconUser className="mr-2 h-4 w-4" />
                Collaborators
              </TabsTrigger>
              <TabsTrigger value="invites">
                <IconLink className="mr-2 h-4 w-4" />
                Invites
              </TabsTrigger>
            </TabsList>
          )}

          <TabsContent value="collaborators" className="mt-4">
            <div className="max-h-80 space-y-3 overflow-y-auto">
              {sortedCollaborators.map((collaborator) => (
                <Item key={collaborator.user?.id} variant="outline">
                  <Avatar size="lg">
                    <AvatarImage
                      src={collaborator.user?.profileImageUrl ?? undefined}
                      alt={collaborator.user?.username}
                      loading="lazy"
                      referrerPolicy="no-referrer"
                    />
                    <AvatarFallback>
                      <IconUser className="size-5" />
                    </AvatarFallback>
                  </Avatar>
                  <ItemContent>
                    <ItemTitle>{collaborator.user?.username}</ItemTitle>
                    <Badge
                      variant={getRoleBadgeVariant(
                        collaborator.role ?? CollaboratorDtoRole.GUEST,
                      )}
                    >
                      {getRoleIcon(
                        collaborator.role ?? CollaboratorDtoRole.GUEST,
                      )}
                      {collaborator.role ?? CollaboratorDtoRole.GUEST}
                    </Badge>
                  </ItemContent>
                  {isCurrentUserAdmin &&
                    collaborator.role !== "ADMIN" &&
                    collaborator.user?.id !== currentUserId && (
                      <ItemActions>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              disabled={removeCollaboratorMutation.isPending}
                              className="text-destructive hover:text-destructive hover:bg-destructive/10"
                            >
                              <IconUserMinus className="h-4 w-4" />
                              {removeCollaboratorMutation.isPending
                                ? "Removing..."
                                : "Remove"}
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>
                                Are you sure you want to remove this
                                collaborator?
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
                                  handleRemoveCollaborator(
                                    collaborator.user!.id,
                                  )
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
                      </ItemActions>
                    )}
                </Item>
              ))}
            </div>
          </TabsContent>

          {isCurrentUserAdmin && (
            <TabsContent value="invites" className="mt-4">
              <InvitesTab boardId={boardId} />
            </TabsContent>
          )}
        </Tabs>

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
