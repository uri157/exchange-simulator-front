"use client";

import { WS_BASE_URL, WS_PATH } from "@/lib/env";
import type { WsMessage } from "@/lib/types";

export interface OpenWsOptions {
  sessionId: string;
  streams: string;
  onMessage: (message: WsMessage) => void;
  onError?: (error: Error) => void;
  onOpen?: () => void;
  onClose?: (event: CloseEvent) => void;
}

export function openWs({
  sessionId,
  streams,
  onMessage,
  onError,
  onOpen,
  onClose,
}: OpenWsOptions) {
  const url = new URL(WS_PATH, WS_BASE_URL);
  url.searchParams.set("sessionId", sessionId);
  url.searchParams.set("streams", streams);

  const socket = new WebSocket(url);

  socket.addEventListener("open", () => {
    onOpen?.();
  });

  socket.addEventListener("message", (event) => {
    try {
      const data = JSON.parse(String(event.data)) as WsMessage;
      if (!data || typeof data !== "object" || !("type" in data)) {
        throw new Error("Unexpected message");
      }
      onMessage(data);
    } catch (error) {
      onError?.(
        error instanceof Error ? error : new Error("Failed to parse message")
      );
    }
  });

  socket.addEventListener("error", () => {
    onError?.(new Error("WebSocket error"));
  });

  socket.addEventListener("close", (event) => {
    onClose?.(event);
  });

  return () => {
    socket.close();
  };
}
