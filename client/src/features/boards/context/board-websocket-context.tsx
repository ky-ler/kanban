import { createContext, useContext, useEffect, useRef, useState, useCallback, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Client, type IMessage } from "@stomp/stompjs";
import { getAuthToken } from "@/features/auth/token-provider";
import { env } from "@/config/env";
import { getGetBoardQueryKey } from "@/api/gen/endpoints/board-controller/board-controller";

// Type definitions
export interface BoardEvent {
    type: string;
    boardId: string;
    entityId: string | null;
    details: string | null;
}

type ConnectionStatus = "connecting" | "connected" | "disconnected" | "error";

interface BoardWebSocketContextType {
    status: ConnectionStatus;
    reconnect: () => void;
    disconnect: () => void;
    registerListener: (listener: (event: BoardEvent) => void) => () => void;
}

const BoardWebSocketContext = createContext<BoardWebSocketContextType | null>(null);

const INITIAL_RETRY_DELAY = 1000;
const MAX_RETRY_DELAY = 30000;
const MAX_RETRY_ATTEMPTS = 5;

// List of events that require full board structure invalidation
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
    enabled = true
}: BoardWebSocketProviderProps) {
    const queryClient = useQueryClient();
    const clientRef = useRef<Client | null>(null);
    const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const retryCountRef = useRef(0);
    const [status, setStatus] = useState<ConnectionStatus>("disconnected");

    // Set of listeners to notify when events arrive
    const listenersRef = useRef<Set<(event: BoardEvent) => void>>(new Set());

    // Function to register a listener (used by hooks)
    const registerListener = useCallback((listener: (event: BoardEvent) => void) => {
        listenersRef.current.add(listener);
        // Return unsubscribe function
        return () => {
            listenersRef.current.delete(listener);
        };
    }, []);

    const connect = useCallback(async () => {
        if (!enabled || !boardId) return;

        // Clean up existing connection
        if (clientRef.current?.active) {
            clientRef.current.deactivate();
        }

        setStatus("connecting");

        try {
            const token = await getAuthToken();
            // Convert http(s) to ws(s) for native WebSocket
            const baseUrl = env.VITE_API_URL.replace(/\/$/, "").replace(
                /^http/,
                "ws",
            );
            const wsUrl = `${baseUrl}/ws`;
            console.log("[WebSocket] Connecting to:", wsUrl);

            const client = new Client({
                brokerURL: wsUrl,
                connectHeaders: {
                    Authorization: `Bearer ${token}`,
                },
                // debug: (str) => {
                //   console.debug("[STOMP]", str);
                // },
                reconnectDelay: 0, // We handle reconnection ourselves

                onConnect: () => {
                    retryCountRef.current = 0;
                    setStatus("connected");
                    console.log(
                        `[WebSocket] Connected, subscribing to /topic/boards/${boardId}`,
                    );

                    // Subscribe to the board's topic
                    client.subscribe(`/topic/boards/${boardId}`, (message: IMessage) => {
                        try {
                            const event = JSON.parse(message.body) as BoardEvent;
                            console.log("[WebSocket] Received event:", event);

                            // 1. Invalidate queries if needed (global handling)
                            if (STRUCTURE_MODIFYING_EVENTS.includes(event.type)) {
                                queryClient.invalidateQueries({
                                    queryKey: getGetBoardQueryKey(boardId),
                                });
                            }

                            // 2. Notify all registered listeners
                            listenersRef.current.forEach(listener => {
                                try {
                                    listener(event);
                                } catch (err) {
                                    console.error("Error in board event listener:", err);
                                }
                            });

                        } catch (e) {
                            console.error("[WebSocket] Error parsing message:", e);
                        }
                    });
                },

                onStompError: (frame) => {
                    console.error("[WebSocket] STOMP error:", frame.headers.message);
                    setStatus("error");
                },

                onWebSocketClose: () => {
                    console.log("[WebSocket] Connection closed");
                    setStatus("disconnected");
                    clientRef.current = null;

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
                },
            });

            clientRef.current = client;
            client.activate();
        } catch (e) {
            console.error("[WebSocket] Connection error:", e);
            setStatus("error");
        }
    }, [boardId, enabled, queryClient]);

    const disconnect = useCallback(() => {
        if (reconnectTimeoutRef.current) {
            clearTimeout(reconnectTimeoutRef.current);
            reconnectTimeoutRef.current = null;
        }
        if (clientRef.current?.active) {
            clientRef.current.deactivate();
            clientRef.current = null;
        }
        retryCountRef.current = 0;
        setStatus("disconnected");
    }, []);

    const reconnect = useCallback(() => {
        retryCountRef.current = 0;
        connect();
    }, [connect]);

    // Connect on mount (or when boardId changes)
    useEffect(() => {
        if (enabled) {
            connect();
        }
        return () => {
            disconnect();
        };
    }, [connect, disconnect, enabled]);

    const value = {
        status,
        reconnect,
        disconnect,
        registerListener,
    };

    return (
        <BoardWebSocketContext.Provider value={value}>
            {children}
        </BoardWebSocketContext.Provider>
    );
}

export function useBoardWebSocket() {
    const context = useContext(BoardWebSocketContext);
    if (!context) {
        throw new Error("useBoardWebSocket must be used within a BoardWebSocketProvider");
    }
    return context;
}
