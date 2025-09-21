"use client";

import { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { SessionResponse } from "@/lib/api-types";
import {
  useSessionDelete,
  useSessionDisable,
  useSessionEnable,
  useSessionPause,
  useSessionResume,
  useSessionSeek,
  useSessionStart,
} from "@/lib/hooks";

interface SessionControlsProps {
  session: SessionResponse;
  onSessionUpdated?: () => Promise<unknown> | void;
  onSessionDeleted?: () => void;
}

interface SessionStatusState {
  isRunning: boolean;
  isPaused: boolean;
  isEnded: boolean;
  isTerminal: boolean;
}

export function SessionControls({
  session,
  onSessionUpdated,
  onSessionDeleted,
}: SessionControlsProps) {
  const startSession = useSessionStart();
  const pauseSession = useSessionPause();
  const resumeSession = useSessionResume();
  const seekSession = useSessionSeek();
  const enableSession = useSessionEnable();
  const disableSession = useSessionDisable();
  const deleteSession = useSessionDelete();

  const [seekValue, setSeekValue] = useState<string>("");

  const statusState = useMemo(() => normalizeSessionStatus(session.status), [session.status]);

  const handleAfterMutation = useCallback(async () => {
    if (typeof onSessionUpdated === "function") {
      await onSessionUpdated();
    }
  }, [onSessionUpdated]);

  const handleStart = useCallback(async () => {
    console.debug("[SessionControls] start clicked", { sessionId: session.id });
    if (!session.enabled) {
      toast.error("La sesión está deshabilitada");
      return;
    }
    // Permitimos iniciar cuando está "ended" o "paused". Solo bloqueamos si ya corre.
    if (statusState.isRunning) {
      toast.info("La sesión ya está en ejecución");
      return;
    }

    try {
      await startSession.mutateAsync(session.id);
      toast.success("Sesión iniciada");
      await handleAfterMutation();
    } catch (error) {
      toast.error(getMessage(error));
    }
  }, [handleAfterMutation, session.enabled, session.id, startSession, statusState.isRunning]);

  const handlePause = useCallback(async () => {
    console.debug("[SessionControls] pause clicked", { sessionId: session.id });
    if (!session.enabled) {
      toast.error("La sesión está deshabilitada");
      return;
    }
    if (!statusState.isRunning) {
      toast.error("La sesión no está en ejecución");
      return;
    }

    try {
      await pauseSession.mutateAsync(session.id);
      toast.success("Sesión pausada");
      await handleAfterMutation();
    } catch (error) {
      toast.error(getMessage(error));
    }
  }, [handleAfterMutation, pauseSession, session.enabled, session.id, statusState.isRunning]);

  const handleResume = useCallback(async () => {
    console.debug("[SessionControls] resume clicked", { sessionId: session.id });
    if (!session.enabled) {
      toast.error("La sesión está deshabilitada");
      return;
    }
    if (!statusState.isPaused) {
      toast.error("La sesión no está pausada");
      return;
    }

    try {
      await resumeSession.mutateAsync(session.id);
      toast.success("Sesión reanudada");
      await handleAfterMutation();
    } catch (error) {
      toast.error(getMessage(error));
    }
  }, [handleAfterMutation, resumeSession, session.enabled, session.id, statusState.isPaused]);

  const handleSeek = useCallback(async () => {
    console.debug("[SessionControls] seek clicked", { sessionId: session.id, value: seekValue });
    if (!seekValue) {
      toast.error("Ingresá un timestamp");
      return;
    }
    if (!session.enabled) {
      toast.error("La sesión está deshabilitada");
      return;
    }
    if (!statusState.isRunning) {
      toast.error("La sesión debe estar en ejecución para hacer seek");
      return;
    }
    if (statusState.isTerminal) {
      toast.error("La sesión no admite más movimientos");
      return;
    }

    const timestamp = Number(seekValue);
    if (Number.isNaN(timestamp)) {
      toast.error("Timestamp inválido");
      return;
    }

    try {
      await seekSession.mutateAsync({ id: session.id, timestamp });
      toast.success("Seek enviado");
      await handleAfterMutation();
    } catch (error) {
      toast.error(getMessage(error));
    }
  }, [handleAfterMutation, seekSession, seekValue, session.enabled, session.id, statusState.isRunning, statusState.isTerminal]);

  const handleEnable = useCallback(async () => {
    console.debug("[SessionControls] enable clicked", { sessionId: session.id });
    try {
      await enableSession.mutateAsync(session.id);
      toast.success("Sesión habilitada");
      await handleAfterMutation();
    } catch (error) {
      toast.error(getMessage(error));
    }
  }, [enableSession, handleAfterMutation, session.id]);

  const handleDisable = useCallback(async () => {
    console.debug("[SessionControls] disable clicked", { sessionId: session.id });
    try {
      await disableSession.mutateAsync(session.id);
      toast.success("Sesión deshabilitada");
      await handleAfterMutation();
    } catch (error) {
      toast.error(getMessage(error));
    }
  }, [disableSession, handleAfterMutation, session.id]);

  const handleDelete = useCallback(async () => {
    console.debug("[SessionControls] delete clicked", { sessionId: session.id });
    const confirmed = window.confirm("¿Confirmás que querés eliminar la sesión?");
    if (!confirmed) {
      return;
    }

    try {
      await deleteSession.mutateAsync(session.id);
      toast.success("Sesión eliminada");
      onSessionDeleted?.();
    } catch (error) {
      toast.error(getMessage(error));
    }
  }, [deleteSession, onSessionDeleted, session.id]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Controles</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            onClick={handleStart}
            disabled={
              startSession.isPending || statusState.isRunning || !session.enabled
            }
          >
            {startSession.isPending ? "Iniciando..." : "Start"}
          </Button>
          <Button
            type="button"
            onClick={handlePause}
            disabled={pauseSession.isPending || !statusState.isRunning || !session.enabled}
          >
            {pauseSession.isPending ? "Pausando..." : "Pause"}
          </Button>
          <Button
            type="button"
            onClick={handleResume}
            disabled={resumeSession.isPending || !statusState.isPaused || !session.enabled}
          >
            {resumeSession.isPending ? "Reanudando..." : "Resume"}
          </Button>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Input
            placeholder="Timestamp ms"
            value={seekValue}
            onChange={(event) => setSeekValue(event.target.value)}
            disabled={!session.enabled || statusState.isTerminal || !statusState.isRunning}
          />
          <Button
            type="button"
            onClick={handleSeek}
            disabled={
              seekSession.isPending || !session.enabled || statusState.isTerminal || !statusState.isRunning
            }
          >
            {seekSession.isPending ? "Buscando..." : "Seek"}
          </Button>
        </div>
      </CardContent>
      <CardFooter className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={session.enabled ? handleDisable : handleEnable}
          disabled={enableSession.isPending || disableSession.isPending || deleteSession.isPending}
        >
          {session.enabled
            ? disableSession.isPending
              ? "Deshabilitando..."
              : "Disable"
            : enableSession.isPending
            ? "Habilitando..."
            : "Enable"}
        </Button>
        <Button type="button" variant="destructive" onClick={handleDelete} disabled={deleteSession.isPending}>
          {deleteSession.isPending ? "Eliminando..." : "Delete"}
        </Button>
      </CardFooter>
    </Card>
  );
}

function normalizeSessionStatus(status: string): SessionStatusState {
  const normalized = status.toLowerCase();
  return {
    isRunning: normalized === "running",
    isPaused: normalized === "paused",
    isEnded: normalized === "ended",
    isTerminal: normalized === "completed" || normalized === "ended" || normalized === "failed",
  };
}

function getMessage(error: unknown) {
  return error instanceof Error ? error.message : "Ocurrió un error";
}
