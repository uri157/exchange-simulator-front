export function getMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Ocurrió un error";
}
