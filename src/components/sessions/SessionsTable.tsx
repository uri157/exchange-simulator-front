"use client";

import { useMemo } from "react";

import { DataTable, type DataTableColumn } from "@/components/DataTable";
import { Badge } from "@/components/ui/badge";
import type { SessionResponse } from "@/lib/api-types";
import { formatDateTime } from "@/lib/time";

import { SessionRowActions } from "./SessionRowActions";

type SessionsTableProps = {
  sessions: SessionResponse[];
  isLoading: boolean;
  onChanged: () => void;
};

export function SessionsTable({ sessions, isLoading, onChanged }: SessionsTableProps) {
  const columns = useMemo<DataTableColumn<SessionResponse>[]>(
    () => [
      { key: "id", header: "ID" },
      {
        key: "symbols",
        header: "Símbolos",
        render: (row) => row.symbols.join(", "),
      },
      { key: "interval", header: "Intervalo" },
      { key: "status", header: "Estado" },
      {
        key: "enabled",
        header: "Enabled",
        render: (row) => (
          <Badge variant={row.enabled ? "secondary" : "outline"}>
            {row.enabled ? "On" : "Off"}
          </Badge>
        ),
      },
      {
        key: "createdAt",
        header: "Creado",
        render: (row) => formatDateTime(row.createdAt),
      },
      {
        key: "actions",
        header: "Acciones",
        render: (row) => <SessionRowActions row={row} onChanged={onChanged} />,
      },
    ],
    [onChanged]
  );

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Listado de sesiones</h2>
        <Badge variant="secondary">{sessions.length} registradas</Badge>
      </div>
      {isLoading ? (
        <div className="h-40 animate-pulse rounded-md border bg-muted" />
      ) : (
        <DataTable
          data={sessions}
          columns={columns}
          emptyMessage="No hay sesiones registradas"
          caption="Sesiones activas en el backend"
          getRowId={(row) => row.id}
        />
      )}
    </section>
  );
}
