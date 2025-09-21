import { Badge } from "@/components/ui/badge";

import type { ConnectionState } from "./types";

interface StreamStatusBadgesProps {
  connectionState: ConnectionState;
  connections: number | null;
  receivedCount: number;
}

const connectionLabels: Record<ConnectionState, string> = {
  idle: "Idle",
  connecting: "Conectando...",
  connected: "Conectado",
  closed: "Desconectado",
  error: "Error",
};

export function StreamStatusBadges({ connectionState, connections, receivedCount }: StreamStatusBadgesProps) {
  const statusBadgeClassName =
    connectionState === "error"
      ? "border-transparent bg-destructive text-destructive-foreground"
      : connectionState === "connected"
      ? "border-transparent bg-secondary text-secondary-foreground"
      : "";

  return (
    <div className="flex flex-wrap items-center gap-2 text-xs">
      <Badge variant="secondary">Recibidas: {receivedCount}</Badge>
      <Badge variant="outline">Conexiones: {connections ?? "—"}</Badge>
      <Badge variant="outline" className={statusBadgeClassName}>
        Estado: {connectionLabels[connectionState]}
      </Badge>
    </div>
  );
}
