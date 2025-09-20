const DEFAULT_WS_PATH = "/ws";

export const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "";
export const WS_PATH = process.env.NEXT_PUBLIC_WS_PATH || DEFAULT_WS_PATH;

function removeTrailingSlash(value: string): string {
  return value.replace(/\/+$/, "");
}

function resolveFromApiBase(): string | null {
  const baseUrl = API_BASE_URL?.trim();
  if (!baseUrl) {
    return null;
  }

  try {
    const url = new URL(baseUrl);
    const protocol = url.protocol === "https:" ? "wss" : "ws";
    return removeTrailingSlash(`${protocol}://${url.host}`);
  } catch {
    return null;
  }
}

export function resolveWsBase(): string {
  const configured = process.env.NEXT_PUBLIC_WS_BASE_URL?.trim();
  if (configured) {
    return removeTrailingSlash(configured);
  }

  if (typeof window !== "undefined") {
    const fromApi = resolveFromApiBase();
    if (fromApi) {
      return fromApi;
    }

    const protocol = window.location.protocol === "https:" ? "wss" : "ws";
    return removeTrailingSlash(`${protocol}://${window.location.host}`);
  }

  const fromApi = resolveFromApiBase();
  return fromApi ?? "";
}

export function normalizePath(path: string): string {
  const trimmed = path?.trim();
  if (!trimmed) {
    return DEFAULT_WS_PATH;
  }

  const withLeading = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
  const withoutTrailing = withLeading.replace(/\/+$/, "");

  return withoutTrailing || DEFAULT_WS_PATH;
}
