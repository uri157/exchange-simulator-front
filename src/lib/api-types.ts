/* eslint-disable */
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

export type DatasetFormat = "csv" | "parquet";

export interface DatasetSummary {
  id: string;
  name: string;
  path: string;
  format: DatasetFormat;
  createdAt: string;
  updatedAt?: string;
}

export interface CreateDatasetRequest {
  name: string;
  path: string;
  format: DatasetFormat;
}

export interface SessionRequest {
  symbols: string[];
  interval: string;
  startTime: number;
  endTime: number;
  speed: number;
  seed: number;
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
  createdAt: string;
  updatedAt?: string;
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
