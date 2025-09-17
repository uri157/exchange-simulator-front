"use client";

import { Toaster as SonnerToaster } from "sonner";

export function Toaster() {
  return (
    <SonnerToaster
      toastOptions={{
        className:
          "group border border-border bg-background text-foreground shadow-lg",
      }}
      position="top-right"
    />
  );
}
