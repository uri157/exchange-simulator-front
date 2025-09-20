export function toDatetimeLocal(value: number): string {
  return new Date(value).toISOString().slice(0, 16);
}

export function parseDatetimeLocal(value: string): number {
  if (!value) return Number.NaN;
  const timestamp = new Date(value).getTime();
  return Number.isNaN(timestamp) ? Number.NaN : timestamp;
}
