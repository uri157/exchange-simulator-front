"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { buildWsRequest, parseWsEventData } from "@/lib/ws";
import type { WsKlineData } from "@/lib/types";

interface WsControlsProps {
  sessionId: string;
  streams: string;
  onStreamsChange: (value: string) => void;
  onKline: (kline: WsKlineData) => void;
  onStats?: (connections: number | null) => void;
  ensureSessionRunning?: () => Promise<void>;
  disabled?: boolean;
  onConnectionChange?: (connected: boolean) => void;
  connectDisabledReason?: string;
}

export function WsControls({
  sessionId,
  streams,
  onStreamsChange,
  onKline,
  onStats,
  ensureSessionRunning,
  disabled = false,
  onConnectionChange,
  connectDisabledReason,
}: WsControlsProps) {
  const [isConnecting, setIsConnecting] = useState(false);
  const [connected, setConnected] = useState(false);
  const [connections, setConnections] = useState<number | null>(null);
  const [messageCount, setMessageCount] = useState(0);
  const [consumedUrl, setConsumedUrl] = useState<string | null>(null);
  const [consumedQuery, setConsumedQuery] = useState<string | null>(null);
  const [consumedStreams, setConsumedStreams] = useState<string | null>(null);
  const [noDataHint, setNoDataHint] = useState(false);
  const [lastConnectionState, setLastConnectionState] = useState<
    "idle" | "closed" | "error"
  >("idle");

  const socketRef = useRef<WebSocket | null>(null);
  const closingManuallyRef = useRef(false);
  const noDataTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevSessionIdRef = useRef(sessionId);
  const prevStreamsRef = useRef(streams);

  const clearNoDataTimer = useCallback(() => {
    if (noDataTimerRef.current) {
      clearTimeout(noDataTimerRef.current);
      noDataTimerRef.current = null;
    }
  }, []);

  const scheduleNoDataHint = useCallback(() => {
    clearNoDataTimer();
    noDataTimerRef.current = setTimeout(() => {
      setNoDataHint(true);
    }, 10_000);
  }, [clearNoDataTimer]);

  const cleanupAfterSocket = useCallback(
    (nextState: "idle" | "closed" | "error" = "closed") => {
      clearNoDataTimer();

      socketRef.current = null;
      setConnected(false);
      setIsConnecting(false);
      setConnections(null);
      setMessageCount(0);
      setNoDataHint(false);
      setLastConnectionState(nextState);
      onStats?.(null);
      onConnectionChange?.(false);
    },
    [clearNoDataTimer, onConnectionChange, onStats]
  );

  const trimmedStreams = streams.trim();

  const handleDisconnect = useCallback(() => {
    const socket = socketRef.current;
    if (!socket) {
      cleanupAfterSocket("closed");
      return;
    }

    closingManuallyRef.current = true;
    try {
      socket.close(1000, "Client disconnected");
    } catch {
      cleanupAfterSocket("closed");
    }
  }, [cleanupAfterSocket]);

  const handleToggle = useCallback(async () => {
    if (connected) {
      handleDisconnect();
      return;
    }

    if (!trimmedStreams) {
      toast.error("Ingresá un stream válido");
      return;
    }

    try {
      setIsConnecting(true);
      setLastConnectionState("idle");
      if (ensureSessionRunning && !disabled) {
        await ensureSessionRunning();
      }

      const request = buildWsRequest({ sessionId, streams: trimmedStreams });
      setConsumedStreams(trimmedStreams);
      setConsumedQuery(request.query);
      setConsumedUrl(request.url);

      const socket = new WebSocket(request.url);
      socketRef.current = socket;
      closingManuallyRef.current = false;
      setMessageCount(0);
      setNoDataHint(false);

      socket.addEventListener("open", () => {
        setIsConnecting(false);
        setConnected(true);
        toast.success("Stream conectado");
        onConnectionChange?.(true);
        setLastConnectionState("idle");
        scheduleNoDataHint();
      });

      socket.addEventListener("message", (event) => {
        const message = parseWsEventData(event.data);
        if (!message) {
          if (typeof event.data === "string") {
            console.warn("WS mensaje no reconocido", event.data);
            toast.error(`Error en la conexión de WebSocket: ${event.data}`);
          } else {
            console.warn("WS mensaje inválido", event.data);
          }
          return;
        }

        if (message.event === "kline") {
          setMessageCount((prev) => prev + 1);
          setNoDataHint(false);
          scheduleNoDataHint();
          onKline(message.data);
          return;
        }

        if (message.event === "stats") {
          setConnections(message.data.connections);
          onStats?.(message.data.connections);
        }
      });

      socket.addEventListener("close", (event) => {
        const reasonText = event.reason ? ` - ${event.reason}` : "";
        let nextState: "closed" | "error" = event.wasClean ? "closed" : "error";

        if (event.code === 1000) {
          toast.info("Stream cerrado (1000)");
          nextState = "closed";
        } else if (event.code === 1001) {
          toast.warning(`Stream cerrado (1001${reasonText})`);
          nextState = "closed";
        } else if (event.code === 1006) {
          toast.error(`Error en la conexión de WebSocket (1006${reasonText})`);
          nextState = "error";
        } else if (event.code === 1011) {
          toast.error(`Keepalive timeout o error del servidor (1011${reasonText})`);
          nextState = "error";
        } else if (event.wasClean) {
          const detail = event.reason
            ? ` (${event.code}) ${event.reason}`
            : ` (${event.code})`;
          toast.info(`Stream cerrado${detail}`);
          nextState = "closed";
        } else {
          const detail = event.reason
            ? ` (${event.code}) ${event.reason}`
            : ` (${event.code})`;
          toast.error(`Error en la conexión de WebSocket${detail}`);
          nextState = "error";
        }

        closingManuallyRef.current = false;
        cleanupAfterSocket(nextState);
      });

      socket.addEventListener("error", () => {
        toast.error("Error en la conexión de WebSocket");
        setLastConnectionState("error");
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "No se pudo conectar al stream";
      toast.error(message);
      handleDisconnect();
      setLastConnectionState("error");
    } finally {
      setIsConnecting(false);
    }
  }, [
    cleanupAfterSocket,
    connected,
    ensureSessionRunning,
    handleDisconnect,
    onConnectionChange,
    onKline,
    onStats,
    scheduleNoDataHint,
    sessionId,
    trimmedStreams,
    disabled,
  ]);

  useEffect(() => {
    if (!disabled) return;
    if (!connected) return;
    handleDisconnect();
  }, [connected, disabled, handleDisconnect]);

  useEffect(() => {
    if (!connected) {
      prevSessionIdRef.current = sessionId;
      prevStreamsRef.current = streams;
      return;
    }

    const sessionChanged = prevSessionIdRef.current !== sessionId;
    const streamsChanged = prevStreamsRef.current !== streams;

    if (sessionChanged || streamsChanged) {
      handleDisconnect();
    }

    prevSessionIdRef.current = sessionId;
    prevStreamsRef.current = streams;
  }, [connected, handleDisconnect, sessionId, streams]);

  useEffect(() => {
    return () => {
      handleDisconnect();
    };
  }, [handleDisconnect]);

  useEffect(() => {
    if (!consumedUrl || !consumedQuery || !consumedStreams) return;

    console.info(`WS_CONSUMED_URL=${consumedUrl}`);
    console.info(`WS_CONSUMED_QUERY=${consumedQuery}`);
    console.info(`STREAMS_VALUE=${consumedStreams}`);
  }, [consumedQuery, consumedStreams, consumedUrl]);

  const isToggleDisabled =
    isConnecting || (!connected && (disabled || !trimmedStreams));

  const connectGuardTitle =
    !connected && disabled && connectDisabledReason
      ? connectDisabledReason
      : undefined;

  const showRetryButton =
    !connected &&
    !isConnecting &&
    !disabled &&
    lastConnectionState !== "idle";

  return (
    <div className="flex flex-col gap-4 rounded-lg border p-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="flex-1">
          <label className="block text-sm font-medium" htmlFor="streams">
            Streams
          </label>
          <p className="text-xs text-muted-foreground">
            Separá múltiples streams por coma. Ejemplo: kline@1m:BTCUSDT
          </p>
        </div>
        <div className="flex flex-col items-stretch gap-1 sm:flex-row sm:items-center">
          <Badge variant="secondary" className="justify-center">
            Bots conectados: {connections ?? "—"}
          </Badge>
          <Badge variant="outline" className="justify-center">
            Recibidas: {messageCount}
          </Badge>
        </div>
      </div>
      <Input
        id="streams"
        value={streams}
        onChange={(event) => onStreamsChange(event.target.value)}
        placeholder="kline@1m:BTCUSDT"
        disabled={disabled}
      />
      <div className="flex items-center gap-2">
        <Button
          onClick={handleToggle}
          disabled={isToggleDisabled}
          title={connectGuardTitle}
        >
          {connected ? "Desconectar" : isConnecting ? "Conectando..." : "Conectar stream"}
        </Button>
        {showRetryButton ? (
          <Button variant="outline" onClick={handleToggle}>
            Reintentar
          </Button>
        ) : null}
        {noDataHint ? (
          <span className="text-xs text-muted-foreground">
            Sin datos — verificá rango/estado
          </span>
        ) : null}
      </div>
      {consumedUrl ? (
        <details className="overflow-hidden rounded-md border bg-muted/40 p-2 text-xs">
          <summary className="cursor-pointer text-sm font-medium">
            Detalles de la conexión
          </summary>
          <div className="mt-2 space-y-1 font-mono">
            <p className="break-all">WS_CONSUMED_URL={consumedUrl}</p>
            <p className="break-all">WS_CONSUMED_QUERY={consumedQuery}</p>
            <p className="break-all">STREAMS_VALUE={consumedStreams}</p>
          </div>
        </details>
      ) : null}
    </div>
  );
}
