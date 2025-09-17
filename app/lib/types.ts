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

export type WsMessage =
  | { type: "kline"; data: WsKlineData }
  | { type: "stats"; data: WsStatsData };
