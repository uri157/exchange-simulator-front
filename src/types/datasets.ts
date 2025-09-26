export type DatasetStatus =
  | "Registered"
  | "Ingesting"
  | "Ready"
  | "Failed"
  | "Canceled";

export interface Dataset {
  id: string;
  name?: string;
  symbol: string;
  interval: string;
  status: DatasetStatus;
  createdAt: number;
  updatedAt?: number;
  progress?: number;
  lastMessage?: string;
}

export interface DatasetDetail extends Dataset {
  progress: number;
  lastMessage?: string;
  updatedAt: number;
  logs?: string[];
}

export type IngestEvent =
  | { type: "status"; status: DatasetStatus; updatedAt: number }
  | { type: "progress"; progress: number; lastMessage?: string; updatedAt: number }
  | { type: "log"; line: string; ts: number }
  | { type: "done"; status: DatasetStatus; updatedAt: number }
  | { type: "error"; status: DatasetStatus; lastMessage: string; updatedAt: number };
