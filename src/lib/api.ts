import ky, { HTTPError } from "ky";

import type {
  AccountResponse,
  CreateDatasetRequest,
  DatasetSummary,
  ExchangeInfoResponse,
  SessionRequest,
  SessionResponse,
} from "@/lib/api-types";
import { API_BASE_URL } from "@/lib/env";

export const apiClient = ky.create({
  prefixUrl: API_BASE_URL,
  retry: 0,
  hooks: {
    beforeRequest: [
      (request) => {
        request.headers.set("Content-Type", "application/json");
      },
    ],
  },
});

export interface RestKline {
  openTime: number;
  open: string;
  high: string;
  low: string;
  close: string;
  volume: string;
  closeTime: number;
}

async function unwrap<T>(promise: Promise<T>): Promise<T> {
  try {
    return await promise;
  } catch (error) {
    if (error instanceof HTTPError) {
      const data = await error.response.json().catch(() => null);
      const message = (data?.error ?? data?.message) ?? error.message;
      throw new Error(message);
    }
    throw error;
  }
}

/** ====== Binance proxy ====== */
export interface SymbolInfo {
  symbol: string;
  base: string;
  quote: string;
  active: boolean;
}

export interface AvailableRange {
  symbol: string;
  interval: string;
  firstOpenTime: number; // ms
  lastCloseTime: number; // ms
}

export function getBinanceSymbols() {
  return unwrap(apiClient.get("api/v1/binance/symbols").json<SymbolInfo[]>());
}

export function getBinanceIntervals() {
  return unwrap(apiClient.get("api/v1/binance/intervals").json<string[]>());
}

export function getAvailableRange(symbol: string, interval: string) {
  const searchParams = new URLSearchParams({ symbol, interval });
  return unwrap(
    apiClient.get("api/v1/binance/range", { searchParams }).json<AvailableRange>()
  );
}

/** ====== Market data (sim) ====== */
export function getExchangeInfo() {
  return unwrap(
    apiClient.get("api/v1/exchangeInfo").json<ExchangeInfoResponse>()
  );
}

export interface FetchKlinesParams {
  symbol: string;
  interval: string;
  startTime?: number;
  endTime?: number;
  limit?: number;
}

export async function getKlines(params: FetchKlinesParams) {
  const searchParams = new URLSearchParams();
  searchParams.set("symbol", params.symbol);
  searchParams.set("interval", params.interval);
  if (params.startTime) searchParams.set("startTime", String(params.startTime));
  if (params.endTime) searchParams.set("endTime", String(params.endTime));
  if (params.limit) searchParams.set("limit", String(params.limit));

  const raw = await unwrap<unknown[]>(
    apiClient.get("api/v3/klines", { searchParams }).json<unknown[]>()
  );

  return raw.map((entry) => {
    if (!Array.isArray(entry)) {
      throw new Error("Unexpected kline response shape");
    }
    const [
      openTime,
      open,
      high,
      low,
      close,
      volume,
      closeTime,
    ] = entry as [number, string, string, string, string, string, number];
    return { openTime, open, high, low, close, volume, closeTime } satisfies RestKline;
  });
}

/** ====== Datasets ====== */
export function listDatasets() {
  return unwrap(apiClient.get("api/v1/datasets").json<DatasetSummary[]>());
}

export function createDataset(payload: CreateDatasetRequest) {
  return unwrap(
    apiClient.post("api/v1/datasets", { json: payload }).json<DatasetSummary>()
  );
}

export function ingestDataset(id: string) {
  return unwrap(
    apiClient.post(`api/v1/datasets/${id}/ingest`).then(() => undefined)
  );
}

/** ====== Sessions ====== */
export function createSession(payload: SessionRequest) {
  return unwrap(
    apiClient.post("api/v1/sessions", { json: payload }).json<SessionResponse>()
  );
}

export function listSessions() {
  return unwrap(apiClient.get("api/v1/sessions").json<SessionResponse[]>());
}

export function getSession(id: string) {
  return unwrap(apiClient.get(`api/v1/sessions/${id}`).json<SessionResponse>());
}

export function startSession(id: string) {
  return unwrap(apiClient.post(`api/v1/sessions/${id}/start`).json<SessionResponse>());
}

export function pauseSession(id: string) {
  return unwrap(apiClient.post(`api/v1/sessions/${id}/pause`).json<SessionResponse>());
}

export function resumeSession(id: string) {
  return unwrap(apiClient.post(`api/v1/sessions/${id}/resume`).json<SessionResponse>());
}

export function seekSession(id: string, timestamp: number) {
  return unwrap(
    apiClient
      .post(`api/v1/sessions/${id}/seek`, {
        searchParams: new URLSearchParams({ to: String(timestamp) }),
      })
      .json<SessionResponse>()
  );
}

/** ====== Account ====== */
export function getSessionsAccount(sessionId: string) {
  return unwrap(
    apiClient
      .get("api/v3/account", {
        searchParams: new URLSearchParams({ sessionId }),
      })
      .json<AccountResponse>()
  );
}
