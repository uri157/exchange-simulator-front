"use client";

import { FormEvent, useMemo, useState } from "react";
import { z } from "zod";
import { toast } from "sonner";

import { DataTable, type DataTableColumn } from "@/components/DataTable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { DatasetSummary } from "@/lib/api-types";
import {
  useCreateDataset,
  useDatasets,
  useIngestDataset,
} from "@/lib/hooks";
import { formatDateTime } from "@/lib/time";

const datasetSchema = z.object({
  name: z.string().min(1, "Ingresá un nombre"),
  path: z.string().min(1, "Ingresá una ruta"),
  format: z.enum(["csv", "parquet"]),
});

export default function DatasetsPage() {
  const [formState, setFormState] = useState({
    name: "",
    path: "",
    format: "csv" as const,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const datasetsQuery = useDatasets();
  const createDataset = useCreateDataset();
  const ingestDataset = useIngestDataset();

  const columns = useMemo<DataTableColumn<DatasetSummary>[]>(
    () => [
      { key: "name", header: "Nombre" },
      { key: "path", header: "Ruta" },
      { key: "format", header: "Formato" },
      {
        key: "createdAt",
        header: "Creado",
        render: (row) => formatDateTime(new Date(row.createdAt).getTime()),
      },
      {
        key: "actions",
        header: "Acciones",
        render: (row) => (
          <Button
            size="sm"
            variant="secondary"
            disabled={ingestDataset.isPending}
            onClick={async () => {
              try {
                await ingestDataset.mutateAsync(row.id);
                toast.success(`Ingesta iniciada para ${row.name}`);
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
    ],
    [ingestDataset]
  );

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const parseResult = datasetSchema.safeParse(formState);
    if (!parseResult.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of parseResult.error.issues) {
        if (issue.path[0]) {
          fieldErrors[String(issue.path[0])] = issue.message;
        }
      }
      setErrors(fieldErrors);
      return;
    }

    setErrors({});
    try {
      await createDataset.mutateAsync(parseResult.data);
      toast.success("Dataset creado");
      setFormState({ name: "", path: "", format: "csv" });
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
          Registrá nuevas fuentes de datos y lanzá la ingesta directamente desde la UI.
        </p>
      </header>

      <section className="grid gap-6 md:grid-cols-[2fr,1fr]">
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
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="name">
                Nombre
              </label>
              <Input
                id="name"
                value={formState.name}
                onChange={(event) =>
                  setFormState((prev) => ({ ...prev, name: event.target.value }))
                }
                placeholder="BTCUSDT 2017-2020"
              />
              {errors.name ? (
                <p className="text-xs text-destructive">{errors.name}</p>
              ) : null}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="path">
                Ruta
              </label>
              <Input
                id="path"
                value={formState.path}
                onChange={(event) =>
                  setFormState((prev) => ({ ...prev, path: event.target.value }))
                }
                placeholder="/data/binance/btcusdt.csv"
              />
              {errors.path ? (
                <p className="text-xs text-destructive">{errors.path}</p>
              ) : null}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Formato</label>
              <Select
                value={formState.format}
                onValueChange={(value: "csv" | "parquet") =>
                  setFormState((prev) => ({ ...prev, format: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccioná el formato" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="csv">CSV</SelectItem>
                  <SelectItem value="parquet">Parquet</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button type="submit" className="w-full" disabled={createDataset.isPending}>
              {createDataset.isPending ? "Guardando..." : "Registrar"}
            </Button>
          </form>
        </div>
      </section>
    </div>
  );
}
