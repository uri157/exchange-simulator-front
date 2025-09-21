export interface WsKlineData {
  symbol: string;
  interval: string;
  openTime: number;
  open: string;
  high: string;
  low: string;
  close: string;
  volume: string;
  closeTime: number;
}

export interface WsStatsData {
  connections: number;
}

export interface WsWarningData {
  type: string;
  skipped?: number;
}

export type WsEventType = "kline" | "stats" | "warning";

type WsMessageEnvelopeBase<TEvent extends WsEventType, TData> = {
  event: TEvent;
  data: TData;
  stream?: string | null;
};

export type WsMessageEnvelope =
  | WsMessageEnvelopeBase<"kline", WsKlineData>
  | WsMessageEnvelopeBase<"stats", WsStatsData>
  | WsMessageEnvelopeBase<"warning", WsWarningData>;
