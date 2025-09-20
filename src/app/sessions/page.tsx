"use client";

import { SessionsForm } from "@/components/sessions/SessionsForm";
import { SessionsTable } from "@/components/sessions/SessionsTable";
import { useSessions } from "@/lib/hooks";

export default function SessionsPage() {
  const sessionsQuery = useSessions();
  const refetchSessions = sessionsQuery.refetch;

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold">Sesiones</h1>
        <p className="text-sm text-muted-foreground">
          Definí nuevas sesiones de replay y controlá su estado.
        </p>
      </header>

      <SessionsForm onCreated={refetchSessions} />
      <SessionsTable
        sessions={sessionsQuery.data ?? []}
        isLoading={sessionsQuery.isLoading}
        onChanged={refetchSessions}
      />
    </div>
  );
}
