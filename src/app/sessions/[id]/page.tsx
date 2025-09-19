"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, usePathname, useRouter, useSearchParams } from "next/navigation";
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
  const params = useParams<{ id?: string }>();
  const id = typeof params?.id === "string" ? params.id : "";
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const sessionQuery = useSession(id ? id : null);
  const startSession = useSessionStart();
  const pauseSession = useSessionPause();
  const resumeSession = useSessionResume();
  const seekSession = useSessionSeek();
  const refetchSession = sessionQuery.refetch;

  const {
    mutateAsync: startSessionMutateAsync,
    isPending: isStartingSession,
  } = startSession;
  const {
    mutateAsync: pauseSessionMutateAsync,
    isPending: isPausingSession,
  } = pauseSession;
  const {
    mutateAsync: resumeSessionMutateAsync,
    isPending: isResumingSession,
  } = resumeSession;
  const {
    mutateAsync: seekSessionMutateAsync,
    isPending: isSeekingSession,
  } = seekSession;

  const [streams, setStreams] = useState<string>(searchParams.get("streams") ?? "");
  const [wsRows, setWsRows] = useState<WsKlineData[]>([]);
  const [receivedCount, setReceivedCount] = useState(0);
  const [seekValue, setSeekValue] = useState<string>("");
  const startPromiseRef = useRef<Promise<void> | null>(null);

  useEffect(() => {
    const nextStreams = searchParams.get("streams") ?? "";
    setStreams((prev) => (prev === nextStreams ? prev : nextStreams));
  }, [searchParams]);

  const updateQuery = useCallback(
    (value: string) => {
      const next = new URLSearchParams(searchParams.toString());
      if (value) next.set("streams", value);
      else next.delete("streams");
      const queryString = next.toString();
      router.replace(queryString ? `${pathname}?${queryString}` : pathname);
    },
    [pathname, router, searchParams]
  );

  const session = sessionQuery.data ?? null;

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

  const handleStart = async () => {
    if (!session) return;
    try {
      await startSessionOnce(session);
      toast.success("Sesión iniciada");
    } catch (error) {
      toast.error(getMessage(error));
    }
  };

  const handlePause = async () => {
    if (!session || session.status.toLowerCase() !== "running") return;
    try {
      await pauseSessionMutateAsync(session.id);
      toast.success("Sesión pausada");
      await refetchSession();
    } catch (error) {
      toast.error(getMessage(error));
    }
  };

  const handleResume = async () => {
    if (!session || session.status.toLowerCase() !== "paused") return;
    try {
      await resumeSessionMutateAsync(session.id);
      toast.success("Sesión reanudada");
      await refetchSession();
    } catch (error) {
      toast.error(getMessage(error));
    }
  };

  const handleSeek = async () => {
    if (!seekValue) {
      toast.error("Ingresá un timestamp");
      return;
    }
    if (!session || isSessionCompletedStatus(session.status)) {
      toast.error("La sesión no admite más movimientos");
      return;
    }
    const timestamp = Number(seekValue);
    if (Number.isNaN(timestamp)) {
      toast.error("Timestamp inválido");
      return;
    }
    try {
      await seekSessionMutateAsync({ id: session.id, timestamp });
      toast.success("Seek enviado");
      await refetchSession();
    } catch (error) {
      toast.error(getMessage(error));
    }
  };

  const startSessionOnce = useCallback(
    async (current: SessionResponse): Promise<void> => {
      if (isSessionCompletedStatus(current.status)) {
        throw new Error("La sesión finalizó");
      }
      if (current.status.toLowerCase() === "running") {
        return;
      }
      if (startPromiseRef.current) {
        return startPromiseRef.current;
      }

      const promise: Promise<void> = (async () => {
        await startSessionMutateAsync(current.id);
        await refetchSession();
      })().finally(() => {
        startPromiseRef.current = null;
      });

      startPromiseRef.current = promise;
      return promise;
    },
    [refetchSession, startSessionMutateAsync]
  );

  const ensureSessionRunning = useCallback(async (): Promise<void> => {
    if (!session) {
      throw new Error("Sesión no encontrada");
    }
    await startSessionOnce(session);
  }, [session, startSessionOnce]);

  const handleKline = useCallback((kline: WsKlineData) => {
    setReceivedCount((prev) => prev + 1);
    setWsRows((prev) => {
      const map = new Map(prev.map((row) => [row.closeTime, row] as const));
      map.set(kline.closeTime, kline);
      const next = Array.from(map.values()).sort((a, b) => b.closeTime - a.closeTime);
      return next.slice(0, MAX_ROWS);
    });
  }, []);

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

  if (sessionQuery.isLoading || !session) {
    return <div className="h-64 animate-pulse rounded-md border bg-muted" />;
  }

  const isSessionRunning = session.status.toLowerCase() === "running";
  const isSessionPaused = session.status.toLowerCase() === "paused";
  const isSessionCompleted = isSessionCompletedStatus(session.status);

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
          <Button
            onClick={handleStart}
            disabled={
              isStartingSession || isSessionCompleted || startPromiseRef.current !== null
            }
          >
            {isStartingSession ? "Iniciando..." : "Start"}
          </Button>
          <Button
            onClick={handlePause}
            disabled={isPausingSession || !isSessionRunning || isSessionCompleted}
          >
            {isPausingSession ? "Pausando..." : "Pause"}
          </Button>
          <Button
            onClick={handleResume}
            disabled={isResumingSession || !isSessionPaused || isSessionCompleted}
          >
            {isResumingSession ? "Reanudando..." : "Resume"}
          </Button>
          <div className="flex items-center gap-2">
            <Input
              placeholder="Timestamp ms"
              value={seekValue}
              onChange={(event) => setSeekValue(event.target.value)}
            />
            <Button onClick={handleSeek} disabled={isSeekingSession || isSessionCompleted}>
              {isSeekingSession ? "Buscando..." : "Seek"}
            </Button>
          </div>
        </div>
        <div className="mt-4 text-sm text-muted-foreground">
          Inicio: {formatDateTime(session.startTime)} · Fin: {formatDateTime(session.endTime)} ·
          Speed: {session.speed} · Seed: {session.seed}
        </div>
        {isSessionCompleted ? (
          <p className="mt-2 text-sm text-destructive">
            La sesión finalizó. No se recibirán más velas.
          </p>
        ) : null}
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
          disabled={isSessionCompleted}
          onConnectionChange={(status) => {
            if (!status) {
              setReceivedCount(0);
            }
          }}
        />
        <div className="rounded-lg border p-4">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-base font-semibold">Últimas velas</h3>
            <div className="flex items-center gap-2">
              <Badge variant="secondary">{receivedCount} recibidas</Badge>
              <Badge variant="outline">{wsRows.length} en tabla</Badge>
            </div>
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

function isSessionCompletedStatus(status: string) {
  const normalized = status.toLowerCase();
  return normalized === "completed" || normalized === "ended" || normalized === "failed";
}
