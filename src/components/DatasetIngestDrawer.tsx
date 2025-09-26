"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import type { Dataset, DatasetDetail, DatasetStatus } from "@/types/datasets";

interface DatasetIngestDrawerProps {
  open: boolean;
  dataset: Dataset | null;
  detail: DatasetDetail | null;
  onOpenChange: (open: boolean) => void;
  onCancel: () => void;
  cancelDisabled?: boolean;
  isPolling?: boolean;
}

const STATUS_VARIANT: Record<DatasetStatus, "default" | "secondary" | "outline"> = {
  Registered: "outline",
  Ingesting: "secondary",
  Ready: "default",
  Failed: "outline",
  Canceled: "outline",
};

const STATUS_CLASS: Partial<Record<DatasetStatus, string>> = {
  Ready: "bg-emerald-100 text-emerald-900 border-emerald-200 dark:bg-emerald-500/20 dark:text-emerald-100",
  Failed: "bg-destructive text-destructive-foreground border-destructive",
  Canceled: "bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-500/20 dark:text-yellow-100",
  Ingesting: "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-500/20 dark:text-blue-100",
};

export function DatasetIngestDrawer({
  open,
  dataset,
  detail,
  onOpenChange,
  onCancel,
  cancelDisabled,
  isPolling,
}: DatasetIngestDrawerProps) {
  const [mounted, setMounted] = useState(false);
  const logsRef = useRef<HTMLPreElement | null>(null);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  const merged = useMemo(() => {
    if (!dataset && !detail) return null;
    if (!dataset) return detail;
    if (!detail) return dataset;
    return { ...dataset, ...detail };
  }, [dataset, detail]);

  useEffect(() => {
    if (!open) return;
    const node = logsRef.current;
    if (!node) return;
    node.scrollTop = node.scrollHeight;
  }, [detail?.logs, open]);

  if (!mounted || !open || !merged) {
    return null;
  }

  const progress = Math.round(merged.progress ?? 0);
  const status = merged.status ?? "Registered";
  const logs = detail?.logs ?? [];

  const badgeVariant = STATUS_VARIANT[status] ?? "default";
  const badgeClass = STATUS_CLASS[status];

  return createPortal(
    <div className="fixed inset-0 z-40 flex">
      <div className="absolute inset-0 bg-background/70 backdrop-blur" onClick={() => onOpenChange(false)} />
      <aside className="relative ml-auto flex h-full w-full max-w-3xl flex-col border-l bg-background shadow-xl">
        <header className="flex items-start justify-between border-b p-6">
          <div className="space-y-1">
            <h2 className="text-xl font-semibold">
              {merged.name ?? `${merged.symbol} ${merged.interval}`}
            </h2>
            <p className="text-sm text-muted-foreground">
              Última actualización: {merged.updatedAt ? new Date(merged.updatedAt).toLocaleString() : "-"}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={badgeVariant} className={badgeClass}>{status}</Badge>
            <Button variant="ghost" onClick={() => onOpenChange(false)}>
              Cerrar
            </Button>
          </div>
        </header>
        <div className="flex flex-1 flex-col gap-6 overflow-y-auto p-6">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Progreso</span>
              <span className="text-sm tabular-nums text-muted-foreground">{progress}%</span>
            </div>
            <Progress value={progress} className="h-3" />
            {detail?.lastMessage ? (
              <p className="text-sm text-muted-foreground">{detail.lastMessage}</p>
            ) : null}
            {isPolling ? (
              <p className="text-xs text-muted-foreground">Reconectando…</p>
            ) : null}
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium">Logs recientes</h3>
              <span className="text-xs text-muted-foreground">Máximo 50 líneas</span>
            </div>
            <pre
              ref={logsRef}
              className="h-64 overflow-auto rounded-md border bg-muted/60 p-3 text-xs"
            >
              {logs.length === 0 ? "Sin eventos todavía" : logs.slice(-50).join("\n")}
            </pre>
          </div>
        </div>
        {status === "Ingesting" ? (
          <footer className="flex items-center justify-end gap-2 border-t p-6">
            <Button variant="destructive" onClick={onCancel} disabled={cancelDisabled}>
              Cancelar ingesta
            </Button>
          </footer>
        ) : null}
      </aside>
    </div>,
    document.body
  );
}
