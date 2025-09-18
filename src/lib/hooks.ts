"use client";

import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { useMemo } from "react";

import type {
  CreateDatasetRequest,
  SessionRequest,
  Interval,
  AvailableRange,
} from "@/lib/api-types";
import {
  createDataset,
  createSession,
  getBinanceSymbols,
  getBinanceIntervals,
  getAvailableRange,
  getKlines,
  getSession,
  getSessionsAccount,
  ingestDataset,
  listDatasets,
  listSessions,
  pauseSession,
  resumeSession,
  seekSession,
  startSession,
  type FetchKlinesParams,
  type RestKline,
  type SymbolInfo,
} from "@/lib/api";

// --- Datasets ---

export function useDatasets() {
  return useQuery({
    queryKey: ["datasets"],
    queryFn: listDatasets,
  });
}

export function useCreateDataset() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateDatasetRequest) => createDataset(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["datasets"] });
    },
  });
}

export function useIngestDataset() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => ingestDataset(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["datasets"] });
    },
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

// --- Account ---

export function useAccount(sessionId: string | null) {
  return useQuery({
    queryKey: ["account", sessionId],
    queryFn: () => getSessionsAccount(sessionId as string),
    enabled: Boolean(sessionId),
  });
}
