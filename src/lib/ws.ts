"use client";

import { WS_BASE_URL, WS_PATH } from "@/lib/env";
import type {
  WsKlineData,
  WsMessageEnvelope,
  WsStatsData,
  WsWarningData,
} from "@/lib/types";

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

function parseWsWarningData(value: unknown): WsWarningData | null {
  if (!isRecord(value)) {
    return null;
  }

  const type = typeof value.type === "string" ? value.type : null;
  if (!type) {
    return null;
  }

  const skippedValue = value.skipped;
  const skippedNumber = Number(skippedValue);

  const warning: WsWarningData = { type };
  if (Number.isFinite(skippedNumber)) {
    warning.skipped = skippedNumber;
  }

  return warning;
}

export function parseWsEnvelope(raw: unknown): WsMessageEnvelope | null {
  if (!isRecord(raw)) {
    return null;
  }

  const envelope = raw as Record<string, unknown>;
  const event = envelope.event;
  const data = envelope.data;
  const stream = typeof envelope.stream === "string" ? envelope.stream : null;

  if (event === "kline") {
    const parsed = parseWsKlineData(data);
    return parsed ? { event: "kline", data: parsed, stream } : null;
  }

  if (event === "stats") {
    const parsed = parseWsStatsData(data);
    return parsed ? { event: "stats", data: parsed, stream } : null;
  }

  if (event === "warning") {
    const parsed = parseWsWarningData(data);
    return parsed ? { event: "warning", data: parsed, stream } : null;
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
