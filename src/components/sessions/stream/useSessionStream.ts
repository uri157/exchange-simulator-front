"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import type { WsTradeData } from "@/lib/types";
import { buildWsRequest, parseWsEventData } from "@/lib/ws";

import type { ConnectionState } from "./types";

interface UseSessionStreamOptions {
  sessionId: string;
  enabled: boolean;
  streams: string;
  onTrade: (trade: WsTradeData) => void;
  onReset: () => void;
}

interface SocketHandlers {
  handleOpen: (event: Event) => void;
  handleMessage: (event: MessageEvent) => void;
  handleClose: (event: CloseEvent) => void;
  handleError: (event: Event) => void;
}

interface UseSessionStreamState {
  connectionState: ConnectionState;
  isConnecting: boolean;
  connections: number | null;
  activeStream: string | null;
  lastTrade: WsTradeData | null;
  closeMessage: string | null;
  errorMessage: string | null;
  consumedUrl: string | null;
  consumedQuery: string | null;
}

interface UseSessionStreamResult extends UseSessionStreamState {
  connect: () => void;
  disconnect: () => void;
}

export function useSessionStream({
  sessionId,
  enabled,
  streams,
  onTrade,
  onReset,
}: UseSessionStreamOptions): UseSessionStreamResult {
  const [connectionState, setConnectionState] = useState<ConnectionState>("idle");
  const [isConnecting, setIsConnecting] = useState(false);
  const [connections, setConnections] = useState<number | null>(null);
  const [activeStream, setActiveStream] = useState<string | null>(null);
  const [lastTrade, setLastTrade] = useState<WsTradeData | null>(null);
  const [closeMessage, setCloseMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [consumedUrl, setConsumedUrl] = useState<string | null>(null);
  const [consumedQuery, setConsumedQuery] = useState<string | null>(null);

  const socketRef = useRef<WebSocket | null>(null);
  const closingManuallyRef = useRef(false);
  const handlersRef = useRef<SocketHandlers | null>(null);

  const trimmedStreams = useMemo(() => streams.trim(), [streams]);

  const cleanupSocket = useCallback(() => {
    const socket = socketRef.current;
    const handlers = handlersRef.current;

    if (socket && handlers) {
      socket.removeEventListener("open", handlers.handleOpen);
      socket.removeEventListener("message", handlers.handleMessage);
      socket.removeEventListener("close", handlers.handleClose);
      socket.removeEventListener("error", handlers.handleError);
    }

    socketRef.current = null;
    handlersRef.current = null;
  }, []);

  const resetRuntimeState = useCallback(() => {
    setConnections(null);
    setLastTrade(null);
    onReset();
  }, [onReset]);

  const disconnect = useCallback(() => {
    console.debug("[useSessionStream] disconnect requested", {
      sessionId,
      readyState: socketRef.current?.readyState,
    });

    const socket = socketRef.current;
    if (!socket) {
      cleanupSocket();
      resetRuntimeState();
      setConnectionState("closed");
      setCloseMessage("Conexión cerrada");
      setErrorMessage(null);
      setActiveStream(null);
      setIsConnecting(false);
      return;
    }

    if (socket.readyState === WebSocket.CLOSING || socket.readyState === WebSocket.CLOSED) {
      return;
    }

    closingManuallyRef.current = true;
    try {
      socket.close(1000, "Client disconnected");
    } catch (error) {
      console.debug("[useSessionStream] socket.close threw", { sessionId, error });
      cleanupSocket();
      resetRuntimeState();
      setConnectionState("closed");
      setCloseMessage("Conexión cerrada");
      setErrorMessage(null);
      setActiveStream(null);
      setIsConnecting(false);
    }
  }, [cleanupSocket, resetRuntimeState, sessionId]);

  const connect = useCallback(() => {
    console.debug("[useSessionStream] connect requested", {
      sessionId,
      isConnecting,
      connectionState,
      streams: trimmedStreams,
    });

    if (isConnecting || connectionState === "connected") {
      return;
    }

    const existing = socketRef.current;
    if (existing && (existing.readyState === WebSocket.CONNECTING || existing.readyState === WebSocket.OPEN)) {
      return;
    }

    if (!trimmedStreams) {
      console.debug("[useSessionStream] connect aborted: empty streams", { sessionId });
      toast.error("Ingresá un stream válido");
      return;
    }

    if (!enabled) {
      console.debug("[useSessionStream] connect aborted: session disabled", { sessionId });
      toast.error("La sesión está deshabilitada");
      return;
    }

    try {
      setIsConnecting(true);
      setConnectionState("connecting");
      setCloseMessage(null);
      setErrorMessage(null);
      setActiveStream(trimmedStreams);
      resetRuntimeState();

      const request = buildWsRequest({ sessionId, streams: trimmedStreams });
      console.debug("[useSessionStream] opening websocket", {
        sessionId,
        url: request.url,
        query: request.query,
      });
      setConsumedUrl(request.url);
      setConsumedQuery(request.query);

      const socket = new WebSocket(request.url);
      socketRef.current = socket;
      closingManuallyRef.current = false;

      const handleOpen = () => {
        console.debug("[useSessionStream] websocket open", {
          sessionId,
          url: socket.url,
        });
        setIsConnecting(false);
        setConnectionState("connected");
      };

      const handleMessage = (event: MessageEvent) => {
        const message = parseWsEventData(event.data);
        if (!message) return;

        if (message.event === "trade") {
          console.debug("[useSessionStream] websocket message:trade", {
            sessionId,
            stream: message.stream,
            eventTime: message.data.eventTime,
          });
          setLastTrade(message.data);
          onTrade(message.data);
          return;
        }

        if (message.event === "stats") {
          console.debug("[useSessionStream] websocket message:stats", {
            sessionId,
            connections: message.data.connections,
          });
          setConnections(message.data.connections);
          return;
        }

        if (message.event === "warning") {
          console.debug("[useSessionStream] websocket message:warning", {
            sessionId,
            stream: message.stream,
            type: message.data.type,
            skipped: message.data.skipped,
          });
          const skipped =
            typeof message.data.skipped === "number" && Number.isFinite(message.data.skipped)
              ? ` — eventos omitidos: ${message.data.skipped}`
              : "";
          const streamLabel = message.stream ? ` (${message.stream})` : "";
          toast.warning(`Aviso del stream${streamLabel}: ${message.data.type}${skipped}`);
        }
      };

      const handleClose = (event: CloseEvent) => {
        console.debug("[useSessionStream] websocket close", {
          sessionId,
          code: event.code,
          reason: event.reason,
          wasClean: event.wasClean,
          closedByUser: closingManuallyRef.current,
        });
        cleanupSocket();
        resetRuntimeState();
        setIsConnecting(false);
        setActiveStream(null);

        if (event.code === 1000) {
          const reason = closingManuallyRef.current ? "Conexión cerrada por el usuario" : "Conexión cerrada";
          setCloseMessage(reason);
          setErrorMessage(null);
          setConnectionState("closed");
        } else {
          const detail = event.reason ? `${event.code} - ${event.reason}` : String(event.code);
          const message = `Conexión interrumpida (${detail})`;
          setErrorMessage(message);
          setCloseMessage(null);
          setConnectionState("error");
          toast.error(message);
        }

        closingManuallyRef.current = false;
      };

      const handleError = () => {
        console.debug("[useSessionStream] websocket error", {
          sessionId,
        });
        setIsConnecting(false);
        setConnectionState("error");
        setErrorMessage("Error en la conexión de WebSocket");
      };

      handlersRef.current = { handleOpen, handleMessage, handleClose, handleError };

      socket.addEventListener("open", handleOpen);
      socket.addEventListener("message", handleMessage);
      socket.addEventListener("close", handleClose);
      socket.addEventListener("error", handleError);
    } catch (error) {
      setIsConnecting(false);
      setConnectionState("error");
      setActiveStream(null);
      const message = error instanceof Error ? error.message : "No se pudo conectar al stream";
      setErrorMessage(message);
      setCloseMessage(null);
      resetRuntimeState();
      console.debug("[useSessionStream] websocket connection failed", {
        sessionId,
        error,
      });
      toast.error(message);
    }
  }, [
    cleanupSocket,
    connectionState,
    enabled,
    isConnecting,
    onTrade,
    resetRuntimeState,
    sessionId,
    trimmedStreams,
  ]);

  useEffect(() => {
    console.debug("[useSessionStream] mounting", { sessionId });
    return () => {
      console.debug("[useSessionStream] unmounting", { sessionId });
      const socket = socketRef.current;
      if (socket && socket.readyState !== WebSocket.CLOSED) {
        try {
          closingManuallyRef.current = true;
          socket.close(1000, "Component disposed");
        } catch (error) {
          console.debug("[useSessionStream] socket.close on unmount threw", { sessionId, error });
        }
      }
      cleanupSocket();
    };
  }, [cleanupSocket, sessionId]);

  useEffect(() => {
    console.debug("[useSessionStream] session enabled changed", { sessionId, enabled });
    if (enabled) {
      return;
    }
    if (!socketRef.current) {
      return;
    }
    disconnect();
  }, [disconnect, enabled, sessionId]);

  useEffect(() => {
    console.debug("[useSessionStream] streams updated", { sessionId, streams });
  }, [sessionId, streams]);

  return {
    connectionState,
    isConnecting,
    connections,
    activeStream,
    lastTrade,
    closeMessage,
    errorMessage,
    consumedUrl,
    consumedQuery,
    connect,
    disconnect,
  };
}
