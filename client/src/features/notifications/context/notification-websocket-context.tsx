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
import { Client, type IMessage, ReconnectionTimeMode } from "@stomp/stompjs";
import { getAuthToken } from "@/features/auth/token-provider";
import { useAuth0Context } from "@/features/auth/hooks/use-auth0-context";
import { env } from "@/config/env";
import {
  getGetNotificationsInfiniteQueryKey,
  getGetNotificationsQueryKey,
  getGetUnreadCountQueryKey,
} from "@/api/gen/endpoints/notification-controller/notification-controller";

export interface NotificationEvent {
  id: string;
  type: string;
  message: string;
  isRead: boolean;
  actor: {
    id: string;
    username: string;
    profileImageUrl: string;
  };
  taskId: string;
  taskTitle: string;
  boardId: string;
  boardName: string;
  dateCreated: string;
}

type ConnectionStatus = "connecting" | "connected" | "disconnected" | "error";

interface NotificationWebSocketContextType {
  status: ConnectionStatus;
  unreadCount: number;
  reconnect: () => void;
  disconnect: () => void;
}

const NotificationWebSocketContext =
  createContext<NotificationWebSocketContextType | null>(null);

const MAX_AUTH_FAILURES = 3;

interface NotificationWebSocketProviderProps {
  children: ReactNode;
}

export function NotificationWebSocketProvider({
  children,
}: NotificationWebSocketProviderProps) {
  const auth = useAuth0Context();
  const queryClient = useQueryClient();
  const clientRef = useRef<Client | null>(null);
  const isMountedRef = useRef(false);
  const manualDisconnectRef = useRef(false);
  const currentTokenRef = useRef<string | null>(null);
  const authFailureCountRef = useRef(0);
  const [status, setStatus] = useState<ConnectionStatus>("disconnected");
  const [unreadCount, setUnreadCount] = useState(0);

  const userId = auth.user?.sub;
  const isAuthenticated = auth.isAuthenticated;

  const disconnect = useCallback(() => {
    manualDisconnectRef.current = true;
    const client = clientRef.current;
    clientRef.current = null;
    if (client?.active) {
      void client.deactivate();
    }
    setStatus("disconnected");
    setUnreadCount(0);
  }, []);

  const connect = useCallback(async () => {
    if (!userId || !isAuthenticated) {
      return;
    }

    manualDisconnectRef.current = false;
    authFailureCountRef.current = 0;

    const token = await getAuthToken();
    if (!token) {
      setStatus("error");
      return;
    }
    currentTokenRef.current = token;

    // Disconnect existing connection
    if (clientRef.current?.active) {
      await clientRef.current.deactivate();
    }

    const baseUrl = env.VITE_API_URL.replace(/\/$/, "").replace(/^http/, "ws");
    const wsUrl = `${baseUrl}/ws`;

    setStatus("connecting");

    const client = new Client({
      brokerURL: wsUrl,
      connectHeaders: {
        Authorization: `Bearer ${token}`,
      },
      reconnectDelay: 2000,
      reconnectTimeMode: ReconnectionTimeMode.EXPONENTIAL,
      maxReconnectDelay: 30000,
      heartbeatIncoming: 20000,
      heartbeatOutgoing: 20000,

      beforeConnect: async (stompClient) => {
        if (manualDisconnectRef.current || !isMountedRef.current) {
          return;
        }

        try {
          const freshToken = await getAuthToken();
          if (freshToken) {
            currentTokenRef.current = freshToken;
            stompClient.connectHeaders = {
              Authorization: `Bearer ${freshToken}`,
            };
            authFailureCountRef.current = 0;
          } else {
            authFailureCountRef.current += 1;
          }
        } catch {
          authFailureCountRef.current += 1;
        }

        if (authFailureCountRef.current >= MAX_AUTH_FAILURES) {
          setStatus("error");
          void stompClient.deactivate();
        }
      },

      onConnect: () => {
        if (!isMountedRef.current) {
          void client.deactivate();
          return;
        }

        authFailureCountRef.current = 0;
        setStatus("connected");

        // Subscribe to user's notification topic
        client.subscribe(
          `/topic/users/${userId}/notifications`,
          (message: IMessage) => {
            try {
              const notification = JSON.parse(
                message.body,
              ) as NotificationEvent;

              // Increment unread count optimistically
              if (!notification.isRead) {
                setUnreadCount((prev) => prev + 1);
              }

              // Invalidate notification queries to refresh the list
              void queryClient.invalidateQueries({
                queryKey: getGetNotificationsInfiniteQueryKey(),
              });
              void queryClient.invalidateQueries({
                queryKey: getGetNotificationsQueryKey(),
              });
              void queryClient.invalidateQueries({
                queryKey: getGetUnreadCountQueryKey(),
              });
            } catch (e) {
              console.error("Failed to parse notification message:", e);
            }
          },
          { Authorization: `Bearer ${currentTokenRef.current}` },
        );
      },

      onStompError: (frame) => {
        if (import.meta.env.DEV) {
          console.debug("Notification STOMP error:", frame.headers["message"]);
        }
        // STOMP.js auto-reconnect with beforeConnect will handle retry
      },

      onWebSocketClose: () => {
        if (isMountedRef.current && clientRef.current === client) {
          if (manualDisconnectRef.current) {
            setStatus("disconnected");
          }
          // Otherwise STOMP.js auto-reconnect handles it
        }
      },

      onWebSocketError: () => {
        // STOMP.js auto-reconnect with beforeConnect will handle retry
      },
    });

    clientRef.current = client;
    client.activate();
  }, [userId, isAuthenticated, queryClient]);

  const reconnect = useCallback(() => {
    void connect();
  }, [connect]);

  // Connect when authenticated
  useEffect(() => {
    isMountedRef.current = true;
    const connectTimer =
      isAuthenticated && userId
        ? setTimeout(() => {
            void connect();
          }, 0)
        : null;

    return () => {
      if (connectTimer) {
        clearTimeout(connectTimer);
      }
      isMountedRef.current = false;
      disconnect();
    };
  }, [isAuthenticated, userId, connect, disconnect]);

  const value: NotificationWebSocketContextType = {
    status,
    unreadCount,
    reconnect,
    disconnect,
  };

  return (
    <NotificationWebSocketContext.Provider value={value}>
      {children}
    </NotificationWebSocketContext.Provider>
  );
}

export function useNotificationWebSocket() {
  const context = useContext(NotificationWebSocketContext);
  if (!context) {
    throw new Error(
      "useNotificationWebSocket must be used within NotificationWebSocketProvider",
    );
  }
  return context;
}

export function useNotificationWebSocketOptional() {
  return useContext(NotificationWebSocketContext);
}
