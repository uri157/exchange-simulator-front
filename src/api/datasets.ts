import { API_BASE_URL } from "@/lib/env";
import { apiClient } from "@/lib/api";
import type { Dataset, DatasetDetail } from "@/types/datasets";

export async function listDatasets(): Promise<Dataset[]> {
  return apiClient.get("api/v1/datasets").json<Dataset[]>();
}

export async function getDataset(id: string): Promise<DatasetDetail> {
  return apiClient.get(`api/v1/datasets/${id}`).json<DatasetDetail>();
}

export async function deleteDataset(
  id: string,
  options: { force?: boolean } = {}
): Promise<void> {
  const searchParams = options.force ? new URLSearchParams({ force: "true" }) : undefined;
  await apiClient.delete(`api/v1/datasets/${id}`, { searchParams });
}

export async function cancelIngest(id: string): Promise<void> {
  await apiClient.post(`api/v1/datasets/${id}/cancel`);
}

export async function startIngest(id: string): Promise<void> {
  await apiClient.post(`api/v1/datasets/${id}/ingest`);
}

export function ingestEvents(id: string): EventSource {
  const url = `${API_BASE_URL}/api/v1/datasets/${id}/events`;
  return new EventSource(url, { withCredentials: false });
}
