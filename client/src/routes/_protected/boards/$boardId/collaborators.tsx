import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Item,
  ItemActions,
  ItemContent,
  ItemTitle,
} from "@/components/ui/item";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  IconCrown,
  IconDotsVertical,
  IconLink,
  IconShield,
  IconUser,
  IconUserMinus,
  IconUsers,
} from "@tabler/icons-react";
import {
  getGetBoardQueryKey,
  getGetBoardQueryOptions,
  useGetBoardSuspense,
  useRemoveCollaborator,
  useTransferOwnership,
  useUpdateCollaboratorRole,
} from "@/api/gen/endpoints/board-controller/board-controller";
import { CollaboratorDtoRole, RoleUpdateRequestNewRole } from "@/api/gen/model";
import { LoadingSpinner } from "@/components/loading-spinner";
import { InvitesTab } from "@/features/boards/components/invites-tab";
import { useAuth0Context } from "@/features/auth/hooks/use-auth0-context";
import {
  handleMutationAuthError,
  rethrowProtectedRouteError,
} from "@/features/auth/route-auth";
import { toTitleCase } from "@/lib/text-case";

type CollaboratorTarget = {
  userId: string;
  username: string;
  currentRole: CollaboratorDtoRole;
};

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

function CollaboratorsComponent() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { boardId } = Route.useParams();
  const { data: board, isLoading } = useGetBoardSuspense(boardId);
  const auth = useAuth0Context();

  const [dropdownContainer, setDropdownContainer] =
    useState<HTMLDivElement | null>(null);

  const [roleModalTarget, setRoleModalTarget] =
    useState<CollaboratorTarget | null>(null);
  const [transferTarget, setTransferTarget] =
    useState<CollaboratorTarget | null>(null);
  const [removeTarget, setRemoveTarget] = useState<CollaboratorTarget | null>(
    null,
  );

  const currentUserId = auth?.user?.sub;
  const ownerId = board?.data.createdBy.id;

  const currentUserRole = board?.data.collaborators.find(
    (collaborator) => collaborator.user?.id === currentUserId,
  )?.role;

  const isCurrentUserAdmin = currentUserRole === CollaboratorDtoRole.ADMIN;
  const isCurrentUserOwner = ownerId === currentUserId;

  const removeCollaboratorMutation = useRemoveCollaborator({
    mutation: {
      onSuccess: () =>
        queryClient.invalidateQueries({
          queryKey: getGetBoardQueryKey(boardId),
        }),
    },
  });

  const updateCollaboratorRoleMutation = useUpdateCollaboratorRole({
    mutation: {
      onSuccess: () =>
        queryClient.invalidateQueries({
          queryKey: getGetBoardQueryKey(boardId),
        }),
    },
  });

  const transferOwnershipMutation = useTransferOwnership({
    mutation: {
      onSuccess: () =>
        queryClient.invalidateQueries({
          queryKey: getGetBoardQueryKey(boardId),
        }),
    },
  });

  const isMutating =
    removeCollaboratorMutation.isPending ||
    updateCollaboratorRoleMutation.isPending ||
    transferOwnershipMutation.isPending;

  const returnToBoard = (open: boolean) => {
    if (!open) {
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

  const canManageUser = (userId: string | undefined) =>
    isCurrentUserAdmin && userId !== undefined && userId !== currentUserId;

  const canEditTargetRole = (
    targetUserId: string,
    targetRole: CollaboratorDtoRole,
    desiredRole: RoleUpdateRequestNewRole,
  ) => {
    if (targetUserId === ownerId) {
      return false;
    }

    if (
      !isCurrentUserOwner &&
      (targetRole === CollaboratorDtoRole.ADMIN ||
        desiredRole === RoleUpdateRequestNewRole.ADMIN)
    ) {
      return false;
    }

    return true;
  };

  const getRoleOptions = (target: CollaboratorTarget | null) => {
    if (!target) {
      return [];
    }

    const allRoles: RoleUpdateRequestNewRole[] = [
      RoleUpdateRequestNewRole.ADMIN,
      RoleUpdateRequestNewRole.MEMBER,
      RoleUpdateRequestNewRole.GUEST,
    ];

    return allRoles.filter((desiredRole) =>
      canEditTargetRole(target.userId, target.currentRole, desiredRole),
    );
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

  const sortedCollaborators =
    board?.data.collaborators.slice().sort((a, b) => {
      const aIsOwner = a.user?.id === ownerId ? 0 : 1;
      const bIsOwner = b.user?.id === ownerId ? 0 : 1;
      if (aIsOwner !== bIsOwner) {
        return aIsOwner - bIsOwner;
      }
      const roleDiff = getRolePriority(a.role) - getRolePriority(b.role);
      if (roleDiff !== 0) {
        return roleDiff;
      }
      return (a.user?.username ?? "").localeCompare(b.user?.username ?? "");
    }) ?? [];

  const handleRoleChange = async (
    userId: string,
    newRole: RoleUpdateRequestNewRole,
  ) => {
    const toastId = toast.loading("Updating role...");
    try {
      await updateCollaboratorRoleMutation.mutateAsync({
        boardId,
        userId,
        data: { newRole },
      });
      toast.success("Role updated", { id: toastId });
      setRoleModalTarget(null);
    } catch (error) {
      if (handleMutationAuthError(error)) {
        toast.dismiss(toastId);
        return;
      }
      toast.error("Failed to update role", { id: toastId });
    }
  };

  const handleTransfer = async (target: CollaboratorTarget) => {
    const toastId = toast.loading("Transferring leadership...");
    try {
      await transferOwnershipMutation.mutateAsync({
        boardId,
        userId: target.userId,
      });
      toast.success("Leadership transferred", { id: toastId });
    } catch (error) {
      if (handleMutationAuthError(error)) {
        toast.dismiss(toastId);
        return;
      }
      toast.error("Failed to transfer leadership", { id: toastId });
    }
  };

  const handleRemove = async (target: CollaboratorTarget) => {
    const toastId = toast.loading("Removing collaborator...");
    try {
      await removeCollaboratorMutation.mutateAsync({
        boardId,
        userId: target.userId,
      });
      toast.success("Collaborator removed", { id: toastId });
    } catch (error) {
      if (handleMutationAuthError(error)) {
        toast.dismiss(toastId);
        return;
      }
      toast.error("Failed to remove collaborator", { id: toastId });
    }
  };

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
        <div ref={setDropdownContainer} className="contents" />
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
              {sortedCollaborators.map((collaborator) => {
                const role = collaborator.role ?? CollaboratorDtoRole.GUEST;
                const targetUserId = collaborator.user?.id;
                const targetUsername = collaborator.user?.username ?? "User";
                const targetIsOwner = targetUserId === ownerId;

                if (!targetUserId) {
                  return null;
                }

                const target: CollaboratorTarget = {
                  userId: targetUserId,
                  username: targetUsername,
                  currentRole: role,
                };

                const roleChoices = getRoleOptions(target).filter(
                  (option) => option !== role,
                );

                return (
                  <Item key={targetUserId} variant="muted">
                    <Avatar size="lg">
                      <AvatarImage
                        src={collaborator.user?.profileImageUrl ?? undefined}
                        alt={targetUsername}
                        loading="lazy"
                        referrerPolicy="no-referrer"
                      />
                      <AvatarFallback>
                        <IconUser className="size-5" />
                      </AvatarFallback>
                    </Avatar>

                    <ItemContent>
                      <ItemTitle>{targetUsername}</ItemTitle>
                      <div className="flex items-center gap-2">
                        <Badge variant={getRoleBadgeVariant(role)}>
                          {getRoleIcon(role)}
                          {toTitleCase(role)}
                        </Badge>
                        {targetIsOwner && (
                          <Badge variant="outline">
                            <IconCrown className="h-3 w-3" />
                            Leader
                          </Badge>
                        )}
                      </div>
                    </ItemContent>

                    {canManageUser(targetUserId) && (
                      <ItemActions className="ml-auto">
                        <DropdownMenu modal={false}>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <IconDotsVertical className="size-3.5" />
                              <span className="sr-only">
                                Collaborator actions
                              </span>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent
                            className="w-fit"
                            align="end"
                            container={dropdownContainer}
                          >
                            <DropdownMenuItem
                              disabled={isMutating || roleChoices.length === 0}
                              onSelect={() =>
                                setTimeout(() => setRoleModalTarget(target), 0)
                              }
                            >
                              <IconShield className="size-3.5" />
                              Change Role
                            </DropdownMenuItem>

                            {isCurrentUserOwner && !targetIsOwner && (
                              <DropdownMenuItem
                                disabled={isMutating}
                                onSelect={() =>
                                  setTimeout(() => setTransferTarget(target), 0)
                                }
                              >
                                <IconCrown className="size-3.5" />
                                Promote to Leader
                              </DropdownMenuItem>
                            )}

                            {!targetIsOwner && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  variant="destructive"
                                  disabled={isMutating}
                                  onSelect={() =>
                                    setTimeout(() => setRemoveTarget(target), 0)
                                  }
                                >
                                  <IconUserMinus className="size-3.5" />
                                  Remove
                                </DropdownMenuItem>
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </ItemActions>
                    )}
                  </Item>
                );
              })}
            </div>
          </TabsContent>

          {isCurrentUserAdmin && (
            <TabsContent value="invites" className="mt-4">
              <InvitesTab boardId={boardId} />
            </TabsContent>
          )}
        </Tabs>

        <Dialog
          open={roleModalTarget !== null}
          onOpenChange={(open) => !open && setRoleModalTarget(null)}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Change Role</DialogTitle>
              <DialogDescription>
                {roleModalTarget
                  ? `Choose a new role for ${roleModalTarget.username}.`
                  : "Choose a new role."}
              </DialogDescription>
            </DialogHeader>
            <div className="flex flex-wrap gap-2">
              {roleModalTarget &&
                getRoleOptions(roleModalTarget)
                  .filter((option) => option !== roleModalTarget.currentRole)
                  .map((option) => (
                    <Button
                      key={option}
                      variant="outline"
                      disabled={isMutating}
                      onClick={() =>
                        handleRoleChange(roleModalTarget.userId, option)
                      }
                    >
                      {toTitleCase(option)}
                    </Button>
                  ))}
            </div>
          </DialogContent>
        </Dialog>

        <Dialog
          open={transferTarget !== null}
          onOpenChange={(open) => !open && setTransferTarget(null)}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Transfer leadership?</DialogTitle>
              <DialogDescription>
                {transferTarget?.username} will become the new leader. You will
                be demoted to admin.
              </DialogDescription>
            </DialogHeader>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setTransferTarget(null)}>
                Cancel
              </Button>
              <Button
                onClick={() => {
                  if (transferTarget) {
                    handleTransfer(transferTarget);
                    setTransferTarget(null);
                  }
                }}
                disabled={isMutating}
              >
                {transferOwnershipMutation.isPending
                  ? "Transferring..."
                  : "Confirm"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog
          open={removeTarget !== null}
          onOpenChange={(open) => !open && setRemoveTarget(null)}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Remove collaborator?</DialogTitle>
              <DialogDescription>
                This will remove {removeTarget?.username} from the board.
              </DialogDescription>
            </DialogHeader>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setRemoveTarget(null)}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={() => {
                  if (removeTarget) {
                    handleRemove(removeTarget);
                    setRemoveTarget(null);
                  }
                }}
                disabled={isMutating}
              >
                {removeCollaboratorMutation.isPending
                  ? "Removing..."
                  : "Remove"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

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
