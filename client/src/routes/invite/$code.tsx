import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Kanban, AlertCircle, LogIn, UserPlus } from "lucide-react";
import { useAuth0Context } from "@/features/auth/hooks/use-auth0-context";
import {
  usePreviewInvite,
  useAcceptInvite,
} from "@/api/gen/endpoints/board-invite-controller/board-invite-controller";
import { toast } from "sonner";
import { LoadingSpinner } from "@/components/loading-spinner";

export const Route = createFileRoute("/invite/$code")({
  component: InvitePage,
});

function InvitePage() {
  const { code } = Route.useParams();
  const navigate = useNavigate();
  const auth = useAuth0Context();

  const isAuthenticated = auth?.isAuthenticated ?? false;
  const isLoading = auth?.isLoading ?? true;

  const {
    data: previewResponse,
    isLoading: previewLoading,
    error: previewError,
  } = usePreviewInvite(code);

  const preview = previewResponse?.data;

  const acceptInviteMutation = useAcceptInvite({
    mutation: {
      onSuccess: (response) => {
        if (response.data.alreadyMember) {
          toast.info("You're already a member of this board!");
        } else {
          toast.success(`Welcome to ${response.data.boardName}!`);
        }
        navigate({
          to: "/boards/$boardId",
          params: { boardId: response.data.boardId },
          search: {
            q: undefined,
            assignee: undefined,
            priority: undefined,
            labels: undefined,
            due: undefined,
          },
        });
      },
      onError: () => {
        toast.error("Failed to join the board. Please try again.");
      },
    },
  });

  const handleSignIn = () => {
    // Save current URL to redirect back after login
    const returnTo = window.location.pathname;
    auth?.loginWithRedirect({
      appState: { returnTo },
    });
  };

  const handleJoinBoard = () => {
    acceptInviteMutation.mutate({ code });
  };

  // Loading states
  if (isLoading || previewLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  // Error or not found
  if (previewError || !preview) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
              <AlertCircle className="h-6 w-6 text-destructive" />
            </div>
            <CardTitle>Invite Not Found</CardTitle>
            <CardDescription>
              This invite link doesn't exist or has been deleted.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Button onClick={() => navigate({ to: "/" })} variant="outline">
              Go to Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Invalid invite (expired, maxed out, revoked)
  if (!preview.valid) {
    const errorMessages: Record<string, { title: string; description: string }> = {
      expired: {
        title: "Invite Expired",
        description: "This invite link has expired and is no longer valid.",
      },
      max_uses_reached: {
        title: "Invite Limit Reached",
        description: "This invite link has reached its maximum number of uses.",
      },
      revoked: {
        title: "Invite Revoked",
        description: "This invite link has been revoked by a board admin.",
      },
    };

    const error = errorMessages[preview.errorMessage ?? ""] ?? {
      title: "Invalid Invite",
      description: "This invite link is no longer valid.",
    };

    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
              <AlertCircle className="h-6 w-6 text-destructive" />
            </div>
            <CardTitle>{error.title}</CardTitle>
            <CardDescription>{error.description}</CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Button onClick={() => navigate({ to: "/" })} variant="outline">
              Go to Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Valid invite
  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <Kanban className="h-6 w-6 text-primary" />
          </div>
          <CardTitle>You've been invited!</CardTitle>
          <CardDescription>
            Join the board and start collaborating
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <Alert>
            <Kanban className="h-4 w-4" />
            <AlertTitle>Board</AlertTitle>
            <AlertDescription className="font-medium">
              {preview.boardName}
            </AlertDescription>
          </Alert>

          {isAuthenticated ? (
            <Button
              onClick={handleJoinBoard}
              disabled={acceptInviteMutation.isPending}
              className="w-full"
              size="lg"
            >
              {acceptInviteMutation.isPending ? (
                "Joining..."
              ) : (
                <>
                  <UserPlus className="mr-2 h-4 w-4" />
                  Join Board
                </>
              )}
            </Button>
          ) : (
            <div className="space-y-4">
              <p className="text-center text-sm text-muted-foreground">
                Sign in to join this board
              </p>
              <Button onClick={handleSignIn} className="w-full" size="lg">
                <LogIn className="mr-2 h-4 w-4" />
                Sign In to Join
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
