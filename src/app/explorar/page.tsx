"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
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
import { Badge } from "@/components/ui/badge";
import type { ExchangeInfoSymbol } from "@/lib/api-types";
import { useExchangeInfo, useKlines } from "@/lib/hooks";
import { formatDateTime, formatNumber } from "@/lib/time";
import type { RestKline } from "@/lib/api";

const PRESET_INTERVALS = ["1m", "5m", "1h", "1d"];

interface FormState {
  symbol: string;
  interval: string;
  startTime: string;
  endTime: string;
  limit: string;
}

const defaultState: FormState = {
  symbol: "",
  interval: "1m",
  startTime: "",
  endTime: "",
  limit: "200",
};

export default function ExplorePage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const [formState, setFormState] = useState<FormState>(defaultState);
  const [queryParams, setQueryParams] = useState<{
    symbol: string;
    interval: string;
    startTime?: number;
    endTime?: number;
    limit?: number;
  } | null>(null);

  useEffect(() => {
    const fromQuery: FormState = {
      symbol: searchParams.get("symbol") ?? defaultState.symbol,
      interval: searchParams.get("interval") ?? defaultState.interval,
      startTime: searchParams.get("startTime") ?? defaultState.startTime,
      endTime: searchParams.get("endTime") ?? defaultState.endTime,
      limit: searchParams.get("limit") ?? defaultState.limit,
    };
    setFormState(fromQuery);
    setQueryParams((prev) => prev ?? buildParams(fromQuery));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const exchangeInfo = useExchangeInfo();
  const klinesQuery = useKlines(queryParams);

  const symbols = useMemo<ExchangeInfoSymbol[]>(() => {
    return exchangeInfo.data?.symbols.filter((symbol) => symbol.active) ?? [];
  }, [exchangeInfo.data?.symbols]);

  const columns = useMemo<DataTableColumn<RestKline>[]>(
    () => [
      {
        key: "openTime",
        header: "Open time",
        render: (row) => formatDateTime(row.openTime),
      },
      { key: "open", header: "Open", render: (row) => formatNumber(row.open) },
      { key: "high", header: "High", render: (row) => formatNumber(row.high) },
      { key: "low", header: "Low", render: (row) => formatNumber(row.low) },
      { key: "close", header: "Close", render: (row) => formatNumber(row.close) },
      {
        key: "volume",
        header: "Volume",
        render: (row) => formatNumber(row.volume, 4),
      },
      {
        key: "closeTime",
        header: "Close time",
        render: (row) => formatDateTime(row.closeTime),
      },
    ],
    []
  );

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!formState.symbol) {
      toast.error("Seleccioná un símbolo activo");
      return;
    }

    const params = buildParams(formState);
    setQueryParams(params);
    const next = new URLSearchParams();
    next.set("symbol", formState.symbol);
    next.set("interval", formState.interval);
    if (formState.startTime) next.set("startTime", formState.startTime);
    if (formState.endTime) next.set("endTime", formState.endTime);
    if (formState.limit) next.set("limit", formState.limit);
    router.replace(`${pathname}?${next.toString()}`);
  };

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold">Explorar mercado</h1>
        <p className="text-sm text-muted-foreground">
          Seleccioná símbolo e intervalo para consultar las últimas velas disponibles.
        </p>
      </header>

      <section className="rounded-lg border p-4">
        <form className="grid gap-4 md:grid-cols-2" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <label className="text-sm font-medium">Símbolo</label>
            <Select
              value={formState.symbol}
              onValueChange={(value) =>
                setFormState((prev) => ({ ...prev, symbol: value }))
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Seleccioná un símbolo" />
              </SelectTrigger>
              <SelectContent>
                {symbols.map((symbol) => (
                  <SelectItem key={symbol.symbol} value={symbol.symbol}>
                    {symbol.symbol} ({symbol.base}/{symbol.quote})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Intervalo</label>
            <Select
              value={formState.interval}
              onValueChange={(value) =>
                setFormState((prev) => ({ ...prev, interval: value }))
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Seleccioná un intervalo" />
              </SelectTrigger>
              <SelectContent>
                {PRESET_INTERVALS.map((interval) => (
                  <SelectItem key={interval} value={interval}>
                    {interval}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              value={formState.interval}
              onChange={(event) =>
                setFormState((prev) => ({ ...prev, interval: event.target.value }))
              }
              placeholder="Intervalo custom"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Desde (epoch ms)</label>
            <Input
              value={formState.startTime}
              onChange={(event) =>
                setFormState((prev) => ({ ...prev, startTime: event.target.value }))
              }
              placeholder="1514764800000"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Hasta (epoch ms)</label>
            <Input
              value={formState.endTime}
              onChange={(event) =>
                setFormState((prev) => ({ ...prev, endTime: event.target.value }))
              }
              placeholder="1609459199000"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Límite</label>
            <Input
              value={formState.limit}
              onChange={(event) =>
                setFormState((prev) => ({ ...prev, limit: event.target.value }))
              }
              placeholder="200"
            />
          </div>

          <div className="flex items-end">
            <Button type="submit" className="w-full md:w-auto">
              Buscar klines
            </Button>
          </div>
        </form>
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Resultados</h2>
          <Badge variant="secondary">
            {klinesQuery.data?.length ?? 0} filas
          </Badge>
        </div>
        {klinesQuery.isLoading ? (
          <div className="h-40 animate-pulse rounded-md border bg-muted" />
        ) : (
          <DataTable
            data={klinesQuery.data ?? []}
            columns={columns}
            emptyMessage="No hay datos para el filtro seleccionado"
            caption={
              queryParams
                ? `${queryParams.symbol} · ${queryParams.interval}`
                : undefined
            }
            getRowId={(row) => `${row.openTime}-${row.closeTime}`}
          />
        )}
      </section>
    </div>
  );
}

function buildParams(state: FormState) {
  return {
    symbol: state.symbol,
    interval: state.interval,
    startTime: state.startTime ? Number(state.startTime) : undefined,
    endTime: state.endTime ? Number(state.endTime) : undefined,
    limit: state.limit ? Number(state.limit) : undefined,
  };
}
