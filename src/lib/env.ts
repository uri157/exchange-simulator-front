const DEFAULT_WS_PATH = "/ws";

function requireEnv(value: string | undefined, name: string): string {
  if (!value) {
    throw new Error(`Missing environment variable: ${name}`);
  }
  const trimmed = value.trim();
  if (!trimmed) {
    throw new Error(`Environment variable ${name} is empty`);
  }
  return trimmed;
}

function removeTrailingSlash(value: string): string {
  return value.replace(/\/+$/, "");
}

function normalizeBaseUrl(value: string): string {
  const trimmed = value.trim();
  const withoutTrailing = removeTrailingSlash(trimmed);
  return withoutTrailing || trimmed;
}

function normalizePath(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return DEFAULT_WS_PATH;

  const withLeading = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
  const withoutTrailing = withLeading.replace(/\/+$/, "");
  return withoutTrailing || DEFAULT_WS_PATH;
}

export const API_BASE_URL = normalizeBaseUrl(
  requireEnv(process.env.NEXT_PUBLIC_API_BASE_URL, "NEXT_PUBLIC_API_BASE_URL")
);

export const WS_BASE_URL = normalizeBaseUrl(
  requireEnv(process.env.NEXT_PUBLIC_WS_BASE_URL, "NEXT_PUBLIC_WS_BASE_URL")
);

export const WS_PATH = normalizePath(
  process.env.NEXT_PUBLIC_WS_PATH ?? DEFAULT_WS_PATH
);
