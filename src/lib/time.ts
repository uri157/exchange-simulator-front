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

const RELATIVE_UNITS: Array<{ unit: Intl.RelativeTimeFormatUnit; ms: number }> = [
  { unit: "year", ms: 1000 * 60 * 60 * 24 * 365 },
  { unit: "month", ms: 1000 * 60 * 60 * 24 * 30 },
  { unit: "week", ms: 1000 * 60 * 60 * 24 * 7 },
  { unit: "day", ms: 1000 * 60 * 60 * 24 },
  { unit: "hour", ms: 1000 * 60 * 60 },
  { unit: "minute", ms: 1000 * 60 },
  { unit: "second", ms: 1000 },
];

const rtf = new Intl.RelativeTimeFormat("es", { numeric: "auto" });

export function formatRelativeTime(ms?: number | null) {
  if (!ms) return "-";
  const diff = ms - Date.now();
  const absDiff = Math.abs(diff);

  for (const { unit, ms: unitMs } of RELATIVE_UNITS) {
    if (absDiff >= unitMs || unit === "second") {
      const value = Math.round(diff / unitMs);
      return rtf.format(value, unit);
    }
  }

  return "-";
}
