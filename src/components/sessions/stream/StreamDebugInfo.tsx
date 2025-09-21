interface StreamDebugInfoProps {
  url: string | null;
  query: string | null;
  activeStream: string | null;
}

export function StreamDebugInfo({ url, query, activeStream }: StreamDebugInfoProps) {
  if (!url) {
    return null;
  }

  if (typeof process !== "undefined" && process.env.NEXT_PUBLIC_SHOW_WS_DEBUG === "false") {
    return null;
  }

  return (
    <div className="space-y-1 rounded-md border bg-muted/30 p-3 text-xs font-mono">
      <p className="break-all">WS_CONSUMED_URL={url}</p>
      <p className="break-all">WS_CONSUMED_QUERY={query}</p>
      {activeStream ? <p className="break-all">STREAM={activeStream}</p> : null}
    </div>
  );
}
