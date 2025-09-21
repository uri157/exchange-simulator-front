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
import { useSession } from "@/lib/hooks";
import { formatDateTime, formatNumber } from "@/lib/time";
import type { WsKlineData } from "@/lib/types";

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

  const [streams, setStreams] = useState(() => searchParams?.get("streams") ?? "");
  const [wsRows, setWsRows] = useState<WsKlineData[]>([]);
  const [receivedCount, setReceivedCount] = useState(0);

  useEffect(() => {
    const nextStreams = searchParams?.get("streams") ?? "";
    setStreams((prev) => (prev === nextStreams ? prev : nextStreams));
  }, [searchParams]);

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
    setStreams(defaultStream);
    updateQuery(defaultStream);
  }, [session, streams, updateQuery]);

  useEffect(() => {
    setWsRows([]);
    setReceivedCount(0);
  }, [streams]);

  const handleKline = useCallback((kline: WsKlineData) => {
    setReceivedCount((prev) => prev + 1);
    setWsRows((prev) => {
      const map = new Map(prev.map((row) => [row.closeTime, row] as const));
      map.set(kline.closeTime, kline);
      const next = Array.from(map.values()).sort((a, b) => b.closeTime - a.closeTime);
      return next.slice(0, MAX_ROWS);
    });
  }, []);

  const handleResetCounters = useCallback(() => {
    setReceivedCount(0);
  }, []);

  const handleStreamsChange = useCallback(
    (value: string) => {
      setStreams(value);
      updateQuery(value);
    },
    [updateQuery]
  );

  const columns = useMemo<DataTableColumn<WsKlineData>[]>(
    () => [
      { key: "closeTime", header: "Close time", render: (row) => formatDateTime(row.closeTime) },
      { key: "open", header: "Open", render: (row) => formatNumber(row.open) },
      { key: "high", header: "High", render: (row) => formatNumber(row.high) },
      { key: "low", header: "Low", render: (row) => formatNumber(row.low) },
      { key: "close", header: "Close", render: (row) => formatNumber(row.close) },
      { key: "volume", header: "Volume", render: (row) => formatNumber(row.volume, 4) },
    ],
    []
  );

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
          onKline={handleKline}
          onReset={handleResetCounters}
          receivedCount={receivedCount}
        />

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base">Últimas velas</CardTitle>
            <div className="flex items-center gap-2">
              <Badge variant="secondary">{receivedCount} recibidas</Badge>
              <Badge variant="outline">{wsRows.length} en tabla</Badge>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <DataTable
              data={wsRows}
              columns={columns}
              emptyMessage="Aguardando datos del stream"
              getRowId={(row) => String(row.closeTime)}
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
  return `kline@${session.interval}:${symbol}`;
}
