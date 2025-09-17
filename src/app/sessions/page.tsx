"use client";

import Link from "next/link";
import { FormEvent, useMemo, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";

import { DataTable, type DataTableColumn } from "@/components/DataTable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import type { SessionResponse } from "@/lib/api-types";
import {
  useCreateSession,
  useExchangeInfo,
  useSessionPause,
  useSessionResume,
  useSessionStart,
  useSessions,
} from "@/lib/hooks";
import { formatDateTime } from "@/lib/time";

const sessionSchema = z.object({
  symbols: z.string().min(1),
  interval: z.string().min(1),
  startTime: z.coerce.number().int(),
  endTime: z.coerce.number().int(),
  speed: z.coerce.number().positive(),
  seed: z.coerce.number().int(),
});

export default function SessionsPage() {
  const [formState, setFormState] = useState({
    symbols: "BTCUSDT",
    interval: "1m",
    startTime: "1514764800000",
    endTime: "1609459199000",
    speed: "1",
    seed: "123",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const sessionsQuery = useSessions();
  const createSession = useCreateSession();
  const startSession = useSessionStart();
  const pauseSession = useSessionPause();
  const resumeSession = useSessionResume();
  const exchangeInfo = useExchangeInfo();

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
        key: "createdAt",
        header: "Creado",
        render: (row) => formatDateTime(new Date(row.createdAt).getTime()),
      },
      {
        key: "actions",
        header: "Acciones",
        render: (row) => (
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              variant="outline"
              disabled={startSession.isPending}
              onClick={async () => {
                try {
                  await startSession.mutateAsync(row.id);
                  toast.success("Sesión iniciada");
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
              disabled={pauseSession.isPending}
              onClick={async () => {
                try {
                  await pauseSession.mutateAsync(row.id);
                  toast.success("Sesión pausada");
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
              disabled={resumeSession.isPending}
              onClick={async () => {
                try {
                  await resumeSession.mutateAsync(row.id);
                  toast.success("Sesión reanudada");
                } catch (error) {
                  toast.error(getMessage(error));
                }
              }}
            >
              Resume
            </Button>
            <Button asChild size="sm">
              <Link href={`/sessions/${row.id}`}>Detalle</Link>
            </Button>
          </div>
        ),
      },
    ],
    [pauseSession.isPending, resumeSession.isPending, startSession.isPending]
  );

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const result = sessionSchema.safeParse(formState);
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

    setErrors({});
    const payload = {
      symbols: result.data.symbols.split(",").map((item) => item.trim()).filter(Boolean),
      interval: result.data.interval,
      startTime: result.data.startTime,
      endTime: result.data.endTime,
      speed: result.data.speed,
      seed: result.data.seed,
    } as const;

    if (payload.symbols.length === 0) {
      setErrors({ symbols: "Ingresá al menos un símbolo" });
      return;
    }

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
            <label className="text-sm font-medium" htmlFor="symbols">
              Símbolos (separados por coma)
            </label>
            <Input
              id="symbols"
              value={formState.symbols}
              onChange={(event) =>
                setFormState((prev) => ({ ...prev, symbols: event.target.value }))
              }
            />
            {errors.symbols ? (
              <p className="text-xs text-destructive">{errors.symbols}</p>
            ) : null}
            <p className="text-xs text-muted-foreground">
              Disponibles: {exchangeInfo.data?.symbols.filter((s) => s.active).slice(0, 10).map((s) => s.symbol).join(", ") ?? "—"}
            </p>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="interval">
              Intervalo
            </label>
            <Input
              id="interval"
              value={formState.interval}
              onChange={(event) =>
                setFormState((prev) => ({ ...prev, interval: event.target.value }))
              }
            />
            {errors.interval ? (
              <p className="text-xs text-destructive">{errors.interval}</p>
            ) : null}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="startTime">
              Inicio (epoch ms)
            </label>
            <Input
              id="startTime"
              value={formState.startTime}
              onChange={(event) =>
                setFormState((prev) => ({ ...prev, startTime: event.target.value }))
              }
            />
            {errors.startTime ? (
              <p className="text-xs text-destructive">{errors.startTime}</p>
            ) : null}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="endTime">
              Fin (epoch ms)
            </label>
            <Input
              id="endTime"
              value={formState.endTime}
              onChange={(event) =>
                setFormState((prev) => ({ ...prev, endTime: event.target.value }))
              }
            />
            {errors.endTime ? (
              <p className="text-xs text-destructive">{errors.endTime}</p>
            ) : null}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="speed">
              Velocidad
            </label>
            <Input
              id="speed"
              value={formState.speed}
              onChange={(event) =>
                setFormState((prev) => ({ ...prev, speed: event.target.value }))
              }
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
              onChange={(event) =>
                setFormState((prev) => ({ ...prev, seed: event.target.value }))
              }
            />
            {errors.seed ? (
              <p className="text-xs text-destructive">{errors.seed}</p>
            ) : null}
          </div>

          <div className="md:col-span-2">
            <Button type="submit" disabled={createSession.isPending}>
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
