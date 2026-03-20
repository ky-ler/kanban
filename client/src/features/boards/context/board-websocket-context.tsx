/* eslint-disable react-refresh/only-export-components */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Client, type IMessage } from "@stomp/stompjs";
import { getGetBoardQueryKey } from "@/api/gen/endpoints/board-controller/board-controller";
import { getAuthToken } from "@/features/auth/token-provider";
import { env } from "@/config/env";

export interface BoardEvent {
  type: string;
  boardId: string;
  entityId: string | null;
  details: string | null;
}

type ConnectionStatus =
  | "connecting"
  | "connected"
  | "retrying"
  | "disconnected"
  | "error";

type FailureReason = "auth" | "access" | "network" | "protocol" | null;

interface BoardWebSocketContextType {
  status: ConnectionStatus;
  retryAttempt: number;
  failureReason: FailureReason;
  reconnect: () => void;
  disconnect: () => void;
  registerListener: (listener: (event: BoardEvent) => void) => () => void;
  registerPendingMutation: (entityId: string) => void;
  clearPendingMutation: (entityId: string) => void;
}

const BoardWebSocketContext = createContext<BoardWebSocketContextType | null>(
  null,
);

const INITIAL_RETRY_DELAY = 1000;
const MAX_RETRY_DELAY = 30000;
const MAX_RETRY_ATTEMPTS = 5;
const PENDING_MUTATION_TIMEOUT = 5000;

const STRUCTURE_MODIFYING_EVENTS = [
  "TASK_CREATED",
  "TASK_UPDATED",
  "TASK_DELETED",
  "TASK_MOVED",
  "BOARD_UPDATED",
  "COLUMN_CREATED",
  "COLUMN_UPDATED",
  "COLUMN_DELETED",
  "COLUMN_MOVED",
];

interface BoardWebSocketProviderProps {
  boardId: string;
  children: ReactNode;
  enabled?: boolean;
}

export function BoardWebSocketProvider({
  boardId,
  children,
  enabled = true,
}: BoardWebSocketProviderProps) {
  const queryClient = useQueryClient();
  const clientRef = useRef<Client | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const connectRef = useRef<() => Promise<void>>(async () => {});
  const retryCountRef = useRef(0);
  const manualDisconnectRef = useRef(false);
  const connectionGenerationRef = useRef(0);
  const isMountedRef = useRef(false);
  const listenersRef = useRef<Set<(event: BoardEvent) => void>>(new Set());
  const pendingMutationsRef = useRef<Set<string>>(new Set());
  const pendingTimersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(
    new Map(),
  );
  const shouldLogDebug = import.meta.env.DEV;
  const [connection, setConnection] = useState<{
    status: ConnectionStatus;
    retryAttempt: number;
    failureReason: FailureReason;
  }>({
    status: "disconnected",
    retryAttempt: 0,
    failureReason: null,
  });

  const clearReconnectTimeout = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
  }, []);

  const clearPendingMutationTimers = useCallback(() => {
    pendingTimersRef.current.forEach((timer) => clearTimeout(timer));
    pendingTimersRef.current.clear();
    pendingMutationsRef.current.clear();
  }, []);

  const classifyFailureReason = useCallback((message?: string | null) => {
    if (!message) {
      return null;
    }

    const normalizedMessage = message.toLowerCase();

    if (
      normalizedMessage.includes("board_access_denied") ||
      normalizedMessage.includes("not a collaborator")
    ) {
      return "access" as const;
    }

    if (
      /authoriz|auth|forbidden|jwt/.test(normalizedMessage) &&
      !normalizedMessage.includes("board subscription forbidden")
    ) {
      return "auth" as const;
    }

    if (normalizedMessage.includes("board subscription forbidden")) {
      return "access" as const;
    }

    return null;
  }, []);

  const updateConnection = useCallback(
    (
      status: ConnectionStatus,
      retryAttempt = retryCountRef.current,
      failureReason: FailureReason = null,
    ) => {
      setConnection({ status, retryAttempt, failureReason });
    },
    [],
  );

  const handleAuthFailure = useCallback(() => {
    clearReconnectTimeout();
    const client = clientRef.current;
    clientRef.current = null;
    if (client?.active) {
      void client.deactivate();
    }
    retryCountRef.current = 0;
    updateConnection("error", 0, "auth");
  }, [clearReconnectTimeout, updateConnection]);

  const handleAccessDenied = useCallback(() => {
    clearReconnectTimeout();
    const client = clientRef.current;
    clientRef.current = null;
    if (client?.active) {
      void client.deactivate();
    }
    retryCountRef.current = 0;
    updateConnection("error", 0, "access");
  }, [clearReconnectTimeout, updateConnection]);

  const registerListener = useCallback(
    (listener: (event: BoardEvent) => void) => {
      listenersRef.current.add(listener);

      return () => {
        listenersRef.current.delete(listener);
      };
    },
    [],
  );

  const registerPendingMutation = useCallback((entityId: string) => {
    pendingMutationsRef.current.add(entityId);

    const existing = pendingTimersRef.current.get(entityId);
    if (existing) {
      clearTimeout(existing);
    }

    const timer = setTimeout(() => {
      pendingMutationsRef.current.delete(entityId);
      pendingTimersRef.current.delete(entityId);
    }, PENDING_MUTATION_TIMEOUT);

    pendingTimersRef.current.set(entityId, timer);
  }, []);

  const clearPendingMutation = useCallback((entityId: string) => {
    pendingMutationsRef.current.delete(entityId);
    const timer = pendingTimersRef.current.get(entityId);

    if (timer) {
      clearTimeout(timer);
      pendingTimersRef.current.delete(entityId);
    }
  }, []);

  const scheduleReconnect = useCallback(
    (failureReason: Exclude<FailureReason, null>, generation: number) => {
      if (
        manualDisconnectRef.current ||
        !isMountedRef.current ||
        connectionGenerationRef.current !== generation
      ) {
        return;
      }

      if (reconnectTimeoutRef.current) {
        return;
      }

      if (retryCountRef.current >= MAX_RETRY_ATTEMPTS) {
        updateConnection("error", retryCountRef.current, failureReason);
        return;
      }

      retryCountRef.current += 1;
      const nextAttempt = retryCountRef.current;
      const delay = Math.min(
        INITIAL_RETRY_DELAY * Math.pow(2, nextAttempt - 1),
        MAX_RETRY_DELAY,
      );

      updateConnection("retrying", nextAttempt, failureReason);
      reconnectTimeoutRef.current = setTimeout(() => {
        reconnectTimeoutRef.current = null;

        if (
          manualDisconnectRef.current ||
          !isMountedRef.current ||
          connectionGenerationRef.current !== generation
        ) {
          return;
        }

        void connectRef.current();
      }, delay);
    },
    [updateConnection],
  );

  const connect = useCallback(async () => {
    if (!enabled || !boardId) {
      return;
    }

    manualDisconnectRef.current = false;
    clearReconnectTimeout();
    connectionGenerationRef.current += 1;
    const generation = connectionGenerationRef.current;
    const existingClient = clientRef.current;
    clientRef.current = null;

    if (existingClient?.active) {
      void existingClient.deactivate();
    }

    updateConnection("connecting", retryCountRef.current, null);

    try {
      const token = await getAuthToken();

      if (
        !isMountedRef.current ||
        manualDisconnectRef.current ||
        connectionGenerationRef.current !== generation
      ) {
        return;
      }

      if (!token) {
        handleAuthFailure();
        return;
      }

      const baseUrl = env.VITE_API_URL.replace(/\/$/, "").replace(
        /^http/,
        "ws",
      );
      const wsUrl = `${baseUrl}/ws`;

      if (shouldLogDebug) {
        console.debug("[WebSocket] Connecting to:", wsUrl);
      }

      const client = new Client({
        brokerURL: wsUrl,
        connectHeaders: {
          Authorization: `Bearer ${token}`,
        },
        reconnectDelay: 0,
        heartbeatIncoming: 20000,
        heartbeatOutgoing: 20000,
        onConnect: () => {
          if (
            !isMountedRef.current ||
            manualDisconnectRef.current ||
            connectionGenerationRef.current !== generation
          ) {
            void client.deactivate();
            return;
          }

          retryCountRef.current = 0;
          updateConnection("connected", 0, null);

          client.subscribe(
            `/topic/boards/${boardId}`,
            (message: IMessage) => {
              try {
                const event = JSON.parse(message.body) as BoardEvent;

                if (shouldLogDebug) {
                  console.debug("[WebSocket] Received event:", event);
                }

                const isPending =
                  event.entityId &&
                  pendingMutationsRef.current.has(event.entityId);

                if (
                  STRUCTURE_MODIFYING_EVENTS.includes(event.type) &&
                  !isPending
                ) {
                  queryClient.invalidateQueries({
                    queryKey: getGetBoardQueryKey(boardId),
                  });
                }

                listenersRef.current.forEach((listener) => {
                  try {
                    listener(event);
                  } catch (error) {
                    if (shouldLogDebug) {
                      console.error("Error in board event listener:", error);
                    }
                  }
                });
              } catch (error) {
                if (shouldLogDebug) {
                  console.error("[WebSocket] Error parsing message:", error);
                }
              }
            },
            {
              Authorization: `Bearer ${token}`,
            },
          );
        },
        onStompError: (frame) => {
          const message =
            frame.headers.message ?? frame.body ?? "Unknown STOMP error";
          const failureReason = classifyFailureReason(message);

          if (shouldLogDebug) {
            console.error("[WebSocket] STOMP error:", message);
          }

          if (failureReason === "access") {
            handleAccessDenied();
            return;
          }

          if (failureReason === "auth") {
            handleAuthFailure();
            return;
          }

          if (
            manualDisconnectRef.current ||
            !isMountedRef.current ||
            connectionGenerationRef.current !== generation
          ) {
            return;
          }

          scheduleReconnect("protocol", generation);
        },
        onWebSocketClose: (event) => {
          clientRef.current = null;

          if (
            manualDisconnectRef.current ||
            !isMountedRef.current ||
            connectionGenerationRef.current !== generation
          ) {
            updateConnection("disconnected", 0, null);
            return;
          }

          const isAuthClose = event.code === 1008;
          const failureReason =
            classifyFailureReason(event.reason) ??
            (isAuthClose ? "auth" : null);

          if (failureReason === "access") {
            handleAccessDenied();
            return;
          }

          if (failureReason === "auth") {
            handleAuthFailure();
            return;
          }

          scheduleReconnect("network", generation);
        },
        onWebSocketError: () => {
          if (
            manualDisconnectRef.current ||
            !isMountedRef.current ||
            connectionGenerationRef.current !== generation
          ) {
            return;
          }

          scheduleReconnect("network", generation);
        },
      });

      clientRef.current = client;
      client.activate();
    } catch (error) {
      if (shouldLogDebug) {
        console.error("[WebSocket] Connection error:", error);
      }

      if (
        !isMountedRef.current ||
        manualDisconnectRef.current ||
        connectionGenerationRef.current !== generation
      ) {
        return;
      }

      handleAuthFailure();
    }
  }, [
    boardId,
    clearReconnectTimeout,
    classifyFailureReason,
    enabled,
    handleAuthFailure,
    handleAccessDenied,
    queryClient,
    scheduleReconnect,
    shouldLogDebug,
    updateConnection,
  ]);

  connectRef.current = connect;

  const disconnect = useCallback(() => {
    manualDisconnectRef.current = true;
    connectionGenerationRef.current += 1;
    clearReconnectTimeout();
    const client = clientRef.current;
    clientRef.current = null;

    if (client?.active) {
      void client.deactivate();
    }

    retryCountRef.current = 0;
    updateConnection("disconnected", 0, null);
  }, [clearReconnectTimeout, updateConnection]);

  const reconnect = useCallback(() => {
    manualDisconnectRef.current = false;
    retryCountRef.current = 0;
    void connect();
  }, [connect]);

  useEffect(() => {
    isMountedRef.current = true;

    if (enabled) {
      void connect();
    }

    return () => {
      isMountedRef.current = false;
      clearPendingMutationTimers();
      disconnect();
    };
  }, [clearPendingMutationTimers, connect, disconnect, enabled]);

  const value = {
    status: connection.status,
    retryAttempt: connection.retryAttempt,
    failureReason: connection.failureReason,
    reconnect,
    disconnect,
    registerListener,
    registerPendingMutation,
    clearPendingMutation,
  };

  return (
    <BoardWebSocketContext.Provider value={value}>
      {children}
    </BoardWebSocketContext.Provider>
  );
}

export function useBoardWebSocket() {
  return useContext(BoardWebSocketContext);
}
