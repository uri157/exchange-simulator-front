export function msToIso(ms: number | string | null | undefined) {
  if (ms === null || ms === undefined) return "";
  const value = typeof ms === "string" ? Number(ms) : ms;
  if (Number.isNaN(value)) return "";
  return new Date(value).toISOString();
}

export function isoToMs(value: string) {
  if (!value) return 0;
  return new Date(value).getTime();
}

export function formatNumber(value: string | number, fractionDigits = 2) {
  const num = typeof value === "string" ? Number(value) : value;
  if (Number.isNaN(num)) return "";
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits
  }).format(num);
}

export function formatDateTime(ms: number) {
  return new Date(ms).toLocaleString();
}
