interface StreamMessagesProps {
  errorMessage: string | null;
  closeMessage: string | null;
}

export function StreamMessages({ errorMessage, closeMessage }: StreamMessagesProps) {
  return (
    <>
      {closeMessage ? (
        <div className="rounded-md border border-muted-foreground/40 bg-muted/40 p-3 text-sm text-muted-foreground">
          {closeMessage}
        </div>
      ) : null}
      {errorMessage ? (
        <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
          {errorMessage}
        </div>
      ) : null}
    </>
  );
}
