import { Badge } from "@/components/ui/badge";
import { formatDateTime, formatNumber } from "@/lib/time";
import type { WsTradeData } from "@/lib/types";

interface LastTradeCardProps {
  trade: WsTradeData | null;
}

export function LastTradeCard({ trade }: LastTradeCardProps) {
  if (!trade) {
    return (
      <div className="space-y-1 rounded-md border bg-muted/30 p-3 text-xs">
        <p className="font-semibold">Último trade</p>
        <p className="text-muted-foreground">Aguardando datos del stream…</p>
      </div>
    );
  }

  return (
    <div className="space-y-1 rounded-md border bg-muted/30 p-3 text-xs">
      <p className="font-semibold">Último trade</p>
      <p className="text-muted-foreground">
        {trade.symbol} · {formatDateTime(trade.eventTime)}
      </p>
      <div className="flex flex-wrap gap-2">
        <Badge variant="outline">Precio: {formatNumber(trade.price, 4)}</Badge>
        <Badge variant="outline">Cantidad: {formatNumber(trade.qty, 4)}</Badge>
        {trade.quoteQty ? (
          <Badge variant="outline">Notional: {formatNumber(trade.quoteQty, 2)}</Badge>
        ) : null}
        <Badge variant={trade.isBuyerMaker ? "secondary" : "outline"}>
          Maker: {trade.isBuyerMaker ? "comprador" : "vendedor"}
        </Badge>
      </div>
    </div>
  );
}
