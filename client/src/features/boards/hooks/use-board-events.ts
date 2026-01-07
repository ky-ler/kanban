import { useEffect, useRef, useState, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { getAuthToken } from "@/features/auth/token-provider";
import { env } from "@/config/env";
import { getGetBoardQueryKey } from "@/api/gen/endpoints/board-controller/board-controller";

const INITIAL_RETRY_DELAY = 1000;
const MAX_RETRY_DELAY = 30000;
const MAX_RETRY_ATTEMPTS = 5;

type ConnectionStatus = "connecting" | "connected" | "disconnected" | "error";

interface BoardEvent {
  type: string;
  boardId: string;
  entityId: string | null;
  payload: unknown;
}

interface UseBoardEventsOptions {
  enabled?: boolean;
  onEvent?: (event: BoardEvent) => void;
}

/**
 * Hook for subscribing to real-time board events via Server-Sent Events (SSE).
 *
 * Automatically invalidates TanStack Query cache when board events are received,
 * triggering a refetch of the board data.
 *
 * @param boardId - The board ID to subscribe to
 * @param options - Configuration options
 * @returns Connection status and manual reconnect function
 */
export function useBoardEvents(
  boardId: string,
  options: UseBoardEventsOptions = {},
) {
  const { enabled = true, onEvent } = options;
  const queryClient = useQueryClient();
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const retryCountRef = useRef(0);
  const [status, setStatus] = useState<ConnectionStatus>("disconnected");

  // Store onEvent in ref to avoid reconnecting when callback changes
  const onEventRef = useRef(onEvent);
  onEventRef.current = onEvent;

  const connect = useCallback(async () => {
    if (!enabled || !boardId) return;

    // Clean up existing connection
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    setStatus("connecting");

    try {
      const token = await getAuthToken();
      const baseUrl = env.VITE_API_URL.replace(/\/$/, "");
      const url = `${baseUrl}/boards/${boardId}/events?access_token=${encodeURIComponent(token)}`;

      const eventSource = new EventSource(url);
      eventSourceRef.current = eventSource;

      eventSource.onopen = () => {
        // Reset retry count on successful connection
        retryCountRef.current = 0;
        setStatus("connected");
      };

      // Handle CONNECTED event (initial connection confirmation)
      eventSource.addEventListener("CONNECTED", () => {
        retryCountRef.current = 0;
        setStatus("connected");
      });

      // Handle board events that require cache invalidation
      const handleBoardEvent = (event: MessageEvent) => {
        try {
          const data = JSON.parse(event.data) as BoardEvent;

          // Call optional event callback (using ref to avoid stale closure)
          onEventRef.current?.(data);

          // Invalidate board query to trigger refetch
          queryClient.invalidateQueries({
            queryKey: getGetBoardQueryKey(boardId),
          });
        } catch {
          // Ignore parse errors for non-JSON events
        }
      };

      // Subscribe to all board event types
      eventSource.addEventListener("TASK_CREATED", handleBoardEvent);
      eventSource.addEventListener("TASK_UPDATED", handleBoardEvent);
      eventSource.addEventListener("TASK_DELETED", handleBoardEvent);
      eventSource.addEventListener("TASK_MOVED", handleBoardEvent);
      eventSource.addEventListener("BOARD_UPDATED", handleBoardEvent);
      eventSource.addEventListener("COLUMN_CREATED", handleBoardEvent);
      eventSource.addEventListener("COLUMN_UPDATED", handleBoardEvent);
      eventSource.addEventListener("COLUMN_DELETED", handleBoardEvent);
      eventSource.addEventListener("COLUMN_MOVED", handleBoardEvent);

      eventSource.onerror = () => {
        setStatus("error");
        eventSource.close();
        eventSourceRef.current = null;

        // Check if max retries exceeded
        if (retryCountRef.current >= MAX_RETRY_ATTEMPTS) {
          setStatus("disconnected");
          return;
        }

        // Calculate exponential backoff delay
        const delay = Math.min(
          INITIAL_RETRY_DELAY * Math.pow(2, retryCountRef.current),
          MAX_RETRY_DELAY,
        );
        retryCountRef.current += 1;

        // Attempt reconnection with backoff
        reconnectTimeoutRef.current = setTimeout(() => {
          connect();
        }, delay);
      };
    } catch {
      setStatus("error");
    }
  }, [boardId, enabled, queryClient]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    retryCountRef.current = 0;
    setStatus("disconnected");
  }, []);

  // Manual reconnect resets retry count
  const reconnect = useCallback(() => {
    retryCountRef.current = 0;
    connect();
  }, [connect]);

  // Connect on mount, disconnect on unmount
  useEffect(() => {
    if (enabled) {
      connect();
    }

    return () => {
      disconnect();
    };
  }, [connect, disconnect, enabled]);

  return {
    status,
    reconnect,
    disconnect,
  };
}
