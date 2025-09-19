// Temporary handcrafted types mirroring the OpenAPI schema for the exchange-simulator backend.
// Replace by running `pnpm generate:api-types` once the backend swagger is reachable.

export interface ExchangeInfoSymbol {
  symbol: string;
  base: string;
  quote: string;
  active: boolean;
}

export interface ExchangeInfoResponse {
  symbols: ExchangeInfoSymbol[];
}

export type Interval =
  | "1m"
  | "3m"
  | "5m"
  | "15m"
  | "30m"
  | "1h"
  | "2h"
  | "4h"
  | "6h"
  | "8h"
  | "12h"
  | "1d"
  | "3d"
  | "1w"
  | "1M";

export interface AvailableRange {
  symbol: string;
  interval: Interval;
  firstOpenTime: number; // ms epoch
  lastCloseTime: number; // ms epoch
}

export interface DatasetSummary {
  id: string;
  name: string;
  symbol: string;
  interval: Interval;
  startTime: number;
  endTime: number;
  status: "registered" | "ingesting" | "ready" | "failed";
  createdAt: string;
  updatedAt?: string;
}

export interface CreateDatasetRequest {
  name: string;
  symbol: string;
  interval: Interval;
  startTime: number;
  endTime: number;
}

export interface SessionRequest {
  symbols: string[];
  interval: string;
  startTime: number;
  endTime: number;
  speed: number;
  seed?: number;
}

export type SessionStatus =
  | "created"
  | "running"
  | "paused"
  | "completed"
  | "failed";

export interface SessionResponse extends SessionRequest {
  id: string;
  status: SessionStatus;
  createdAt: number;
  updatedAt?: number;
}

export interface AccountBalance {
  asset: string;
  free: string;
  locked: string;
}

export interface AccountResponse {
  makerCommission: number;
  takerCommission: number;
  buyerCommission: number;
  sellerCommission: number;
  balances: AccountBalance[];
}

export interface OrderResponse {
  symbol: string;
  orderId: number;
  clientOrderId: string;
  transactTime: number;
}
