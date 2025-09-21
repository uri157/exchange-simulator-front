import { Button } from "@/components/ui/button";

import type { ConnectionState } from "./types";

interface StreamControlsProps {
  connectionState: ConnectionState;
  isConnecting: boolean;
  canConnect: boolean;
  onConnect: () => void;
  onDisconnect: () => void;
  sessionEnabled: boolean;
}

export function StreamControls({
  connectionState,
  isConnecting,
  canConnect,
  onConnect,
  onDisconnect,
  sessionEnabled,
}: StreamControlsProps) {
  const showRetry = connectionState === "error" && sessionEnabled && canConnect;

  return (
    <div className="flex flex-wrap gap-2">
      <Button
        onClick={onConnect}
        disabled={!canConnect}
        title={!sessionEnabled ? "La sesión está deshabilitada" : undefined}
      >
        {isConnecting ? "Conectando..." : "Conectar"}
      </Button>
      <Button variant="outline" onClick={onDisconnect} disabled={connectionState !== "connected"}>
        Desconectar
      </Button>
      {showRetry ? (
        <Button variant="outline" onClick={onConnect} disabled={!canConnect}>
          Reintentar
        </Button>
      ) : null}
    </div>
  );
}
