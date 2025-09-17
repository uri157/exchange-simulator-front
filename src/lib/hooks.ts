"use client";

import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { useMemo } from "react";

import type { CreateDatasetRequest, SessionRequest } from "@/lib/api-types";
import {
  createDataset,
  createSession,
  getKlines,
  getSession,
  getSessionsAccount,
  getExchangeInfo,
  ingestDataset,
  listDatasets,
  listSessions,
  pauseSession,
  resumeSession,
  seekSession,
  startSession,
  type FetchKlinesParams,
  type RestKline,
} from "@/lib/api";

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

export function useExchangeInfo() {
  return useQuery({
    queryKey: ["exchange", "info"],
    queryFn: getExchangeInfo,
    staleTime: 1000 * 60,
  });
}

export function useKlines(params: FetchKlinesParams | null) {
  return useQuery({
    queryKey: ["klines", params],
    queryFn: () => getKlines(params as FetchKlinesParams),
    enabled: Boolean(params?.symbol && params.interval),
    staleTime: 0,
  });
}

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

export function useAccount(sessionId: string | null) {
  return useQuery({
    queryKey: ["account", sessionId],
    queryFn: () => getSessionsAccount(sessionId as string),
    enabled: Boolean(sessionId),
  });
}

export function useKlineTableData(klines: RestKline[]) {
  return useMemo(() => klines.sort((a, b) => b.closeTime - a.closeTime), [
    klines,
  ]);
}
