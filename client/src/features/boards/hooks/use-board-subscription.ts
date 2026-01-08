import { useEffect, useRef } from "react";
import { useBoardWebSocket, type BoardEvent } from "../context/board-websocket-context";

interface UseBoardSubscriptionOptions {
  enabled?: boolean;
  onEvent?: (event: BoardEvent) => void;
}

/**
 * Hook for subscribing to real-time board events via the shared WebSocket connection.
 * 
 * Note: Query invalidation for board data is now handled centrally by BoardWebSocketProvider.
 * This hook is mainly for components that need to react to specific events (like localized cache updates or UI effects).
 *
 * @param _boardId - The board ID (now implicitly used from context, kept for API compatibility but ignored)
 * @param options - Configuration options
 */
export function useBoardSubscription(
  _boardId: string,
  options: UseBoardSubscriptionOptions = {},
) {
  const { enabled = true, onEvent } = options;
  const { status, reconnect, disconnect, registerListener } = useBoardWebSocket();

  // Store callback in ref to avoid re-registering listener on every render
  const onEventRef = useRef(onEvent);
  onEventRef.current = onEvent;

  useEffect(() => {
    if (!enabled || !onEvent) return;

    // Register a listener with the provider
    const unsubscribe = registerListener((event) => {
      onEventRef.current?.(event);
    });

    return () => {
      unsubscribe();
    };
  }, [enabled, registerListener, onEvent]); // Added onEvent dependency to re-register if it changes from undefined to defined

  return {
    status,
    reconnect,
    disconnect,
  };
}
