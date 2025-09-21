import { Badge } from "@/components/ui/badge";
import { formatDateTime, formatNumber } from "@/lib/time";
import type { WsKlineData } from "@/lib/types";

interface LastKlineCardProps {
  kline: WsKlineData;
}

export function LastKlineCard({ kline }: LastKlineCardProps) {
  return (
    <div className="space-y-1 rounded-md border bg-muted/30 p-3 text-xs">
      <p className="font-semibold">Última vela</p>
      <p className="text-muted-foreground">
        {kline.symbol} · {kline.interval} · {formatDateTime(kline.closeTime)}
      </p>
      <div className="flex flex-wrap gap-2">
        <Badge variant="outline">Open: {formatNumber(kline.open)}</Badge>
        <Badge variant="outline">Close: {formatNumber(kline.close)}</Badge>
        <Badge variant="outline">High: {formatNumber(kline.high)}</Badge>
        <Badge variant="outline">Low: {formatNumber(kline.low)}</Badge>
        <Badge variant="outline">Volume: {formatNumber(kline.volume, 4)}</Badge>
      </div>
    </div>
  );
}
