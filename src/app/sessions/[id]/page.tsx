"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams, useParams } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";

import { DataTable, type DataTableColumn } from "@/components/DataTable";
import { WsControls } from "@/components/WsControls";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import type { SessionResponse } from "@/lib/api-types";
import {
  useSession,
  useSessionPause,
  useSessionResume,
  useSessionSeek,
  useSessionStart,
} from "@/lib/hooks";
import { formatDateTime, formatNumber } from "@/lib/time";
import type { WsKlineData } from "@/lib/types";

const MAX_ROWS = 200;

export default function SessionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const sessionQuery = useSession(id);
  const startSession = useSessionStart();
  const pauseSession = useSessionPause();
  const resumeSession = useSessionResume();
  const seekSession = useSessionSeek();

  const [streams, setStreams] = useState<string>(searchParams.get("streams") ?? "");
  const [wsRows, setWsRows] = useState<WsKlineData[]>([]);
  const [seekValue, setSeekValue] = useState<string>("");

  useEffect(() => {
    const nextStreams = searchParams.get("streams");
    if (nextStreams) setStreams(nextStreams);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (sessionQuery.data && !streams) {
      const defaultStream = buildDefaultStream(sessionQuery.data);
      setStreams(defaultStream);
      updateQuery(defaultStream);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionQuery.data?.id]);

  const updateQuery = (value: string) => {
    const next = new URLSearchParams(searchParams.toString());
    if (value) next.set("streams", value);
    else next.delete("streams");
    const queryString = next.toString();
    router.replace(queryString ? `${pathname}?${queryString}` : pathname);
  };

  const handleStart = async () => {
    try {
      await startSession.mutateAsync(id);
      toast.success("Sesión iniciada");
      sessionQuery.refetch();
    } catch (error) {
      toast.error(getMessage(error));
    }
  };

  const handlePause = async () => {
    try {
      await pauseSession.mutateAsync(id);
      toast.success("Sesión pausada");
      sessionQuery.refetch();
    } catch (error) {
      toast.error(getMessage(error));
    }
  };

  const handleResume = async () => {
    try {
      await resumeSession.mutateAsync(id);
      toast.success("Sesión reanudada");
      sessionQuery.refetch();
    } catch (error) {
      toast.error(getMessage(error));
    }
  };

  const handleSeek = async () => {
    if (!seekValue) {
      toast.error("Ingresá un timestamp");
      return;
    }
    try {
      await seekSession.mutateAsync({ id, timestamp: Number(seekValue) });
      toast.success("Seek enviado");
    } catch (error) {
      toast.error(getMessage(error));
    }
  };

  const ensureSessionRunning = async () => {
    if (sessionQuery.data?.status === "running") return;
    await handleStart();
  };

  const handleKline = (kline: WsKlineData) => {
    setWsRows((prev) => {
      const map = new Map(prev.map((row) => [row.closeTime, row] as const));
      map.set(kline.closeTime, kline);
      const next = Array.from(map.values()).sort((a, b) => b.closeTime - a.closeTime);
      return next.slice(0, MAX_ROWS);
    });
  };

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

  if (sessionQuery.isLoading || !sessionQuery.data) {
    return <div className="h-64 animate-pulse rounded-md border bg-muted" />;
  }

  const session = sessionQuery.data as SessionResponse;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Sesión {session.id}</h1>
          <p className="text-sm text-muted-foreground">
            {session.symbols.join(", ")} · {session.interval}
          </p>
        </div>
        <Badge variant="secondary">Estado: {session.status}</Badge>
      </div>

      <section className="rounded-lg border p-4">
        <h2 className="text-lg font-semibold">Controles</h2>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button onClick={handleStart} disabled={startSession.isPending}>
            {startSession.isPending ? "Iniciando..." : "Start"}
          </Button>
          <Button onClick={handlePause} disabled={pauseSession.isPending}>
            {pauseSession.isPending ? "Pausando..." : "Pause"}
          </Button>
          <Button onClick={handleResume} disabled={resumeSession.isPending}>
            {resumeSession.isPending ? "Reanudando..." : "Resume"}
          </Button>
          <div className="flex items-center gap-2">
            <Input
              placeholder="Timestamp ms"
              value={seekValue}
              onChange={(event) => setSeekValue(event.target.value)}
            />
            <Button onClick={handleSeek} disabled={seekSession.isPending}>
              {seekSession.isPending ? "Buscando..." : "Seek"}
            </Button>
          </div>
        </div>
        <div className="mt-4 text-sm text-muted-foreground">
          Inicio: {formatDateTime(session.startTime)} · Fin: {formatDateTime(session.endTime)} ·
          Speed: {session.speed} · Seed: {session.seed}
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Stream en vivo</h2>
        <WsControls
          sessionId={session.id}
          streams={streams}
          onStreamsChange={(value) => {
            setStreams(value);
            updateQuery(value);
          }}
          onKline={handleKline}
          ensureSessionRunning={ensureSessionRunning}
        />
        <div className="rounded-lg border p-4">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-base font-semibold">Últimas velas</h3>
            <Badge variant="secondary">{wsRows.length} recibidas</Badge>
          </div>
          <DataTable
            data={wsRows}
            columns={columns}
            emptyMessage="Aguardando datos del stream"
            getRowId={(row) => String(row.closeTime)}
          />
        </div>
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

function getMessage(error: unknown) {
  return error instanceof Error ? error.message : "Ocurrió un error";
}
