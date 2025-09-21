"use client";

import { Badge } from "@/components/ui/badge";
import type { SessionResponse } from "@/lib/api-types";
import { formatDateTime } from "@/lib/time";

interface SessionHeaderProps {
  session: SessionResponse;
}

export function SessionHeader({ session }: SessionHeaderProps) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold">Sesión {session.id}</h1>
        <p className="text-sm text-muted-foreground">
          {session.symbols.join(", ")} · {session.interval}
        </p>
        <p className="text-xs text-muted-foreground">
          Creada: {formatDateTime(session.createdAt)}
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="secondary">Estado: {session.status}</Badge>
        <Badge variant={session.enabled ? "secondary" : "outline"}>
          Enabled: {session.enabled ? "Sí" : "No"}
        </Badge>
      </div>
    </div>
  );
}
