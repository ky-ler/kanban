import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import {
  getAuthLoginSearch,
  getCurrentAppPath,
} from "@/features/auth/auth-navigation";
import { useBoardWebSocket } from "@/features/boards/context/board-websocket-context";
import { router } from "@/lib/router";
import { cn } from "@/lib/utils";
import { AlertCircle, WifiOff } from "lucide-react";

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
      void router.navigate({ to: "/boards" });
      return;
    }

    context.reconnect();
  };

  return (
    <div
      className={cn(
        "mx-4 mt-2 flex items-center gap-2 rounded-md px-3 py-2 text-sm",
        isTerminalError
          ? "bg-destructive/10 text-destructive"
          : "bg-muted text-muted-foreground",
      )}
    >
      {isTerminalError ? (
        context.failureReason === "access" ? (
          <WifiOff className="size-4 shrink-0" />
        ) : (
          <AlertCircle className="size-4 shrink-0" />
        )
      ) : (
        <Spinner className="size-4 shrink-0" />
      )}
      <span className="flex-1">{message}</span>
      {isTerminalError && (
        <Button
          type="button"
          size="sm"
          variant={isTerminalError ? "destructive" : "secondary"}
          className="h-7 shrink-0 px-2.5 text-xs"
          onClick={handleAction}
        >
          {buttonLabel}
        </Button>
      )}
    </div>
  );
}
