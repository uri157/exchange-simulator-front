"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { DataTable, type DataTableColumn } from "@/components/DataTable";
import { SessionHeader } from "@/components/sessions/SessionHeader";
import { SessionControls } from "@/components/sessions/SessionControls";
import { SessionMeta } from "@/components/sessions/SessionMeta";
import { SessionStreamPanel } from "@/components/sessions/SessionStreamPanel";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { SessionResponse } from "@/lib/api-types";
import { useSession, useTradeTableData } from "@/lib/hooks";
import { formatDateTime, formatNumber } from "@/lib/time";
import type { WsTradeData } from "@/lib/types";

const MAX_ROWS = 200;

interface SessionDetailsPageProps {
  id: string;
  prefetched?: SessionResponse;
}

export function SessionDetailsPage({ id, prefetched }: SessionDetailsPageProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const sessionQuery = useSession(id ? id : null);
  const session = sessionQuery.data ?? prefetched ?? null;
  const effectiveSessionId = session?.id ?? id;

  const [streams, setStreams] = useState(() => searchParams?.get("streams") ?? "");
  const [wsTrades, setWsTrades] = useState<WsTradeData[]>([]);
  const [receivedCount, setReceivedCount] = useState(0);

  useEffect(() => {
    console.debug("[SessionDetailsPage] mount", { sessionId: id });
    return () => {
      console.debug("[SessionDetailsPage] unmount", { sessionId: id });
    };
  }, [id]);

  useEffect(() => {
    const nextStreams = searchParams?.get("streams") ?? "";
    console.debug("[SessionDetailsPage] search params updated", { sessionId: id, streams: nextStreams });
    setStreams((prev) => (prev === nextStreams ? prev : nextStreams));
  }, [id, searchParams]);

  const updateQuery = useCallback(
    (value: string) => {
      const next = new URLSearchParams(searchParams?.toString() ?? "");
      if (value) {
        next.set("streams", value);
      } else {
        next.delete("streams");
      }
      const queryString = next.toString();
      router.replace(queryString ? `${pathname}?${queryString}` : pathname);
    },
    [pathname, router, searchParams]
  );

  useEffect(() => {
    if (!session) return;
    if (streams) return;
    const defaultStream = buildDefaultStream(session);
    if (!defaultStream) return;
    console.debug("[SessionDetailsPage] applying default stream", {
      sessionId: session.id,
      defaultStream,
    });
    setStreams(defaultStream);
    updateQuery(defaultStream);
  }, [session, streams, updateQuery]);

  useEffect(() => {
    console.debug("[SessionDetailsPage] streams changed", { sessionId: effectiveSessionId, streams });
    setWsTrades([]);
    setReceivedCount(0);
  }, [effectiveSessionId, streams]);

  const handleTrade = useCallback((trade: WsTradeData) => {
    console.debug("[SessionDetailsPage] trade received", {
      sessionId: effectiveSessionId,
      eventTime: trade.eventTime,
    });
    setReceivedCount((prev) => prev + 1);
    setWsTrades((prev) => {
      const key = `${trade.eventTime}-${trade.price}-${trade.qty}`;
      const map = new Map<string, WsTradeData>();
      map.set(key, trade);
      for (const existing of prev) {
        const existingKey = `${existing.eventTime}-${existing.price}-${existing.qty}`;
        if (!map.has(existingKey)) {
          map.set(existingKey, existing);
        }
      }
      return Array.from(map.values()).slice(0, MAX_ROWS);
    });
  }, [effectiveSessionId]);

  const handleResetCounters = useCallback(() => {
    console.debug("[SessionDetailsPage] resetting counters", { sessionId: effectiveSessionId });
    setReceivedCount(0);
    setWsTrades([]);
  }, [effectiveSessionId]);

  const handleStreamsChange = useCallback(
    (value: string) => {
      console.debug("[SessionDetailsPage] handleStreamsChange", {
        sessionId: effectiveSessionId,
        value,
      });
      setStreams(value);
      updateQuery(value);
    },
    [effectiveSessionId, updateQuery]
  );

  const columns = useMemo<DataTableColumn<WsTradeData>[]>(
    () => [
      { key: "eventTime", header: "Evento", render: (row) => formatDateTime(row.eventTime) },
      { key: "price", header: "Precio", render: (row) => formatNumber(row.price, 4) },
      { key: "qty", header: "Cantidad", render: (row) => formatNumber(row.qty, 4) },
      {
        key: "quoteQty",
        header: "Notional",
        render: (row) => (row.quoteQty ? formatNumber(row.quoteQty, 2) : "—"),
      },
    ],
    []
  );

  const tradeTableData = useTradeTableData(wsTrades);

  if (!id) {
    return (
      <div className="space-y-4">
        <div className="rounded-lg border bg-muted p-6 text-sm text-muted-foreground">
          Identificador de sesión inválido.
        </div>
        <Button asChild variant="link">
          <Link href="/sessions">← Volver a sesiones</Link>
        </Button>
      </div>
    );
  }

  if (sessionQuery.isLoading && !session) {
    return <div className="h-64 animate-pulse rounded-lg border bg-muted" />;
  }

  if (!session) {
    return (
      <div className="space-y-4">
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-6 text-sm text-destructive">
          No se pudo cargar la sesión solicitada.
        </div>
        <Button asChild variant="link">
          <Link href="/sessions">← Volver a sesiones</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <SessionHeader session={session} />

      <SessionControls
        session={session}
        onSessionUpdated={sessionQuery.refetch}
        onSessionDeleted={() => router.push("/sessions")}
      />

      <SessionMeta session={session} />

      <section className="space-y-4">
        <SessionStreamPanel
          session={session}
          streams={streams}
          onStreamsChange={handleStreamsChange}
          onTrade={handleTrade}
          onReset={handleResetCounters}
          receivedCount={receivedCount}
        />

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base">Últimos trades</CardTitle>
            <div className="flex items-center gap-2">
              <Badge variant="secondary">{receivedCount} recibidas</Badge>
              <Badge variant="outline">{tradeTableData.length} en tabla</Badge>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <DataTable
              data={tradeTableData}
              columns={columns}
              emptyMessage="Aguardando datos del stream"
              getRowId={(row, index) => `${row.eventTime}-${row.price}-${row.qty}-${index}`}
            />
          </CardContent>
        </Card>
      </section>

      <div>
        <Button asChild variant="link">
          <Link href="/sessions">← Volver a sesiones</Link>
        </Button>
      </div>
    </div>
  );
}

function buildDefaultStream(session: SessionResponse) {
  const symbol = session.symbols[0] ?? "";
  if (!symbol) return "";
  return `aggTrades:${symbol}`;
}
