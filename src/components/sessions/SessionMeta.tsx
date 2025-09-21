"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { SessionResponse } from "@/lib/api-types";
import { formatDateTime, formatNumber } from "@/lib/time";

interface SessionMetaProps {
  session: SessionResponse;
}

export function SessionMeta({ session }: SessionMetaProps) {
  const status = session.status.toLowerCase();
  const isEnded = status === "ended";
  const isTerminal = status === "completed" || status === "ended" || status === "failed";

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Información de la sesión</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <dl className="grid gap-2 sm:grid-cols-2">
          <div>
            <dt className="text-muted-foreground">Inicio</dt>
            <dd>{formatDateTime(session.startTime)}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Fin</dt>
            <dd>{formatDateTime(session.endTime)}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Velocidad</dt>
            <dd>{formatNumber(session.speed)}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Seed</dt>
            <dd>{session.seed ?? "—"}</dd>
          </div>
        </dl>
        {!session.enabled ? (
          <p className="text-muted-foreground">
            La sesión está deshabilitada. Activala para reanudar las acciones.
          </p>
        ) : null}
        {isEnded ? (
          <p className="text-muted-foreground">
            La sesión finalizó; podés iniciar un replay con Start.
          </p>
        ) : isTerminal ? (
          <p className="text-destructive">
            La sesión finalizó. No se recibirán más velas.
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}
