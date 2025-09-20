"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { ComboBox } from "@/components/ComboBox";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getMessage } from "@/lib/errors";
import {
  useCreateSession,
  useDatasetIntervals,
  useDatasetRange,
  useDatasetSymbols,
} from "@/lib/hooks";
import { formatDateTime } from "@/lib/time";
import { parseDatetimeLocal, toDatetimeLocal } from "@/lib/datetime";

import { sessionSchema } from "./schema";

type SessionsFormProps = {
  onCreated: () => void;
};

type FormState = {
  symbol: string;
  interval: string;
  startTime: string;
  endTime: string;
  speed: string;
  seed: string;
};

type FormErrors = Record<string, string>;

export function SessionsForm({ onCreated }: SessionsFormProps) {
  const [formState, setFormState] = useState<FormState>({
    symbol: "",
    interval: "",
    startTime: "",
    endTime: "",
    speed: "1",
    seed: "123",
  });
  const [errors, setErrors] = useState<FormErrors>({});

  const createSession = useCreateSession();
  const datasetSymbolsQuery = useDatasetSymbols();
  const datasetIntervalsQuery = useDatasetIntervals(formState.symbol || null);
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

  const minDate = useMemo(
    () => (range ? toDatetimeLocal(range.firstOpenTime) : ""),
    [range]
  );
  const maxDate = useMemo(
    () => (range ? toDatetimeLocal(range.lastCloseTime) : ""),
    [range]
  );

  const isSubmitDisabled =
    createSession.isPending || !formState.symbol || !formState.interval || !range;

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
      const fieldErrors: FormErrors = {};
      for (const issue of result.error.issues) {
        if (issue.path[0]) {
          fieldErrors[String(issue.path[0])] = issue.message;
        }
      }
      setErrors(fieldErrors);
      return;
    }

    const validationErrors: FormErrors = {};
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
    };

    try {
      await createSession.mutateAsync(payload);
      toast.success("Sesión creada");
      await Promise.resolve(onCreated());
    } catch (error) {
      toast.error(getMessage(error));
    }
  };

  return (
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
  );
}
