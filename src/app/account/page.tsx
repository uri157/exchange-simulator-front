"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { DataTable, type DataTableColumn } from "@/components/DataTable";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { AccountBalance } from "@/lib/api-types";
import { useAccount, useSessions } from "@/lib/hooks";
import { formatNumber } from "@/lib/time";

export default function AccountPage() {
  const sessionsQuery = useSessions();
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const [sessionId, setSessionId] = useState<string | undefined>(
    searchParams.get("sessionId") ?? undefined
  );

  useEffect(() => {
    const existing = searchParams.get("sessionId");
    if (existing) {
      setSessionId(existing);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const accountQuery = useAccount(sessionId ?? null);

  const columns = useMemo<DataTableColumn<AccountBalance>[]>(
    () => [
      { key: "asset", header: "Asset" },
      {
        key: "free",
        header: "Free",
        render: (row) => formatNumber(row.free, 4),
      },
      {
        key: "locked",
        header: "Locked",
        render: (row) => formatNumber(row.locked, 4),
      },
    ],
    []
  );

  const handleSelect = (value: string) => {
    setSessionId(value);
    const next = new URLSearchParams(searchParams.toString());
    next.set("sessionId", value);
    const queryString = next.toString();
    router.replace(queryString ? `${pathname}?${queryString}` : pathname);
  };

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold">Cuenta</h1>
        <p className="text-sm text-muted-foreground">
          Seleccioná una sesión para consultar los balances asociados.
        </p>
      </header>

      <section className="rounded-lg border p-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">Sesión</label>
          <Select value={sessionId} onValueChange={handleSelect}>
            <SelectTrigger>
              <SelectValue placeholder="Elegí una sesión" />
            </SelectTrigger>
            <SelectContent>
              {(sessionsQuery.data ?? []).map((session) => (
                <SelectItem key={session.id} value={session.id}>
                  {session.id} · {session.status}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Balances</h2>
          <Badge variant="secondary">
            {accountQuery.data?.balances.length ?? 0} activos
          </Badge>
        </div>
        {accountQuery.isLoading ? (
          <div className="h-40 animate-pulse rounded-md border bg-muted" />
        ) : (
          <DataTable
            data={accountQuery.data?.balances ?? []}
            columns={columns}
            emptyMessage={
              sessionId
                ? "Sin balances para la sesión seleccionada"
                : "Seleccioná una sesión para ver balances"
            }
            getRowId={(row) => row.asset}
          />
        )}
      </section>
    </div>
  );
}
