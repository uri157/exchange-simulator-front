export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:3001";

const CONFIGURED_WS_BASE =
  process.env.NEXT_PUBLIC_WS_BASE ?? process.env.NEXT_PUBLIC_WS_URL ?? null;

export const WS_PATH = process.env.NEXT_PUBLIC_WS_PATH ?? "/api/v1/ws";

export function resolveWsBase(): string {
  if (CONFIGURED_WS_BASE) {
    return CONFIGURED_WS_BASE.replace(/\/+$/, "");
  }

  if (typeof window !== "undefined") {
    const protocol = window.location.protocol === "https:" ? "wss" : "ws";
    return `${protocol}://${window.location.host}`;
  }

  return "ws://localhost:3001";
}
