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
      className="mx-4 mt-2"
    >
      {isTerminalError ? (
        context.failureReason === "access" ? (
          <IconWifiOff className="size-4 shrink-0" />
        ) : (
          <IconAlertCircle className="size-4 shrink-0" />
        )
      ) : (
        <Spinner className="size-4 shrink-0" />
      )}
      <AlertDescription>{message}</AlertDescription>
      {isTerminalError && (
        <AlertAction>
          <Button
            type="button"
            size="sm"
            variant={isTerminalError ? "destructive" : "secondary"}
            className="h-7 shrink-0 px-2.5"
            onClick={handleAction}
          >
            {buttonLabel}
          </Button>
        </AlertAction>
      )}
    </Alert>
  );
}
