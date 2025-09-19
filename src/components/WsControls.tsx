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
}: WsControlsProps) {
  const [isConnecting, setIsConnecting] = useState(false);
  const [connected, setConnected] = useState(false);
  const [connections, setConnections] = useState<number | null>(null);
  const [messageCount, setMessageCount] = useState(0);
  const [consumedUrl, setConsumedUrl] = useState<string | null>(null);
  const [consumedQuery, setConsumedQuery] = useState<string | null>(null);
  const [consumedStreams, setConsumedStreams] = useState<string | null>(null);
  const [noDataHint, setNoDataHint] = useState(false);
  const socketRef = useRef<WebSocket | null>(null);
  const closingManuallyRef = useRef(false);
  const noDataTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevSessionIdRef = useRef(sessionId);
  const prevStreamsRef = useRef(streams);

  const cleanupAfterSocket = useCallback(() => {
    if (noDataTimerRef.current) {
      clearTimeout(noDataTimerRef.current);
      noDataTimerRef.current = null;
    }

    socketRef.current = null;
    setConnected(false);
    setIsConnecting(false);
    setConnections(null);
    setMessageCount(0);
    setNoDataHint(false);
    onStats?.(null);
    onConnectionChange?.(false);
  }, [onConnectionChange, onStats]);

  const handleDisconnect = useCallback(() => {
    const socket = socketRef.current;
    if (!socket) {
      cleanupAfterSocket();
      return;
    }

    closingManuallyRef.current = true;
    try {
      socket.close(1000, "Client disconnected");
    } catch {
      cleanupAfterSocket();
    }
  }, [cleanupAfterSocket]);

  const handleToggle = useCallback(async () => {
    if (connected) {
      handleDisconnect();
      return;
    }

    const trimmedStreams = streams.trim();
    if (!trimmedStreams) {
      toast.error("Ingresá un stream válido");
      return;
    }

    try {
      setIsConnecting(true);
      if (ensureSessionRunning) {
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
        if (noDataTimerRef.current) {
          clearTimeout(noDataTimerRef.current);
        }
        noDataTimerRef.current = setTimeout(() => {
          setNoDataHint(true);
        }, 10_000);
      });

      socket.addEventListener("message", (event) => {
        const message = parseWsEventData(event.data);
        if (!message) {
          console.warn("WS mensaje inválido", event.data);
          return;
        }

        if (message.event === "kline") {
          setMessageCount((prev) => prev + 1);
          if (noDataTimerRef.current) {
            clearTimeout(noDataTimerRef.current);
            noDataTimerRef.current = null;
            setNoDataHint(false);
          }
          onKline(message.data);
          return;
        }

        if (message.event === "stats") {
          setConnections(message.data.connections);
          onStats?.(message.data.connections);
        }
      });

      socket.addEventListener("error", () => {
        toast.error("Error en la conexión de WebSocket");
      });

      socket.addEventListener("close", (event) => {
        const description = event.reason
          ? `(${event.code}) ${event.reason}`
          : `(${event.code})`;

        if (closingManuallyRef.current) {
          toast.info(`Stream desconectado ${description}`);
        } else if (event.wasClean) {
          toast.info(`Stream cerrado ${description}`);
        } else {
          toast.error(`Stream cerrado ${description}`);
        }

        closingManuallyRef.current = false;
        cleanupAfterSocket();
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "No se pudo conectar al stream";
      toast.error(message);
      handleDisconnect();
    } finally {
      setIsConnecting(false);
    }
  }, [cleanupAfterSocket, connected, ensureSessionRunning, handleDisconnect, onConnectionChange, onKline, onStats, sessionId, streams]);

  useEffect(() => {
    if (!disabled) {
      return;
    }
    if (!connected) {
      return;
    }
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
    if (!consumedUrl || !consumedQuery || !consumedStreams) {
      return;
    }

    console.info(`WS_CONSUMED_URL=${consumedUrl}`);
    console.info(`WS_CONSUMED_QUERY=${consumedQuery}`);
    console.info(`STREAMS_VALUE=${consumedStreams}`);
  }, [consumedQuery, consumedStreams, consumedUrl]);

  const isToggleDisabled =
    isConnecting || (!connected && (disabled || !streams.trim()));

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
        <Button onClick={handleToggle} disabled={isToggleDisabled}>
          {connected ? "Desconectar" : isConnecting ? "Conectando..." : "Conectar stream"}
        </Button>
        {noDataHint ? (
          <span className="text-xs text-muted-foreground">
            Sin datos — verificá rango/estado
          </span>
        ) : null}
      </div>
      {consumedUrl ? (
        <div className="overflow-hidden rounded-md border bg-muted/40 p-2 text-xs font-mono">
          <p className="break-all">WS_CONSUMED_URL={consumedUrl}</p>
          <p className="break-all">WS_CONSUMED_QUERY={consumedQuery}</p>
          <p className="break-all">STREAMS_VALUE={consumedStreams}</p>
        </div>
      ) : null}
    </div>
  );
}
