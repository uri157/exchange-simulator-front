"use client";

import { WS_BASE_URL, WS_PATH } from "@/lib/env";
import type { WsKlineData, WsMessageEnvelope, WsStatsData } from "@/lib/types";

export interface WsRequestInfo {
  base: string;
  path: string;
  query: string;
  url: string;
}

export interface BuildWsRequestOptions {
  sessionId: string;
  streams: string;
}

export function buildWsRequest({ sessionId, streams }: BuildWsRequestOptions): WsRequestInfo {
  const base = WS_BASE_URL;
  const path = WS_PATH;
  const query = new URLSearchParams({ sessionId, streams }).toString();

  return {
    base,
    path,
    query,
    url: `${base}${path}?${query}`,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function toStringValue(value: unknown): string | null {
  if (typeof value === "string") {
    return value;
  }
  if (typeof value === "number") {
    return Number.isFinite(value) ? value.toString() : null;
  }
  return null;
}

function parseWsKlineData(value: unknown): WsKlineData | null {
  if (!isRecord(value)) {
    return null;
  }

  const symbol = typeof value.symbol === "string" ? value.symbol : null;
  const interval = typeof value.interval === "string" ? value.interval : null;
  const openTime = Number(value.openTime);
  const closeTime = Number(value.closeTime);
  const open = toStringValue(value.open);
  const high = toStringValue(value.high);
  const low = toStringValue(value.low);
  const close = toStringValue(value.close);
  const volume = toStringValue(value.volume);

  if (!symbol || !interval) {
    return null;
  }

  if (!Number.isFinite(openTime) || !Number.isFinite(closeTime)) {
    return null;
  }

  if (!open || !high || !low || !close || !volume) {
    return null;
  }

  return {
    symbol,
    interval,
    openTime,
    closeTime,
    open,
    high,
    low,
    close,
    volume,
  };
}

function parseWsStatsData(value: unknown): WsStatsData | null {
  if (!isRecord(value)) {
    return null;
  }
  const connections = Number(value.connections);
  if (!Number.isFinite(connections)) {
    return null;
  }
  return { connections };
}

export function parseWsEnvelope(raw: unknown): WsMessageEnvelope | null {
  if (!isRecord(raw)) {
    return null;
  }

  const event = (raw as Record<string, unknown>).event;
  const data = (raw as Record<string, unknown>).data;

  if (event === "kline") {
    const parsed = parseWsKlineData(data);
    return parsed ? { event: "kline", data: parsed } : null;
  }

  if (event === "stats") {
    const parsed = parseWsStatsData(data);
    return parsed ? { event: "stats", data: parsed } : null;
  }

  return null;
}

export function parseWsEventData(data: MessageEvent["data"]): WsMessageEnvelope | null {
  let payload: unknown;

  if (typeof data === "string") {
    try {
      payload = JSON.parse(data);
    } catch {
      return null;
    }
  } else if (data instanceof ArrayBuffer) {
    try {
      payload = JSON.parse(new TextDecoder().decode(data));
    } catch {
      return null;
    }
  } else if (ArrayBuffer.isView(data)) {
    try {
      const view = new Uint8Array(data.buffer, data.byteOffset, data.byteLength);
      payload = JSON.parse(new TextDecoder().decode(view));
    } catch {
      return null;
    }
  } else {
    return null;
  }

  return parseWsEnvelope(payload);
}
