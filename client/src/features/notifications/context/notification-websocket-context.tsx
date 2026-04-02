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
import { getAuthToken } from "@/features/auth/token-provider";
import { useAuth0Context } from "@/features/auth/hooks/use-auth0-context";
import { env } from "@/config/env";
import {
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

interface NotificationWebSocketProviderProps {
  children: ReactNode;
}

export function NotificationWebSocketProvider({
  children,
}: NotificationWebSocketProviderProps) {
  const auth = useAuth0Context();
  const queryClient = useQueryClient();
  const clientRef = useRef<Client | null>(null);
  const connectRef = useRef<() => Promise<void>>(async () => {});
  const isMountedRef = useRef(false);
  const [status, setStatus] = useState<ConnectionStatus>("disconnected");
  const [unreadCount, setUnreadCount] = useState(0);

  const userId = auth.user?.sub;
  const isAuthenticated = auth.isAuthenticated;

  const disconnect = useCallback(() => {
    const client = clientRef.current;
    clientRef.current = null;
    if (client?.active) {
      void client.deactivate();
    }
    setStatus("disconnected");
  }, []);

  const connect = useCallback(async () => {
    if (!userId || !isAuthenticated) {
      return;
    }

    const token = await getAuthToken();
    if (!token) {
      setStatus("error");
      return;
    }

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
      reconnectDelay: 5000,
      heartbeatIncoming: 20000,
      heartbeatOutgoing: 20000,

      onConnect: () => {
        if (!isMountedRef.current) {
          void client.deactivate();
          return;
        }

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
                queryKey: getGetNotificationsQueryKey(),
              });
              void queryClient.invalidateQueries({
                queryKey: getGetUnreadCountQueryKey(),
              });
            } catch (e) {
              console.error("Failed to parse notification message:", e);
            }
          },
          { Authorization: `Bearer ${token}` },
        );
      },

      onStompError: (frame) => {
        console.error("STOMP error:", frame.headers["message"]);
        setStatus("error");
      },

      onWebSocketClose: () => {
        if (isMountedRef.current && clientRef.current === client) {
          setStatus("disconnected");
        }
      },

      onWebSocketError: () => {
        setStatus("error");
      },
    });

    clientRef.current = client;
    client.activate();
  }, [userId, isAuthenticated, queryClient]);

  connectRef.current = connect;

  const reconnect = useCallback(() => {
    void connectRef.current();
  }, []);

  // Connect when authenticated
  useEffect(() => {
    isMountedRef.current = true;

    if (isAuthenticated && userId) {
      void connect();
    }

    return () => {
      isMountedRef.current = false;
      disconnect();
    };
  }, [isAuthenticated, userId, connect, disconnect]);

  // Sync unread count from API
  useEffect(() => {
    if (!isAuthenticated) {
      setUnreadCount(0);
      return;
    }

    // Initial fetch of unread count happens via the component that uses this context
  }, [isAuthenticated]);

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
