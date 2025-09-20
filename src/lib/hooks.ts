"use client";

import {
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
} from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useRef } from "react";

import type { CreateDatasetRequest, SessionRequest } from "@/lib/api-types";
import {
  createDataset,
  createSession,
  getBinanceSymbols,
  getBinanceIntervals,
  getAvailableRange,
  getDatasetIntervals,
  getDatasetRange,
  getDatasetSymbols,
  getExchangeInfo,
  getKlines,
  getSession,
  getSessionsAccount,
  ingestDataset,
  listDatasets,
  listSessions,
  pauseSession,
  enableSession,
  disableSession,
  deleteSession,
  resumeSession,
  seekSession,
  startSession,
  type FetchKlinesParams,
  type RestKline,
} from "@/lib/api";

function invalidateDatasetDependentQueries(
  queryClient: QueryClient,
  options?: { skipDatasets?: boolean }
) {
  if (!options?.skipDatasets) {
    queryClient.invalidateQueries({ queryKey: ["datasets"] });
  }

  queryClient.invalidateQueries({ queryKey: ["dataset-symbols"] });
  queryClient.invalidateQueries({ queryKey: ["dataset-intervals"] });
  queryClient.invalidateQueries({ queryKey: ["dataset-range"] });
}

// --- Datasets ---

export function useDatasets() {
  const queryClient = useQueryClient();
  const queryResult = useQuery({
    queryKey: ["datasets"],
    queryFn: listDatasets,
  });

  const readyDatasetsRef = useRef<Set<string>>(new Set());
  const hasTrackedReadyRef = useRef(false);

  useEffect(() => {
    const datasets = queryResult.data;
    if (!datasets) {
      return;
    }

    const nextReady = new Set<string>();
    for (const dataset of datasets) {
      if (dataset.status === "ready") {
        nextReady.add(`${dataset.symbol}::${dataset.interval}`);
      }
    }

    const prevReady = readyDatasetsRef.current;
    const hasTrackedReady = hasTrackedReadyRef.current;

    let hasChanges = !hasTrackedReady || prevReady.size !== nextReady.size;
    if (!hasChanges) {
      for (const key of nextReady) {
        if (!prevReady.has(key)) {
          hasChanges = true;
          break;
        }
      }
    }

    if (!hasChanges) {
      return;
    }

    readyDatasetsRef.current = nextReady;
    hasTrackedReadyRef.current = true;

    queryClient.invalidateQueries({ queryKey: ["dataset-symbols"] });

    const affectedSymbols = new Set<string>();
    const affectedRanges = new Set<string>();

    for (const key of prevReady) {
      const [symbol, interval] = key.split("::");
      affectedSymbols.add(symbol);
      affectedRanges.add(`${symbol}::${interval}`);
    }

    for (const key of nextReady) {
      const [symbol, interval] = key.split("::");
      affectedSymbols.add(symbol);
      affectedRanges.add(`${symbol}::${interval}`);
    }

    for (const symbol of affectedSymbols) {
      queryClient.invalidateQueries({ queryKey: ["dataset-intervals", symbol] });
    }

    for (const key of affectedRanges) {
      const [symbol, interval] = key.split("::");
      queryClient.invalidateQueries({
        queryKey: ["dataset-range", symbol, interval],
      });
    }
  }, [queryClient, queryResult.data]);

  const originalRefetch = queryResult.refetch;
  const refetch = useCallback<typeof originalRefetch>(
    async (options) => {
      const result = await originalRefetch(options);
      invalidateDatasetDependentQueries(queryClient, { skipDatasets: true });
      return result;
    },
    [originalRefetch, queryClient]
  );

  return { ...queryResult, refetch };
}

export function useCreateDataset() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateDatasetRequest) => createDataset(payload),
    onSuccess: () => {
      invalidateDatasetDependentQueries(queryClient);
    },
  });
}

export function useIngestDataset() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => ingestDataset(id),
    onSuccess: () => {
      invalidateDatasetDependentQueries(queryClient);
    },
  });
}

export function useDatasetSymbols() {
  return useQuery({
    queryKey: ["dataset-symbols"],
    queryFn: getDatasetSymbols,
    staleTime: 5 * 60_000,
  });
}

export function useDatasetIntervals(symbol: string | null) {
  return useQuery({
    queryKey: ["dataset-intervals", symbol],
    queryFn: () => getDatasetIntervals(symbol as string),
    enabled: Boolean(symbol),
  });
}

export function useDatasetRange(symbol: string | null, interval: string | null) {
  return useQuery({
    queryKey: ["dataset-range", symbol, interval],
    queryFn: () => getDatasetRange(symbol as string, interval as string),
    enabled: Boolean(symbol && interval),
  });
}

// --- Binance Helpers ---

export function useSymbols(enabled = false) {
  return useQuery({
    queryKey: ["binance", "symbols"],
    queryFn: getBinanceSymbols,
    enabled,
    staleTime: 1000 * 60 * 10,
  });
}

export function useIntervals(enabled = false) {
  return useQuery({
    queryKey: ["binance", "intervals"],
    queryFn: getBinanceIntervals,
    enabled,
    staleTime: Infinity,
  });
}

export function useAvailableRange(symbol?: string, interval?: string) {
  return useQuery({
    queryKey: ["binance", "range", symbol, interval],
    queryFn: () => getAvailableRange(symbol as string, interval as string),
    enabled: Boolean(symbol && interval),
    staleTime: 1000 * 60,
  });
}

// --- Exchange Info ---

export function useExchangeInfo() {
  return useQuery({
    queryKey: ["exchange", "info"],
    queryFn: getExchangeInfo,
    staleTime: 1000 * 60 * 5,
  });
}

// --- Klines ---

export function useKlines(params: FetchKlinesParams | null) {
  return useQuery({
    queryKey: ["klines", params],
    queryFn: () => getKlines(params as FetchKlinesParams),
    enabled: Boolean(params?.symbol && params.interval),
    staleTime: 0,
  });
}

export function useKlineTableData(klines: RestKline[]) {
  return useMemo(() => klines.sort((a, b) => b.closeTime - a.closeTime), [
    klines,
  ]);
}

// --- Sessions ---

export function useSessions() {
  return useQuery({
    queryKey: ["sessions"],
    queryFn: listSessions,
    refetchInterval: 10_000,
  });
}

export function useSession(id: string | null) {
  return useQuery({
    queryKey: ["session", id],
    queryFn: () => getSession(id as string),
    enabled: Boolean(id),
    refetchInterval: 5000,
  });
}

export function useCreateSession() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: SessionRequest) => createSession(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sessions"] });
    },
  });
}

export function useSessionStart() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => startSession(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ["session", id] });
      queryClient.invalidateQueries({ queryKey: ["sessions"] });
    },
    retry: false,
  });
}

export function useSessionPause() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => pauseSession(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ["session", id] });
      queryClient.invalidateQueries({ queryKey: ["sessions"] });
    },
  });
}

export function useSessionResume() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => resumeSession(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ["session", id] });
      queryClient.invalidateQueries({ queryKey: ["sessions"] });
    },
  });
}

export function useSessionSeek() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, timestamp }: { id: string; timestamp: number }) =>
      seekSession(id, timestamp),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["session", variables.id] });
    },
  });
}

export function useSessionEnable() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => enableSession(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ["session", id] });
      queryClient.invalidateQueries({ queryKey: ["sessions"] });
    },
  });
}

export function useSessionDisable() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => disableSession(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ["session", id] });
      queryClient.invalidateQueries({ queryKey: ["sessions"] });
    },
  });
}

export function useSessionDelete() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteSession(id),
    onSuccess: (_, id) => {
      queryClient.removeQueries({ queryKey: ["session", id] });
      queryClient.invalidateQueries({ queryKey: ["sessions"] });
    },
  });
}

// --- Account ---

export function useAccount(sessionId: string | null) {
  return useQuery({
    queryKey: ["account", sessionId],
    queryFn: () => getSessionsAccount(sessionId as string),
    enabled: Boolean(sessionId),
  });
}
