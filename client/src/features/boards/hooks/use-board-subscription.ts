import { useEffect, useRef } from "react";
import {
  useBoardWebSocket,
  type BoardEvent,
} from "../context/board-websocket-context";

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
const NOOP = () => {};

export function useBoardSubscription(
  _boardId: string,
  options: UseBoardSubscriptionOptions = {},
) {
  const { enabled = true, onEvent } = options;
  const context = useBoardWebSocket();

  // Store callback in ref to avoid re-registering listener on every render
  const onEventRef = useRef(onEvent);
  onEventRef.current = onEvent;

  useEffect(() => {
    if (!context || !enabled || !onEvent) return;

    // Register a listener with the provider
    const unsubscribe = context.registerListener((event) => {
      onEventRef.current?.(event);
    });

    return () => {
      unsubscribe();
    };
  }, [context, enabled, onEvent]);

  return {
    status: context?.status ?? "disconnected",
    reconnect: context?.reconnect ?? NOOP,
    disconnect: context?.disconnect ?? NOOP,
  };
}
