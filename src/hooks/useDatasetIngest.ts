"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { cancelIngest, getDataset, ingestEvents } from "@/api/datasets";
import type { DatasetDetail, DatasetStatus, IngestEvent } from "@/types/datasets";

const POLLING_INTERVAL = 2000;
const FINAL_STATUSES: DatasetStatus[] = ["Ready", "Failed", "Canceled"];

function isFinalStatus(status: DatasetStatus | undefined): status is DatasetStatus {
  return status !== undefined && FINAL_STATUSES.includes(status);
}

interface UseDatasetIngestOptions {
  enabled?: boolean;
}

interface UseDatasetIngestResult {
  data: DatasetDetail | null;
  isLoading: boolean;
  error: Error | null;
  isPolling: boolean;
  cancel: () => Promise<void>;
  refetch: () => Promise<void>;
  lastEvent?: IngestEvent["type"];
}

export function useDatasetIngest(
  id: string,
  options: UseDatasetIngestOptions = {}
): UseDatasetIngestResult {
  const enabled = Boolean(id) && (options.enabled ?? true);
  const [data, setData] = useState<DatasetDetail | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [isPolling, setIsPolling] = useState(false);
  const lastEventRef = useRef<IngestEvent["type"] | undefined>();
  const pollingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);
  const statusRef = useRef<DatasetStatus | undefined>();

  useEffect(() => {
    statusRef.current = data?.status;
  }, [data?.status]);

  const stopPolling = useCallback(() => {
    if (pollingTimerRef.current) {
      clearInterval(pollingTimerRef.current);
      pollingTimerRef.current = null;
    }
    setIsPolling(false);
  }, []);

  const stopEventSource = useCallback(() => {
    const es = eventSourceRef.current;
    if (es) {
      es.close();
      eventSourceRef.current = null;
    }
  }, []);

  const applyPatch = useCallback((patch: Partial<DatasetDetail>, appendLog?: string) => {
    setData((prev) => {
      if (!prev) {
        return prev;
      }

      let logs = prev.logs ?? [];
      if (patch.logs) {
        logs = patch.logs.slice(-200);
      }
      if (appendLog) {
        logs = [...logs, appendLog].slice(-200);
      }

      return {
        ...prev,
        ...patch,
        logs,
        lastMessage: patch.lastMessage ?? prev.lastMessage,
        updatedAt: patch.updatedAt ?? prev.updatedAt,
        progress: patch.progress ?? prev.progress ?? 0,
        status: patch.status ?? prev.status,
      };
    });
  }, []);

  const fetchDetail = useCallback(
    async (showLoading: boolean) => {
      if (!enabled) return;
      if (showLoading) {
        setIsLoading(true);
      }
      try {
        const detail = await getDataset(id);
        setData((prev) => {
          const logs = (detail.logs ?? prev?.logs ?? []).slice(-200);
          return {
            ...detail,
            progress: detail.progress ?? prev?.progress ?? 0,
            lastMessage: detail.lastMessage ?? prev?.lastMessage,
            logs,
          };
        });
        setError(null);
      } catch (err) {
        if (err instanceof Error) {
          setError(err);
        } else {
          setError(new Error("No se pudo obtener el estado del dataset"));
        }
      } finally {
        if (showLoading) {
          setIsLoading(false);
        }
      }
    },
    [enabled, id]
  );

  useEffect(() => {
    if (!enabled) {
      stopEventSource();
      stopPolling();
      setData(null);
      setError(null);
      setIsLoading(false);
      return;
    }

    let cancelled = false;

    const startPolling = () => {
      if (cancelled) return;
      stopEventSource();
      if (pollingTimerRef.current) return;
      setIsPolling(true);
      pollingTimerRef.current = setInterval(() => {
        fetchDetail(false);
      }, POLLING_INTERVAL);
    };

    const handleEvent = (event: MessageEvent, explicitType?: IngestEvent["type"]) => {
      try {
        const payload = JSON.parse(event.data) as Partial<IngestEvent>;
        const type = (explicitType ?? payload.type) as IngestEvent["type"];
        if (!type) return;

        lastEventRef.current = type;

        switch (type) {
          case "status":
            applyPatch({
              status: payload.status as DatasetStatus,
              updatedAt: payload.updatedAt as number,
            });
            break;
          case "progress":
            applyPatch({
              progress: payload.progress as number,
              lastMessage: payload.lastMessage,
              updatedAt: payload.updatedAt as number,
            });
            break;
          case "log": {
            const line = payload.line as string;
            if (line) {
              const ts = payload.ts as number | undefined;
              const formatted = ts
                ? `[${new Date(ts).toLocaleTimeString()}] ${line}`
                : line;
              applyPatch({}, formatted);
            }
            break;
          }
          case "done":
            applyPatch({
              status: payload.status as DatasetStatus,
              updatedAt: payload.updatedAt as number,
              progress: 100,
            });
            stopEventSource();
            stopPolling();
            break;
          case "error":
            applyPatch({
              status: payload.status as DatasetStatus,
              updatedAt: payload.updatedAt as number,
              lastMessage: payload.lastMessage,
            });
            stopEventSource();
            stopPolling();
            break;
          default:
            break;
        }
      } catch (err) {
        console.error("Failed to parse ingest event", err);
      }
    };

    const attachEventSource = () => {
      const es = ingestEvents(id);
      eventSourceRef.current = es;

      es.addEventListener("status", (event) => handleEvent(event as MessageEvent, "status"));
      es.addEventListener("progress", (event) => handleEvent(event as MessageEvent, "progress"));
      es.addEventListener("log", (event) => handleEvent(event as MessageEvent, "log"));
      es.addEventListener("done", (event) => handleEvent(event as MessageEvent, "done"));
      es.addEventListener("error", (event) => handleEvent(event as MessageEvent, "error"));

      es.onmessage = (event) => handleEvent(event as MessageEvent);

      es.onerror = () => {
        if (cancelled) return;
        stopEventSource();
        if (!isFinalStatus(statusRef.current)) {
          startPolling();
        }
      };
    };

    fetchDetail(true).finally(() => {
      if (cancelled) return;
      attachEventSource();
    });

    return () => {
      cancelled = true;
      stopEventSource();
      stopPolling();
    };
  }, [applyPatch, enabled, fetchDetail, id, stopEventSource, stopPolling]);

  const cancel = useCallback(async () => {
    if (!enabled) return;
    await cancelIngest(id);
    await fetchDetail(true);
  }, [enabled, fetchDetail, id]);

  const refetch = useCallback(async () => {
    await fetchDetail(true);
  }, [fetchDetail]);

  return useMemo(
    () => ({
      data,
      isLoading,
      error,
      isPolling,
      cancel,
      refetch,
      lastEvent: lastEventRef.current,
    }),
    [cancel, data, error, isLoading, isPolling, refetch]
  );
}
