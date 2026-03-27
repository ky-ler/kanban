import { Alert, AlertAction, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import {
  getAuthLoginSearch,
  getCurrentAppPath,
} from "@/features/auth/auth-navigation";
import { useBoardWebSocket } from "@/features/boards/context/board-websocket-context";
import { router } from "@/lib/router";
import { IconAlertCircle, IconWifiOff } from "@tabler/icons-react";

export function BoardWebSocketBanner() {
  const context = useBoardWebSocket();

  if (!context) {
    return null;
  }

  const isTerminalError = context.status === "error";
  const isVisibleReconnect =
    context.retryAttempt >= 2 &&
    (context.status === "retrying" || context.status === "connecting");

  if (!isTerminalError && !isVisibleReconnect) {
    return null;
  }

  const message =
    context.failureReason === "auth"
      ? "Realtime updates paused while authentication is being refreshed."
      : context.failureReason === "access"
        ? "Realtime updates stopped because you no longer have access to this board."
        : isVisibleReconnect
          ? `Realtime updates are reconnecting. Attempt ${context.retryAttempt} of 5.`
          : "Realtime updates are unavailable right now.";

  const buttonLabel =
    context.failureReason === "auth"
      ? "Refresh"
      : context.failureReason === "access"
        ? "Back to boards"
        : "Reconnect";

  const handleAction = () => {
    if (context.failureReason === "auth") {
      void router.navigate({
        to: "/auth/login",
        search: getAuthLoginSearch(getCurrentAppPath(), true),
      });
      return;
    }

    if (context.failureReason === "access") {
      void router.navigate({ to: "/boards", search: { archive: undefined } });
      return;
    }

    context.reconnect();
  };

  return (
    <Alert
      variant={isTerminalError ? "destructive" : "default"}
      className="mx-auto mt-2 max-w-screen md:max-w-md"
    >
      {isTerminalError ? (
        context.failureReason === "access" ? (
          <IconWifiOff />
        ) : (
          <IconAlertCircle />
        )
      ) : (
        <Spinner />
      )}
      <AlertDescription>{message}</AlertDescription>
      {isTerminalError && (
        <AlertAction>
          <Button
            type="button"
            size="xs"
            variant={isTerminalError ? "destructive" : "default"}
            onClick={handleAction}
          >
            {buttonLabel}
          </Button>
        </AlertAction>
      )}
    </Alert>
  );
}
