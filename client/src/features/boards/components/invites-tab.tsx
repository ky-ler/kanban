import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { Copy, Link2, Trash2, Clock, Users, Check } from "lucide-react";
import { toast } from "sonner";
import {
  useCreateInvite,
  useGetInvites,
  useRevokeInvite,
  getGetInvitesQueryKey,
} from "@/api/gen/endpoints/board-invite-controller/board-invite-controller";
import {
  CreateInviteRequestExpiration,
  CreateInviteRequestMaxUses,
  type BoardInviteDto,
} from "@/api/gen/model";

interface InvitesTabProps {
  boardId: string;
}

const EXPIRATION_OPTIONS = [
  { value: CreateInviteRequestExpiration.ONE_DAY, label: "1 day" },
  { value: CreateInviteRequestExpiration.SEVEN_DAYS, label: "7 days" },
  { value: CreateInviteRequestExpiration.THIRTY_DAYS, label: "30 days" },
  { value: CreateInviteRequestExpiration.NEVER, label: "Never" },
];

const MAX_USES_OPTIONS = [
  { value: CreateInviteRequestMaxUses.ONE, label: "1 use" },
  { value: CreateInviteRequestMaxUses.FIVE, label: "5 uses" },
  { value: CreateInviteRequestMaxUses.TEN, label: "10 uses" },
  { value: CreateInviteRequestMaxUses.TWENTY_FIVE, label: "25 uses" },
  { value: CreateInviteRequestMaxUses.UNLIMITED, label: "Unlimited" },
];

export function InvitesTab({ boardId }: InvitesTabProps) {
  const queryClient = useQueryClient();
  const [expiration, setExpiration] = useState<CreateInviteRequestExpiration>(
    CreateInviteRequestExpiration.SEVEN_DAYS,
  );
  const [maxUses, setMaxUses] = useState<CreateInviteRequestMaxUses>(
    CreateInviteRequestMaxUses.UNLIMITED,
  );
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const { data: invitesResponse, isLoading } = useGetInvites(boardId);
  const invites = invitesResponse?.data ?? [];

  const createInviteMutation = useCreateInvite({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: getGetInvitesQueryKey(boardId),
        });
      },
    },
  });

  const revokeInviteMutation = useRevokeInvite({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: getGetInvitesQueryKey(boardId),
        });
      },
    },
  });

  const handleCreateInvite = () => {
    toast.promise(
      createInviteMutation.mutateAsync({
        data: {
          boardId,
          expiration,
          maxUses,
        },
      }),
      {
        loading: "Creating invite...",
        success: "Invite created!",
        error: "Failed to create invite",
      },
    );
  };

  const handleRevokeInvite = (inviteId: string) => {
    toast.promise(revokeInviteMutation.mutateAsync({ inviteId }), {
      loading: "Revoking invite...",
      success: "Invite revoked",
      error: "Failed to revoke invite",
    });
  };

  const copyInviteLink = async (code: string) => {
    const link = `${window.location.origin}/invite/${code}`;
    await navigator.clipboard.writeText(link);
    setCopiedCode(code);
    toast.success("Invite link copied!");
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const getExpirationStatus = (invite: BoardInviteDto) => {
    if (!invite.expiresAt) return "Never expires";
    const expiresAt = new Date(invite.expiresAt);
    const now = new Date();
    if (expiresAt < now) return "Expired";
    const diffMs = expiresAt.getTime() - now.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    if (diffDays > 0) return `Expires in ${diffDays}d`;
    if (diffHours > 0) return `Expires in ${diffHours}h`;
    return "Expires soon";
  };

  const getUsageStatus = (invite: BoardInviteDto) => {
    if (!invite.maxUses) return `${invite.useCount} uses`;
    return `${invite.useCount}/${invite.maxUses} uses`;
  };

  const isInviteExpired = (invite: BoardInviteDto) => {
    if (!invite.expiresAt) return false;
    return new Date(invite.expiresAt) < new Date();
  };

  const isInviteMaxedOut = (invite: BoardInviteDto) => {
    if (!invite.maxUses) return false;
    return invite.useCount >= invite.maxUses;
  };

  return (
    <div className="space-y-6">
      {/* Create Invite Form */}
      <div className="space-y-4 rounded-lg border p-4">
        <h4 className="flex items-center gap-2 font-medium">
          <Link2 className="h-4 w-4" />
          Create New Invite
        </h4>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-muted-foreground text-sm">
              Expires after
            </label>
            <Select
              value={expiration}
              onValueChange={(v) =>
                setExpiration(v as CreateInviteRequestExpiration)
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {EXPIRATION_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <label className="text-muted-foreground text-sm">Max uses</label>
            <Select
              value={maxUses}
              onValueChange={(v) => setMaxUses(v as CreateInviteRequestMaxUses)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MAX_USES_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <Button
          onClick={handleCreateInvite}
          disabled={createInviteMutation.isPending}
          className="w-full"
        >
          {createInviteMutation.isPending
            ? "Creating..."
            : "Create Invite Link"}
        </Button>
      </div>

      {/* Invites List */}
      <div className="space-y-3">
        <h4 className="text-muted-foreground text-sm font-medium">
          Active Invites ({invites.length})
        </h4>
        {isLoading ? (
          <div className="text-muted-foreground py-4 text-center">
            Loading...
          </div>
        ) : invites.length === 0 ? (
          <div className="text-muted-foreground py-4 text-center">
            No active invites. Create one above.
          </div>
        ) : (
          <div className="max-h-64 space-y-2 overflow-y-auto">
            {invites.map((invite) => {
              const expired = isInviteExpired(invite);
              const maxedOut = isInviteMaxedOut(invite);
              const inactive = expired || maxedOut;

              return (
                <div
                  key={invite.id}
                  className={`space-y-2 rounded-lg border p-3 ${
                    inactive ? "bg-muted/50 opacity-60" : "bg-card"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <code className="bg-muted rounded px-2 py-1 font-mono text-sm">
                      {invite.code}
                    </code>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyInviteLink(invite.code)}
                        className="h-8 w-8 p-0"
                      >
                        {copiedCode === invite.code ? (
                          <Check className="h-4 w-4 text-green-500" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive hover:text-destructive h-8 w-8 p-0"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>
                              Revoke this invite?
                            </AlertDialogTitle>
                            <AlertDialogDescription>
                              This invite link will no longer work. This action
                              cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <Button
                              variant="destructive"
                              onClick={() => handleRevokeInvite(invite.id)}
                              disabled={revokeInviteMutation.isPending}
                            >
                              {revokeInviteMutation.isPending
                                ? "Revoking..."
                                : "Revoke"}
                            </Button>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                  <div className="text-muted-foreground flex items-center gap-4 text-xs">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {expired ? (
                        <span className="text-destructive">Expired</span>
                      ) : (
                        getExpirationStatus(invite)
                      )}
                    </span>
                    <span className="flex items-center gap-1">
                      <Users className="h-3 w-3" />
                      {maxedOut ? (
                        <span className="text-destructive">
                          Max uses reached
                        </span>
                      ) : (
                        getUsageStatus(invite)
                      )}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
