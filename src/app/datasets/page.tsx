"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { toast } from "sonner";

import { listDatasets, deleteDataset as deleteDatasetApi, startIngest, cancelIngest as cancelIngestApi } from "@/api/datasets";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { DataTable, type DataTableColumn } from "@/components/DataTable";
import { DatasetIngestDrawer } from "@/components/DatasetIngestDrawer";
import { ComboBox } from "@/components/ComboBox";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useDatasetIngest } from "@/hooks/useDatasetIngest";
import type { Dataset, DatasetStatus } from "@/types/datasets";
import {
  useCreateDataset,
  useSymbols,
  useIntervals,
  useAvailableRange,
} from "@/lib/hooks";
import { formatRelativeTime } from "@/lib/time";

import type { Interval } from "@/lib/api-types";

const INTERVAL_VALUES: [Interval, ...Interval[]] = [
  "1m",
  "3m",
  "5m",
  "15m",
  "30m",
  "1h",
  "2h",
  "4h",
  "6h",
  "8h",
  "12h",
  "1d",
  "3d",
  "1w",
  "1M",
];

const datasetSchema = z
  .object({
    symbol: z.string().min(1, "Seleccioná un par"),
    interval: z.enum(INTERVAL_VALUES),
    startTime: z.coerce.number().int().min(0, "Fecha inválida"),
    endTime: z.coerce.number().int().min(0, "Fecha inválida"),
    name: z.string().min(1, "Nombre requerido"),
  })
  .refine((d) => d.endTime > d.startTime, {
    message: "El fin debe ser mayor al inicio",
    path: ["endTime"],
  });

const FINAL_STATUSES: DatasetStatus[] = ["Ready", "Failed", "Canceled"];

type DatasetRow = Dataset & { updatedAt?: number; progress?: number; lastMessage?: string };

export default function DatasetsPage() {
  const queryClient = useQueryClient();
  const [formState, setFormState] = useState<{
    symbol: string;
    interval: Interval | "";
    startLocal: string;
    endLocal: string;
  }>({
    symbol: "",
    interval: "",
    startLocal: "",
    endLocal: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [intervalsOpen, setIntervalsOpen] = useState(false);
  const [selectedDatasetId, setSelectedDatasetId] = useState<string | null>(null);
  const [confirmState, setConfirmState] = useState<{
    dataset: Dataset;
    force?: boolean;
  } | null>(null);

  const datasetsQuery = useQuery({
    queryKey: ["datasets"],
    queryFn: listDatasets,
  });

  const createDataset = useCreateDataset();

  const startIngestMutation = useMutation({
    mutationFn: (id: string) => startIngest(id),
    onSuccess: (_, id) => {
      toast.success("Ingesta iniciada");
      queryClient.invalidateQueries({ queryKey: ["datasets"] });
      setSelectedDatasetId(id);
    },
    onError: (error) => {
      const message = error instanceof Error ? error.message : "No se pudo iniciar la ingesta";
      toast.error(message);
    },
  });

  const cancelIngestMutation = useMutation({
    mutationFn: (id: string) => cancelIngestApi(id),
    onSuccess: () => {
      toast.success("Ingesta cancelada");
      queryClient.invalidateQueries({ queryKey: ["datasets"] });
    },
    onError: (error) => {
      const message = error instanceof Error ? error.message : "No se pudo cancelar la ingesta";
      toast.error(message);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: ({ id, force }: { id: string; force?: boolean }) =>
      deleteDatasetApi(id, { force }),
    onSuccess: (_, variables) => {
      toast.success("Dataset eliminado");
      queryClient.invalidateQueries({ queryKey: ["datasets"] });
      setConfirmState(null);
      if (variables.id === selectedDatasetId) {
        setSelectedDatasetId(null);
      }
    },
    onError: (error) => {
      const message = error instanceof Error ? error.message : "No se pudo eliminar el dataset";
      toast.error(message);
    },
  });

  const symbolsQuery = useSymbols(true);
  const intervalsQuery = useIntervals(intervalsOpen);
  const rangeQuery = useAvailableRange(formState.symbol, formState.interval);

  const toMs = (local: string) => (local ? new Date(local).getTime() : 0);
  const fromMs = (ms: number) => new Date(ms).toISOString().slice(0, 16);

  const r = rangeQuery.data;
  const minLocal = r ? fromMs(r.firstOpenTime) : undefined;
  const maxLocal = r ? fromMs(r.lastCloseTime) : undefined;

  const datasets = datasetsQuery.data ?? [];
  const activeDataset = selectedDatasetId
    ? datasets.find((d) => d.id === selectedDatasetId) ?? null
    : null;

  const ingestState = useDatasetIngest(selectedDatasetId ?? "", {
    enabled: Boolean(selectedDatasetId),
  });

  const triggerStartIngest = startIngestMutation.mutate;
  const triggerCancelIngest = cancelIngestMutation.mutate;
  const isStartingIngest = startIngestMutation.isPending;
  const isCancelingIngest = cancelIngestMutation.isPending;
  const isDeletingDataset = deleteMutation.isPending;

  useEffect(() => {
    if (!ingestState.data) return;
    queryClient.setQueryData<Dataset[]>(["datasets"], (prev) => {
      if (!prev) return prev;
      return prev.map((dataset) =>
        dataset.id === ingestState.data?.id
          ? { ...dataset, ...ingestState.data }
          : dataset
      );
    });
  }, [ingestState.data, queryClient]);

  const previousStatusRef = useRef<DatasetStatus | undefined>();
  useEffect(() => {
    const status = ingestState.data?.status;
    if (!status) return;
    const prev = previousStatusRef.current;
    if (prev !== status && FINAL_STATUSES.includes(status)) {
      datasetsQuery.refetch();
    }
    previousStatusRef.current = status;
  }, [datasetsQuery, ingestState.data?.status]);

  const columns = useMemo<DataTableColumn<DatasetRow>[]>(() => {
    const renderStatus = (row: DatasetRow) => {
      const status = row.status;
      const variant =
        status === "Ready"
          ? "default"
          : status === "Ingesting"
          ? "secondary"
          : "outline";
      const statusClass =
        status === "Failed"
          ? "bg-destructive text-destructive-foreground border-destructive"
          : status === "Ready"
          ? "bg-emerald-100 text-emerald-900 border-emerald-200 dark:bg-emerald-500/20 dark:text-emerald-100"
          : status === "Ingesting"
          ? "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-500/20 dark:text-blue-100"
          : status === "Canceled"
          ? "bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-500/20 dark:text-yellow-100"
          : undefined;
      return (
        <Badge variant={variant} className={statusClass}>
          {status}
        </Badge>
      );
    };

    return [
      {
        key: "name",
        header: "Nombre",
        render: (row) => row.name ?? `${row.symbol}-${row.interval}`,
      },
      { key: "symbol", header: "Par" },
      { key: "interval", header: "Intervalo" },
      {
        key: "status",
        header: "Estado",
        render: renderStatus,
      },
      {
        key: "progress",
        header: "Progreso",
        render: (row) => (
          <div className="space-y-2">
            <Progress value={row.progress ?? 0} />
            <div className="text-xs text-muted-foreground">
              {row.lastMessage
                ? `${Math.round(row.progress ?? 0)}% • ${row.lastMessage}`
                : `${Math.round(row.progress ?? 0)}%`}
            </div>
          </div>
        ),
      },
      {
        key: "updatedAt",
        header: "Actualizado",
        render: (row) => (row.updatedAt ? formatRelativeTime(row.updatedAt) : "-"),
      },
      {
        key: "actions",
        header: "Acciones",
        render: (row) => {
          const canIngest = ["Registered", "Failed", "Canceled"].includes(row.status);
          const isIngesting = row.status === "Ingesting";
          const isDeleting = isDeletingDataset && confirmState?.dataset.id === row.id;

          return (
            <div className="flex flex-wrap gap-2">
              {canIngest ? (
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={isStartingIngest}
                  onClick={() => triggerStartIngest(row.id)}
                >
                  Ingestar
                </Button>
              ) : null}
              {isIngesting ? (
                <Button
                  size="sm"
                  variant="outline"
                  disabled={isCancelingIngest}
                  onClick={() => triggerCancelIngest(row.id)}
                >
                  Cancelar
                </Button>
              ) : null}
              <Button
                size="sm"
                variant="destructive"
                disabled={isDeleting}
                onClick={() =>
                  setConfirmState({
                    dataset: row,
                    force: row.status === "Ingesting",
                  })
                }
              >
                {row.status === "Ingesting" ? "Force delete" : "Eliminar"}
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setSelectedDatasetId(row.id)}>
                Logs
              </Button>
            </div>
          );
        },
      },
    ];
  }, [
    confirmState,
    isCancelingIngest,
    isDeletingDataset,
    isStartingIngest,
    triggerCancelIngest,
    triggerStartIngest,
  ]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const payload = {
      symbol: formState.symbol,
      interval: formState.interval as Interval,
      startTime: toMs(formState.startLocal || minLocal || ""),
      endTime: toMs(formState.endLocal || maxLocal || ""),
      name: `${formState.symbol}-${formState.interval}`,
    };
    const parsed = datasetSchema.safeParse(payload);
    if (!parsed.success) {
      const validationErrors: Record<string, string> = {};
      parsed.error.issues.forEach((issue) => {
        const key = (issue.path[0] as string) || "form";
        validationErrors[key] = issue.message;
      });
      setErrors(validationErrors);
      return;
    }
    setErrors({});
    try {
      await createDataset.mutateAsync(parsed.data);
      toast.success("Dataset creado");
      setFormState({ symbol: "", interval: "", startLocal: "", endLocal: "" });
      queryClient.invalidateQueries({ queryKey: ["datasets"] });
    } catch (error) {
      const message = error instanceof Error ? error.message : "No se pudo crear el dataset";
      toast.error(message);
    }
  };

  const confirmDatasetDeletion = confirmState?.dataset;

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold">Datasets</h1>
        <p className="text-sm text-muted-foreground">
          Registrá datasets desde Binance y seguí la ingesta en tiempo real.
        </p>
      </header>

      <section className="grid gap-6 lg:grid-cols-[2fr,1fr]">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Listado</h2>
            <Button
              size="sm"
              onClick={() => datasetsQuery.refetch()}
              disabled={datasetsQuery.isFetching}
            >
              Actualizar
            </Button>
          </div>
          {datasetsQuery.isLoading ? (
            <div className="h-40 animate-pulse rounded-md border bg-muted" />
          ) : (
            <DataTable
              data={datasets}
              columns={columns}
              emptyMessage="No hay datasets registrados"
              caption={`Total: ${datasets.length}`}
              getRowId={(row) => row.id}
            />
          )}
        </div>

        <div className="rounded-lg border p-4">
          <h2 className="text-lg font-semibold">Registrar dataset</h2>
          <form className="mt-4 space-y-4" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <label className="text-sm font-medium">Par</label>
              <ComboBox
                options={(symbolsQuery.data ?? []).map((symbol) => ({
                  label: symbol.symbol,
                  value: symbol.symbol,
                }))}
                value={formState.symbol}
                onChange={(value) =>
                  setFormState((state) => ({
                    ...state,
                    symbol: value,
                    startLocal: "",
                    endLocal: "",
                  }))
                }
                placeholder="Seleccioná un par"
                inputPlaceholder="Buscar par (p. ej., BTC)"
                disabled={symbolsQuery.isLoading}
              />
              {errors.symbol ? (
                <p className="text-xs text-destructive">{errors.symbol}</p>
              ) : null}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Temporalidad</label>
              <Select
                onOpenChange={setIntervalsOpen}
                value={formState.interval}
                onValueChange={(value: Interval) =>
                  setFormState((state) => ({
                    ...state,
                    interval: value,
                    startLocal: "",
                    endLocal: "",
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccioná la temporalidad" />
                </SelectTrigger>
                <SelectContent>
                  {intervalsQuery.isLoading ? (
                    <div className="p-2 text-sm">Cargando…</div>
                  ) : (
                    intervalsQuery.data ?? []
                  ).map((interval) => (
                    <SelectItem key={interval} value={interval}>
                      {interval}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.interval ? (
                <p className="text-xs text-destructive">{errors.interval}</p>
              ) : null}
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium">Desde</label>
                <Input
                  type="datetime-local"
                  min={minLocal}
                  max={maxLocal}
                  value={formState.startLocal || minLocal || ""}
                  onChange={(event) =>
                    setFormState((state) => ({
                      ...state,
                      startLocal: event.target.value,
                    }))
                  }
                  disabled={!r}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Hasta</label>
                <Input
                  type="datetime-local"
                  min={minLocal}
                  max={maxLocal}
                  value={formState.endLocal || maxLocal || ""}
                  onChange={(event) =>
                    setFormState((state) => ({
                      ...state,
                      endLocal: event.target.value,
                    }))
                  }
                  disabled={!r}
                />
                {(errors.startTime || errors.endTime) ? (
                  <p className="text-xs text-destructive">
                    {errors.startTime || errors.endTime}
                  </p>
                ) : null}
                {!r && formState.symbol && formState.interval ? (
                  <p className="text-xs text-muted-foreground">
                    Obteniendo rango disponible…
                  </p>
                ) : null}
              </div>
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={
                createDataset.isPending ||
                !formState.symbol ||
                !formState.interval
              }
            >
              {createDataset.isPending ? "Guardando…" : "Registrar"}
            </Button>
          </form>
        </div>
      </section>

      <DatasetIngestDrawer
        open={Boolean(selectedDatasetId)}
        dataset={activeDataset ?? null}
        detail={ingestState.data}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedDatasetId(null);
          }
        }}
        onCancel={() => {
          if (!selectedDatasetId) return;
          cancelIngestMutation.mutate(selectedDatasetId);
        }}
        cancelDisabled={cancelIngestMutation.isPending}
        isPolling={ingestState.isPolling}
      />

      <ConfirmDialog
        open={Boolean(confirmDatasetDeletion)}
        title={confirmState?.force ? "Eliminar durante la ingesta" : "Eliminar dataset"}
        description={
          confirmState?.force
            ? "El dataset está en ingesta. Esto forzará su eliminación inmediata."
            : "Esta acción eliminará el dataset de manera permanente."
        }
        confirmLabel={confirmState?.force ? "Force delete" : "Eliminar"}
        onConfirm={() => {
          if (!confirmState) return;
          deleteMutation.mutate({
            id: confirmState.dataset.id,
            force: confirmState.force,
          });
        }}
        onCancel={() => setConfirmState(null)}
      />
    </div>
  );
}
