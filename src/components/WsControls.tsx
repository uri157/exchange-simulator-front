"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { openWs } from "@/lib/ws";
import type { WsKlineData, WsMessage } from "@/lib/types";

interface WsControlsProps {
  sessionId: string;
  streams: string;
  onStreamsChange: (value: string) => void;
  onKline: (kline: WsKlineData) => void;
  onStats?: (connections: number | null) => void;
  ensureSessionRunning?: () => Promise<void>;
  disabled?: boolean;
}

export function WsControls({
  sessionId,
  streams,
  onStreamsChange,
  onKline,
  onStats,
  ensureSessionRunning,
  disabled = false,
}: WsControlsProps) {
  const [isConnecting, setIsConnecting] = useState(false);
  const [connected, setConnected] = useState(false);
  const [connections, setConnections] = useState<number | null>(null);
  const disconnectRef = useRef<() => void>();

  const handleDisconnect = useCallback(() => {
    disconnectRef.current?.();
    disconnectRef.current = undefined;
    setConnected(false);
    setConnections(null);
  }, []);

  const handleMessage = useCallback(
    (message: WsMessage) => {
      if (message.type === "kline") {
        onKline(message.data);
      }
      if (message.type === "stats") {
        setConnections(message.data.connections);
        onStats?.(message.data.connections);
      }
    },
    [onKline, onStats]
  );

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

      disconnectRef.current = openWs({
        sessionId,
        streams: trimmedStreams,
        onMessage: handleMessage,
        onError: (error) => {
          toast.error(error.message);
          handleDisconnect();
        },
        onOpen: () => {
          toast.success("Stream conectado");
          setConnected(true);
        },
        onClose: () => {
          setConnected(false);
          setConnections(null);
          disconnectRef.current = undefined;
        },
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "No se pudo conectar al stream";
      toast.error(message);
      handleDisconnect();
    } finally {
      setIsConnecting(false);
    }
  }, [connected, ensureSessionRunning, handleDisconnect, handleMessage, sessionId, streams]);

  useEffect(() => {
    if (!disabled) {
      return;
    }
    if (!connected) {
      return;
    }
    handleDisconnect();
  }, [connected, disabled, handleDisconnect]);

  const isToggleDisabled =
    isConnecting || (!connected && (disabled || !streams.trim()));

  return (
    <div className="flex flex-col gap-3 rounded-lg border p-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <label className="flex-1 text-sm font-medium" htmlFor="streams">
          Streams
        </label>
        <Badge variant="secondary" className="justify-center">
          Bots conectados: {connections ?? "—"}
        </Badge>
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
      </div>
    </div>
  );
}
