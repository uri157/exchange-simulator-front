"use client";

import { useMemo } from "react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { SessionResponse } from "@/lib/api-types";
import type { WsKlineData } from "@/lib/types";

import { LastKlineCard } from "./LastKlineCard";
import { StreamControls } from "./StreamControls";
import { StreamDebugInfo } from "./StreamDebugInfo";
import { StreamInput } from "./StreamInput";
import { StreamMessages } from "./StreamMessages";
import { StreamStatusBadges } from "./StreamStatusBadges";
import { useSessionStream } from "./useSessionStream";

interface SessionStreamPanelProps {
  session: SessionResponse;
  streams: string;
  onStreamsChange: (value: string) => void;
  onKline: (kline: WsKlineData) => void;
  onReset: () => void;
  receivedCount: number;
}

export function SessionStreamPanel({
  session,
  streams,
  onStreamsChange,
  onKline,
  onReset,
  receivedCount,
}: SessionStreamPanelProps) {
  const {
    connectionState,
    isConnecting,
    connections,
    activeStream,
    lastKline,
    closeMessage,
    errorMessage,
    consumedUrl,
    consumedQuery,
    connect,
    disconnect,
  } = useSessionStream({
    sessionId: session.id,
    enabled: session.enabled,
    streams,
    onKline,
    onReset,
  });

  const trimmedStreams = streams.trim();

  const shortcuts = useMemo(() => {
    return session.symbols.map((symbol) => ({
      symbol,
      value: `kline@${session.interval}:${symbol}`,
    }));
  }, [session.interval, session.symbols]);

  const canConnect: boolean =
    session.enabled &&
    !isConnecting &&
    connectionState !== "connected" &&
    Boolean(trimmedStreams);

  const isInputDisabled = connectionState === "connected";

  return (
    <Card>
      <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <CardTitle className="text-base">Stream en vivo</CardTitle>
        <StreamStatusBadges
          connectionState={connectionState}
          connections={connections}
          receivedCount={receivedCount}
        />
      </CardHeader>
      <CardContent className="space-y-4">
        <StreamInput
          value={streams}
          onChange={onStreamsChange}
          shortcuts={shortcuts}
          disabled={isInputDisabled}
          activeStream={activeStream}
          placeholder={`kline@${session.interval}:${session.symbols[0] ?? "BTCUSDT"}`}
        />

        <StreamControls
          connectionState={connectionState}
          isConnecting={isConnecting}
          canConnect={canConnect}
          onConnect={connect}
          onDisconnect={disconnect}
          sessionEnabled={session.enabled}
        />

        <StreamMessages errorMessage={errorMessage} closeMessage={closeMessage} />

        <StreamDebugInfo url={consumedUrl} query={consumedQuery} activeStream={activeStream} />

        {lastKline ? <LastKlineCard kline={lastKline} /> : null}
      </CardContent>
    </Card>
  );
}
