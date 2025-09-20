"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";

import { ComboBox } from "@/components/ComboBox";
import { DataTable, type DataTableColumn } from "@/components/DataTable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import type { SessionResponse, SessionStatus } from "@/lib/api-types";
import {
  useCreateSession,
  useDatasetIntervals,
  useDatasetRange,
  useDatasetSymbols,
  useSessionPause,
  useSessionEnable,
  useSessionDisable,
  useSessionDelete,
  useSessionResume,
  useSessionStart,
  useSessions,
} from "@/lib/hooks";
import { formatDateTime } from "@/lib/time";

const sessionSchema = z
  .object({
    symbol: z.string().min(1, "Seleccioná un símbolo"),
    interval: z.string().min(1, "Seleccioná un intervalo"),
    startTime: z.number().int(),
    endTime: z.number().int(),
    speed: z.coerce.number().positive("La velocidad debe ser mayor a 0"),
    seed: z.coerce.number().int("Seed inválida"),
  })
  .refine((value) => value.endTime > value.startTime, {
    message: "El fin debe ser mayor al inicio",
    path: ["endTime"],
  });

export default function SessionsPage() {
  const [formState, setFormState] = useState({
    symbol: "",
    interval: "",
    startTime: "",
    endTime: "",
    speed: "1",
    seed: "123",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const sessionsQuery = useSessions();
  const createSession = useCreateSession();
  const startSession = useSessionStart();
  const pauseSession = useSessionPause();
  const resumeSession = useSessionResume();
  const enableSession = useSessionEnable();
  const disableSession = useSessionDisable();
  const deleteSession = useSessionDelete();
  const datasetSymbolsQuery = useDatasetSymbols();
  const datasetIntervalsQuery = useDatasetIntervals(
    formState.symbol || null
  );
  const datasetRangeQuery = useDatasetRange(
    formState.symbol || null,
    formState.interval || null
  );
  const range = datasetRangeQuery.data ?? null;

  const clearErrors = useCallback((...keys: string[]) => {
    if (keys.length === 0) return;
    setErrors((prev) => {
      if (keys.every((key) => !(key in prev))) {
        return prev;
      }
      const next = { ...prev };
      for (const key of keys) {
        delete next[key];
      }
      return next;
    });
  }, []);

  useEffect(() => {
    if (!range) {
      return;
    }

    clearErrors("range", "startTime", "endTime");

    const defaultStart = toDatetimeLocal(range.firstOpenTime);
    const defaultEnd = toDatetimeLocal(range.lastCloseTime);

    setFormState((prev) => {
      let changed = false;
      const next = { ...prev };

      const startMs = parseDatetimeLocal(prev.startTime);
      if (
        !prev.startTime ||
        Number.isNaN(startMs) ||
        startMs < range.firstOpenTime ||
        startMs > range.lastCloseTime
      ) {
        next.startTime = defaultStart;
        changed = true;
      }

      const endMs = parseDatetimeLocal(prev.endTime);
      if (
        !prev.endTime ||
        Number.isNaN(endMs) ||
        endMs > range.lastCloseTime ||
        endMs < range.firstOpenTime
      ) {
        next.endTime = defaultEnd;
        changed = true;
      }

      return changed ? next : prev;
    });
  }, [range, clearErrors]);

  const minDate = range ? toDatetimeLocal(range.firstOpenTime) : "";
  const maxDate = range ? toDatetimeLocal(range.lastCloseTime) : "";
  const isSubmitDisabled =
    createSession.isPending ||
    !formState.symbol ||
    !formState.interval ||
    !range;

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
    mutateAsync: enableSessionMutateAsync,
    isPending: isEnablingSession,
  } = enableSession;
  const {
    mutateAsync: disableSessionMutateAsync,
    isPending: isDisablingSession,
  } = disableSession;
  const {
    mutateAsync: deleteSessionMutateAsync,
    isPending: isDeletingSession,
  } = deleteSession;

  const refetchSessions = sessionsQuery.refetch;

  const columns = useMemo<DataTableColumn<SessionResponse>[]>(
    () => [
      { key: "id", header: "ID" },
      {
        key: "symbols",
        header: "Símbolos",
        render: (row) => row.symbols.join(", "),
      },
      { key: "interval", header: "Intervalo" },
      { key: "status", header: "Estado" },
      {
        key: "enabled",
        header: "Enabled",
        render: (row) => (
          <Badge variant={row.enabled ? "secondary" : "outline"}>
            {row.enabled ? "On" : "Off"}
          </Badge>
        ),
      },
      {
        key: "createdAt",
        header: "Creado",
        render: (row) => formatDateTime(row.createdAt),
      },
      {
        key: "actions",
        header: "Acciones",
        render: (row) => (
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              variant="outline"
              disabled={
                isStartingSession ||
                isSessionRunningStatus(row.status) ||
                isSessionCompletedStatus(row.status)
              }
              onClick={async () => {
                try {
                  await startSessionMutateAsync(row.id);
                  toast.success("Sesión iniciada");
                  await refetchSessions();
                } catch (error) {
                  toast.error(getMessage(error));
                }
              }}
            >
              Start
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={
                isPausingSession ||
                !isSessionRunningStatus(row.status) ||
                isSessionCompletedStatus(row.status)
              }
              onClick={async () => {
                try {
                  await pauseSessionMutateAsync(row.id);
                  toast.success("Sesión pausada");
                  await refetchSessions();
                } catch (error) {
                  toast.error(getMessage(error));
                }
              }}
            >
              Pause
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={
                isResumingSession ||
                !isSessionPausedStatus(row.status) ||
                isSessionCompletedStatus(row.status)
              }
              onClick={async () => {
                try {
                  await resumeSessionMutateAsync(row.id);
                  toast.success("Sesión reanudada");
                  await refetchSessions();
                } catch (error) {
                  toast.error(getMessage(error));
                }
              }}
            >
              Resume
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={
                isEnablingSession ||
                isDisablingSession ||
                isDeletingSession
              }
              onClick={async () => {
                try {
                  if (row.enabled) {
                    await disableSessionMutateAsync(row.id);
                    toast.success("Sesión deshabilitada");
                  } else {
                    await enableSessionMutateAsync(row.id);
                    toast.success("Sesión habilitada");
                  }
                  await refetchSessions();
                } catch (error) {
                  toast.error(getMessage(error));
                }
              }}
            >
              {row.enabled ? "Disable" : "Enable"}
            </Button>
            <Button
              size="sm"
              variant="destructive"
              disabled={isDeletingSession}
              onClick={async () => {
                const confirmed = window.confirm(
                  "¿Confirmás que querés eliminar la sesión?"
                );
                if (!confirmed) {
                  return;
                }
                try {
                  await deleteSessionMutateAsync(row.id);
                  toast.success("Sesión eliminada");
                  await refetchSessions();
                } catch (error) {
                  toast.error(getMessage(error));
                }
              }}
            >
              Delete
            </Button>
            <Button asChild size="sm">
              <Link href={`/sessions/${row.id}`}>Detalle</Link>
            </Button>
          </div>
        ),
      },
    ],
    [
      isPausingSession,
      pauseSessionMutateAsync,
      isResumingSession,
      resumeSessionMutateAsync,
      isStartingSession,
      startSessionMutateAsync,
      isEnablingSession,
      enableSessionMutateAsync,
      isDisablingSession,
      disableSessionMutateAsync,
      isDeletingSession,
      deleteSessionMutateAsync,
      refetchSessions,
    ]
  );

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const result = sessionSchema.safeParse({
      symbol: formState.symbol,
      interval: formState.interval,
      startTime: parseDatetimeLocal(formState.startTime),
      endTime: parseDatetimeLocal(formState.endTime),
      speed: formState.speed,
      seed: formState.seed,
    });

    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of result.error.issues) {
        if (issue.path[0]) {
          fieldErrors[String(issue.path[0])] = issue.message;
        }
      }
      setErrors(fieldErrors);
      return;
    }

    const validationErrors: Record<string, string> = {};
    if (!range) {
      validationErrors.range =
        "Seleccioná un símbolo e intervalo con datos disponibles";
    } else {
      const { firstOpenTime, lastCloseTime } = range;
      if (
        result.data.startTime < firstOpenTime ||
        result.data.startTime > lastCloseTime
      ) {
        validationErrors.startTime = "Fuera del rango disponible";
      }
      if (
        result.data.endTime < firstOpenTime ||
        result.data.endTime > lastCloseTime
      ) {
        validationErrors.endTime = "Fuera del rango disponible";
      }
    }

    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setErrors({});
    const payload = {
      symbols: [result.data.symbol],
      interval: result.data.interval,
      startTime: result.data.startTime,
      endTime: result.data.endTime,
      speed: result.data.speed,
      seed: result.data.seed,
    } as const;

    try {
      await createSession.mutateAsync(payload);
      toast.success("Sesión creada");
    } catch (error) {
      toast.error(getMessage(error));
    }
  };

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold">Sesiones</h1>
        <p className="text-sm text-muted-foreground">
          Definí nuevas sesiones de replay y controlá su estado.
        </p>
      </header>

      <section className="rounded-lg border p-4">
        <h2 className="text-lg font-semibold">Crear sesión</h2>
        <form className="mt-4 grid gap-4 md:grid-cols-2" onSubmit={handleSubmit}>
          <div className="space-y-2 md:col-span-2">
            <label className="text-sm font-medium" htmlFor="symbol">
              Símbolo
            </label>
            <ComboBox
              options={(datasetSymbolsQuery.data ?? []).map((item) => ({
                label: item.symbol,
                value: item.symbol,
              }))}
              value={formState.symbol || null}
              onChange={(value) => {
                setFormState((prev) => ({
                  ...prev,
                  symbol: value,
                  interval: "",
                  startTime: "",
                  endTime: "",
                }));
                clearErrors("symbol", "interval", "startTime", "endTime", "range");
              }}
              placeholder="Seleccioná un símbolo"
              inputPlaceholder="Buscar símbolo"
              emptyMessage={
                datasetSymbolsQuery.isLoading
                  ? "Cargando..."
                  : "No hay símbolos disponibles"
              }
              disabled={datasetSymbolsQuery.isLoading}
            />
            {errors.symbol ? (
              <p className="text-xs text-destructive">{errors.symbol}</p>
            ) : null}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="interval">
              Intervalo
            </label>
            <ComboBox
              options={(datasetIntervalsQuery.data ?? []).map((item) => ({
                label: item.interval,
                value: item.interval,
              }))}
              value={formState.interval || null}
              onChange={(value) => {
                setFormState((prev) => ({
                  ...prev,
                  interval: value,
                  startTime: "",
                  endTime: "",
                }));
                clearErrors("interval", "startTime", "endTime", "range");
              }}
              placeholder={
                formState.symbol
                  ? "Seleccioná un intervalo"
                  : "Elegí un símbolo primero"
              }
              emptyMessage={
                datasetIntervalsQuery.isLoading
                  ? "Cargando..."
                  : "No hay intervalos disponibles"
              }
              disabled={!formState.symbol || datasetIntervalsQuery.isLoading}
            />
            {errors.interval ? (
              <p className="text-xs text-destructive">{errors.interval}</p>
            ) : null}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="startTime">
              Inicio
            </label>
            <Input
              id="startTime"
              type="datetime-local"
              min={minDate || undefined}
              max={maxDate || undefined}
              value={formState.startTime}
              onChange={(event) => {
                setFormState((prev) => ({
                  ...prev,
                  startTime: event.target.value,
                }));
                clearErrors("startTime", "range");
              }}
              disabled={!range}
            />
            {errors.startTime ? (
              <p className="text-xs text-destructive">{errors.startTime}</p>
            ) : null}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="endTime">
              Fin
            </label>
            <Input
              id="endTime"
              type="datetime-local"
              min={minDate || undefined}
              max={maxDate || undefined}
              value={formState.endTime}
              onChange={(event) => {
                setFormState((prev) => ({
                  ...prev,
                  endTime: event.target.value,
                }));
                clearErrors("endTime", "range");
              }}
              disabled={!range}
            />
            {errors.endTime ? (
              <p className="text-xs text-destructive">{errors.endTime}</p>
            ) : null}
          </div>

          <div className="md:col-span-2 space-y-1 text-xs">
            {datasetRangeQuery.isLoading && formState.symbol && formState.interval ? (
              <p className="text-muted-foreground">Obteniendo rango disponible…</p>
            ) : null}
            {range ? (
              <p className="text-muted-foreground">
                Rango disponible: {formatDateTime(range.firstOpenTime)} – {" "}
                {formatDateTime(range.lastCloseTime)}
              </p>
            ) : null}
            {datasetRangeQuery.error ? (
              <p className="text-destructive">
                {getMessage(datasetRangeQuery.error)}
              </p>
            ) : null}
            {errors.range ? (
              <p className="text-destructive">{errors.range}</p>
            ) : null}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="speed">
              Velocidad
            </label>
            <Input
              id="speed"
              value={formState.speed}
              onChange={(event) => {
                setFormState((prev) => ({ ...prev, speed: event.target.value }));
                clearErrors("speed");
              }}
            />
            {errors.speed ? (
              <p className="text-xs text-destructive">{errors.speed}</p>
            ) : null}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="seed">
              Seed
            </label>
            <Input
              id="seed"
              value={formState.seed}
              onChange={(event) => {
                setFormState((prev) => ({ ...prev, seed: event.target.value }));
                clearErrors("seed");
              }}
            />
            {errors.seed ? (
              <p className="text-xs text-destructive">{errors.seed}</p>
            ) : null}
          </div>

          <div className="md:col-span-2">
            <Button type="submit" disabled={isSubmitDisabled}>
              {createSession.isPending ? "Creando..." : "Crear sesión"}
            </Button>
          </div>
        </form>
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Listado de sesiones</h2>
          <Badge variant="secondary">
            {sessionsQuery.data?.length ?? 0} registradas
          </Badge>
        </div>
        {sessionsQuery.isLoading ? (
          <div className="h-40 animate-pulse rounded-md border bg-muted" />
        ) : (
          <DataTable
            data={sessionsQuery.data ?? []}
            columns={columns}
            emptyMessage="No hay sesiones registradas"
            caption="Sesiones activas en el backend"
            getRowId={(row) => row.id}
          />
        )}
      </section>
    </div>
  );
}

function getMessage(error: unknown) {
  return error instanceof Error ? error.message : "Ocurrió un error";
}

function toDatetimeLocal(value: number) {
  return new Date(value).toISOString().slice(0, 16);
}

function parseDatetimeLocal(value: string) {
  if (!value) return Number.NaN;
  const timestamp = new Date(value).getTime();
  return Number.isNaN(timestamp) ? Number.NaN : timestamp;
}

function isSessionRunningStatus(status: SessionStatus | string) {
  return status.toLowerCase() === "running";
}

function isSessionPausedStatus(status: SessionStatus | string) {
  return status.toLowerCase() === "paused";
}

function isSessionCompletedStatus(status: SessionStatus | string) {
  const normalized = status.toLowerCase();
  return (
    normalized === "completed" || normalized === "ended" || normalized === "failed"
  );
}
