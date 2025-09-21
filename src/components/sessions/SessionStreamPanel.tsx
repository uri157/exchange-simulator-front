"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { SessionResponse } from "@/lib/api-types";
import { formatDateTime, formatNumber } from "@/lib/time";
import type { WsKlineData } from "@/lib/types";
import { buildWsRequest, parseWsEventData } from "@/lib/ws";

interface SessionStreamPanelProps {
  session: SessionResponse;
  streams: string;
  onStreamsChange: (value: string) => void;
  onKline: (kline: WsKlineData) => void;
  onReset: () => void;
  receivedCount: number;
}

type ConnectionState = "idle" | "connecting" | "connected" | "closed" | "error";

interface SocketHandlers {
  handleOpen: (event: Event) => void;
  handleMessage: (event: MessageEvent) => void;
  handleClose: (event: CloseEvent) => void;
  handleError: (event: Event) => void;
}

export function SessionStreamPanel({
  session,
  streams,
  onStreamsChange,
  onKline,
  onReset,
  receivedCount,
}: SessionStreamPanelProps) {
  const [connectionState, setConnectionState] = useState<ConnectionState>("idle");
  const [isConnecting, setIsConnecting] = useState(false);
  const [connections, setConnections] = useState<number | null>(null);
  const [consumedUrl, setConsumedUrl] = useState<string | null>(null);
  const [consumedQuery, setConsumedQuery] = useState<string | null>(null);
  const [activeStream, setActiveStream] = useState<string | null>(null);
  const [lastKline, setLastKline] = useState<WsKlineData | null>(null);
  const [closeMessage, setCloseMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const socketRef = useRef<WebSocket | null>(null);
  const closingManuallyRef = useRef(false);
  const handlersRef = useRef<SocketHandlers | null>(null);

  const trimmedStreams = streams.trim();

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
    setLastKline(null);
    onReset();
  }, [onReset]);

  const handleDisconnect = useCallback(() => {
    console.debug("[SessionStreamPanel] handleDisconnect invoked", {
      sessionId: session.id,
      readyState: socketRef.current?.readyState,
    });
    const socket = socketRef.current;

    // No socket: solo normalizamos estado local
    if (!socket) {
      console.debug("[SessionStreamPanel] no active socket on disconnect", {
        sessionId: session.id,
      });
      cleanupSocket();
      resetRuntimeState();
      setConnectionState("closed");
      setCloseMessage("Conexión cerrada");
      setErrorMessage(null);
      return;
    }

    // Si ya está cerrando/cerrado, no hacemos nada
    if (socket.readyState === WebSocket.CLOSING || socket.readyState === WebSocket.CLOSED) {
      return;
    }

    closingManuallyRef.current = true;
    try {
      socket.close(1000, "Client disconnected");
    } catch {
      cleanupSocket();
      resetRuntimeState();
      setConnectionState("closed");
      setCloseMessage("Conexión cerrada");
      setErrorMessage(null);
    }
  }, [cleanupSocket, resetRuntimeState, session.id]);

  const handleConnect = useCallback(() => {
    // Evitar conexiones duplicadas por estado o readyState subyacente
    console.debug("[SessionStreamPanel] handleConnect clicked", {
      sessionId: session.id,
      isConnecting,
      connectionState,
      streams: trimmedStreams,
    });
    if (isConnecting || connectionState === "connected") return;
    const existing = socketRef.current;
    if (existing && (existing.readyState === WebSocket.CONNECTING || existing.readyState === WebSocket.OPEN)) {
      return;
    }

    if (!trimmedStreams) {
      console.debug("[SessionStreamPanel] handleConnect aborted: empty streams", {
        sessionId: session.id,
      });
      toast.error("Ingresá un stream válido");
      return;
    }

    if (!session.enabled) {
      console.debug("[SessionStreamPanel] handleConnect aborted: session disabled", {
        sessionId: session.id,
      });
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

      const request = buildWsRequest({ sessionId: session.id, streams: trimmedStreams });
      console.debug("[SessionStreamPanel] opening websocket", {
        sessionId: session.id,
        url: request.url,
        query: request.query,
      });
      setConsumedUrl(request.url);
      setConsumedQuery(request.query);

      const socket = new WebSocket(request.url);
      socketRef.current = socket;
      closingManuallyRef.current = false;

      const handleOpen = () => {
        console.debug("[SessionStreamPanel] websocket open", {
          sessionId: session.id,
          url: socket.url,
        });
        setIsConnecting(false);
        setConnectionState("connected");
      };

      const handleMessage = (event: MessageEvent) => {
        const message = parseWsEventData(event.data);
        if (!message) return;

        if (message.event === "kline") {
          console.debug("[SessionStreamPanel] websocket message:kline", {
            sessionId: session.id,
            stream: message.stream,
            closeTime: message.data.closeTime,
          });
          setLastKline(message.data);
          onKline(message.data);
          return;
        }

        if (message.event === "stats") {
          console.debug("[SessionStreamPanel] websocket message:stats", {
            sessionId: session.id,
            connections: message.data.connections,
          });
          setConnections(message.data.connections);
          return;
        }

        if (message.event === "warning") {
          console.debug("[SessionStreamPanel] websocket message:warning", {
            sessionId: session.id,
            stream: message.stream,
            type: message.data.type,
            skipped: message.data.skipped,
          });
          const skipped =
            typeof message.data.skipped === "number" && Number.isFinite(message.data.skipped)
              ? ` — velas omitidas: ${message.data.skipped}`
              : "";
          const streamLabel = message.stream ? ` (${message.stream})` : "";
          toast.warning(`Aviso del stream${streamLabel}: ${message.data.type}${skipped}`);
        }
      };

      const handleClose = (event: CloseEvent) => {
        console.debug("[SessionStreamPanel] websocket close", {
          sessionId: session.id,
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
        console.debug("[SessionStreamPanel] websocket error", {
          sessionId: session.id,
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
      const message = error instanceof Error ? error.message : "No se pudo conectar al stream";
      setErrorMessage(message);
      setCloseMessage(null);
      resetRuntimeState();
      console.debug("[SessionStreamPanel] websocket connection failed", {
        sessionId: session.id,
        error,
      });
      toast.error(message);
    }
  }, [
    connectionState,
    isConnecting,
    resetRuntimeState,
    session.enabled,
    session.id,
    trimmedStreams,
    cleanupSocket,
    onKline,
  ]);

  useEffect(() => {
    console.debug("[SessionStreamPanel] mounting", { sessionId: session.id });
    return () => {
      console.debug("[SessionStreamPanel] unmounting", { sessionId: session.id });
      const socket = socketRef.current;
      if (socket && socket.readyState !== WebSocket.CLOSED) {
        try {
          closingManuallyRef.current = true;
          socket.close(1000, "Component disposed");
        } catch {
          /* noop */
        }
      }
      cleanupSocket();
    };
  }, [cleanupSocket, session.id]);

  useEffect(() => {
    console.debug("[SessionStreamPanel] session enabled changed", {
      sessionId: session.id,
      enabled: session.enabled,
    });
    if (session.enabled) return;
    if (!socketRef.current) return;
    handleDisconnect();
  }, [handleDisconnect, session.enabled, session.id]);

  useEffect(() => {
    console.debug("[SessionStreamPanel] streams prop updated", {
      sessionId: session.id,
      streams,
    });
  }, [session.id, streams]);

  const shortcuts = useMemo(() => {
    return session.symbols.map((symbol) => ({
      symbol,
      value: `kline@${session.interval}:${symbol}`,
    }));
  }, [session.interval, session.symbols]);

  const statusLabel =
    connectionState === "connected"
      ? "Conectado"
      : connectionState === "connecting"
      ? "Conectando..."
      : connectionState === "error"
      ? "Error"
      : connectionState === "closed"
      ? "Desconectado"
      : "Idle";

  const statusBadgeClassName =
    connectionState === "error"
      ? "border-transparent bg-destructive text-destructive-foreground"
      : connectionState === "connected"
      ? "border-transparent bg-secondary text-secondary-foreground"
      : "";

  const canConnect =
    session.enabled &&
    !isConnecting &&
    connectionState !== "connected" &&
    (!socketRef.current ||
      socketRef.current.readyState === WebSocket.CLOSING ||
      socketRef.current.readyState === WebSocket.CLOSED) &&
    Boolean(trimmedStreams);

  const showRetry =
    connectionState === "error" &&
    !isConnecting &&
    session.enabled &&
    Boolean(trimmedStreams);

  return (
    <Card>
      <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <CardTitle className="text-base">Stream en vivo</CardTitle>
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <Badge variant="secondary">Recibidas: {receivedCount}</Badge>
          <Badge variant="outline">Conexiones: {connections ?? "—"}</Badge>
          <Badge variant="outline" className={statusBadgeClassName}>
            Estado: {statusLabel}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium" htmlFor="ws-stream-input">
            Stream
          </label>
          <Input
            id="ws-stream-input"
            value={streams}
            onChange={(event) => onStreamsChange(event.target.value)}
            placeholder={`kline@${session.interval}:${session.symbols[0] ?? "BTCUSDT"}`}
            disabled={connectionState === "connected"}
          />
          {shortcuts.length > 1 ? (
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <span>Atajos:</span>
              {shortcuts.map((shortcut) => (
                <Button
                  key={shortcut.value}
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => onStreamsChange(shortcut.value)}
                  disabled={connectionState === "connected" && shortcut.value !== activeStream}
                >
                  {shortcut.symbol}
                </Button>
              ))}
            </div>
          ) : null}
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            onClick={handleConnect}
            disabled={!canConnect}
            title={!session.enabled ? "La sesión está deshabilitada" : undefined}
          >
            {connectionState === "connecting" ? "Conectando..." : "Conectar"}
          </Button>
          <Button
            variant="outline"
            onClick={handleDisconnect}
            disabled={connectionState !== "connected"}
          >
            Desconectar
          </Button>
          {showRetry ? (
            <Button variant="outline" onClick={handleConnect}>
              Reintentar
            </Button>
          ) : null}
        </div>

        {closeMessage ? (
          <div className="rounded-md border border-muted-foreground/40 bg-muted/40 p-3 text-sm text-muted-foreground">
            {closeMessage}
          </div>
        ) : null}
        {errorMessage ? (
          <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
            {errorMessage}
          </div>
        ) : null}

        {consumedUrl ? (
          <div className="space-y-1 rounded-md border bg-muted/30 p-3 text-xs font-mono">
            <p className="break-all">WS_CONSUMED_URL={consumedUrl}</p>
            <p className="break-all">WS_CONSUMED_QUERY={consumedQuery}</p>
            {activeStream ? <p className="break-all">STREAM={activeStream}</p> : null}
          </div>
        ) : null}

        {lastKline ? (
          <div className="space-y-1 rounded-md border bg-muted/30 p-3 text-xs">
            <p className="font-semibold">Última vela</p>
            <p className="text-muted-foreground">
              {lastKline.symbol} · {lastKline.interval} · {formatDateTime(lastKline.closeTime)}
            </p>
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline">Open: {formatNumber(lastKline.open)}</Badge>
              <Badge variant="outline">Close: {formatNumber(lastKline.close)}</Badge>
              <Badge variant="outline">High: {formatNumber(lastKline.high)}</Badge>
              <Badge variant="outline">Low: {formatNumber(lastKline.low)}</Badge>
              <Badge variant="outline">Volume: {formatNumber(lastKline.volume, 4)}</Badge>
            </div>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
