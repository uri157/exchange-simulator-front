"use client";

import { FormEvent, useMemo, useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { DataTable, type DataTableColumn } from "@/components/DataTable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { ComboBox } from "@/components/ComboBox";

import type { DatasetSummary, Interval } from "@/lib/api-types";
import {
  useCreateDataset, useDatasets, useIngestDataset,
  useSymbols, useIntervals, useAvailableRange,
} from "@/lib/hooks";
import { formatDateTime } from "@/lib/time";

const INTERVAL_VALUES: [Interval, ...Interval[]] = [
  "1m","3m","5m","15m","30m",
  "1h","2h","4h","6h","8h","12h",
  "1d","3d","1w","1M",
];

const datasetSchema = z.object({
  symbol: z.string().min(1, "Seleccioná un par"),
  interval: z.enum(INTERVAL_VALUES),
  startTime: z.coerce.number().int().min(0, "Fecha inválida"),
  endTime: z.coerce.number().int().min(0, "Fecha inválida"),
  name: z.string().min(1, "Nombre requerido"),
}).refine(d => d.endTime > d.startTime, {
  message: "El fin debe ser mayor al inicio",
  path: ["endTime"],
});

export default function DatasetsPage() {
  const [formState, setFormState] = useState<{
    symbol: string; interval: Interval | ""; startLocal: string; endLocal: string;
  }>({
    symbol: "", interval: "", startLocal: "", endLocal: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const datasetsQuery = useDatasets();
  const createDataset = useCreateDataset();
  const ingestDataset = useIngestDataset();

  // dropdowns on-demand (intervals sigue usando Select)
  const [intervalsOpen, setIntervalsOpen] = useState(false);
  const symbolsQuery = useSymbols(true);        // cargamos de una para el ComboBox
  const intervalsQuery = useIntervals(intervalsOpen);

  const rangeQuery = useAvailableRange(formState.symbol, formState.interval);

  // Helpers de conversión
  const toMs = (local: string) => (local ? new Date(local).getTime() : 0);
  const fromMs = (ms: number) => new Date(ms).toISOString().slice(0,16); // yyyy-MM-ddTHH:mm

  const r = rangeQuery.data;
  const minLocal = r ? fromMs(r.firstOpenTime) : undefined;
  const maxLocal = r ? fromMs(r.lastCloseTime) : undefined;

  const columns = useMemo<DataTableColumn<DatasetSummary>[]>(() => [
    { key: "symbol", header: "Par" },
    { key: "interval", header: "Intervalo" },
    { key: "startTime", header: "Desde", render: (row) => formatDateTime(row.startTime) },
    { key: "endTime", header: "Hasta", render: (row) => formatDateTime(row.endTime) },
    { key: "status", header: "Estado" },
    {
      key: "actions",
      header: "Acciones",
      render: (row) => (
        <Button
          size="sm"
          variant="secondary"
          disabled={ingestDataset.isPending || row.status === "ingesting"}
          onClick={async () => {
            try {
              await ingestDataset.mutateAsync(row.id);
              toast.success(`Ingesta iniciada para ${row.symbol} ${row.interval}`);
            } catch (error) {
              const message =
                error instanceof Error
                  ? error.message
                  : "No se pudo iniciar la ingesta";
              toast.error(message);
            }
          }}
        >
          Ingestar
        </Button>
      ),
    },
  ], [ingestDataset]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const payload = {
      symbol: formState.symbol,
      interval: formState.interval as Interval,
      startTime: toMs(formState.startLocal || minLocal || ""),
      endTime: toMs(formState.endLocal || maxLocal || ""),
      name: `${formState.symbol}-${formState.interval}`,
    };
    const p = datasetSchema.safeParse(payload);
    if (!p.success) {
      const m: Record<string,string> = {};
      p.error.issues.forEach(i => {
        const k = (i.path[0] as string) || "form";
        m[k] = i.message;
      });
      setErrors(m);
      return;
    }
    setErrors({});
    try {
      await createDataset.mutateAsync(p.data);
      toast.success("Dataset creado");
      setFormState({ symbol:"", interval: "", startLocal:"", endLocal:"" });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "No se pudo crear el dataset";
      toast.error(message);
    }
  };

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold">Datasets</h1>
        <p className="text-sm text-muted-foreground">
          Registrá datasets desde Binance y lanzá la ingesta desde la UI.
        </p>
      </header>

      <section className="grid gap-6 md:grid-cols-[2fr,1fr]">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Listado</h2>
            <Button size="sm" onClick={() => datasetsQuery.refetch()} disabled={datasetsQuery.isFetching}>
              Actualizar
            </Button>
          </div>
          {datasetsQuery.isLoading ? (
            <div className="h-32 animate-pulse rounded-md border bg-muted" />
          ) : (
            <DataTable
              data={datasetsQuery.data ?? []}
              columns={columns}
              emptyMessage="No hay datasets registrados"
              caption={`Total: ${datasetsQuery.data?.length ?? 0}`}
              getRowId={(row) => row.id}
            />
          )}
        </div>

        <div className="rounded-lg border p-4">
          <h2 className="text-lg font-semibold">Registrar dataset</h2>
          <form className="mt-4 space-y-4" onSubmit={handleSubmit}>
            {/* Par (ComboBox buscable) */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Par</label>
              <ComboBox
                options={(symbolsQuery.data ?? []).map(s => ({ label: s.symbol, value: s.symbol }))}
                value={formState.symbol}
                onChange={(v) =>
                  setFormState((s) => ({ ...s, symbol: v, startLocal: "", endLocal: "" }))
                }
                placeholder="Seleccioná un par"
                inputPlaceholder="Buscar par (p. ej., BTC)"
                disabled={symbolsQuery.isLoading}
              />
              {errors.symbol && <p className="text-xs text-destructive">{errors.symbol}</p>}
            </div>

            {/* Interval (Select con fondo y scroll; la búsqueda tipiada básica la hace Radix) */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Temporalidad</label>
              <Select
                onOpenChange={setIntervalsOpen}
                value={formState.interval}
                onValueChange={(v: Interval) =>
                  setFormState((s) => ({ ...s, interval: v, startLocal: "", endLocal: "" }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccioná la temporalidad" />
                </SelectTrigger>
                <SelectContent>
                  {intervalsQuery.isLoading ? (
                    <div className="p-2 text-sm">Cargando...</div>
                  ) : (intervalsQuery.data ?? []).map((i) => (
                    <SelectItem key={i} value={i}>{i}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.interval && <p className="text-xs text-destructive">{errors.interval}</p>}
            </div>

            {/* Range */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Desde</label>
                <Input
                  type="datetime-local"
                  min={minLocal}
                  max={maxLocal}
                  value={formState.startLocal || (minLocal ?? "")}
                  onChange={(e) => setFormState((s) => ({ ...s, startLocal: e.target.value }))}
                  disabled={!r}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Hasta</label>
                <Input
                  type="datetime-local"
                  min={minLocal}
                  max={maxLocal}
                  value={formState.endLocal || (maxLocal ?? "")}
                  onChange={(e) => setFormState((s) => ({ ...s, endLocal: e.target.value }))}
                  disabled={!r}
                />
                {(errors.startTime || errors.endTime) && (
                  <p className="text-xs text-destructive">
                    {errors.startTime || errors.endTime}
                  </p>
                )}
                {(!r && formState.symbol && formState.interval) && (
                  <p className="text-xs text-muted-foreground">
                    Obteniendo rango disponible para {formState.symbol} {formState.interval}...
                  </p>
                )}
              </div>
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={createDataset.isPending || !formState.symbol || !formState.interval}
            >
              {createDataset.isPending ? "Guardando..." : "Registrar"}
            </Button>
          </form>
        </div>
      </section>
    </div>
  );
}
