"use client";

import Link from "next/link";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import type { SessionResponse, SessionStatus } from "@/lib/api-types";
import { getMessage } from "@/lib/errors";
import {
  useSessionDelete,
  useSessionDisable,
  useSessionEnable,
  useSessionPause,
  useSessionResume,
  useSessionStart,
} from "@/lib/hooks";

type SessionRowActionsProps = {
  row: SessionResponse;
  onChanged: () => void;
};

export function SessionRowActions({ row, onChanged }: SessionRowActionsProps) {
  const startSession = useSessionStart();
  const pauseSession = useSessionPause();
  const resumeSession = useSessionResume();
  const enableSession = useSessionEnable();
  const disableSession = useSessionDisable();
  const deleteSession = useSessionDelete();

  const { mutateAsync: startSessionMutateAsync, isPending: isStartingSession } =
    startSession;
  const { mutateAsync: pauseSessionMutateAsync, isPending: isPausingSession } =
    pauseSession;
  const { mutateAsync: resumeSessionMutateAsync, isPending: isResumingSession } =
    resumeSession;
  const {
    mutateAsync: enableSessionMutateAsync,
    isPending: isEnablingSession,
  } = enableSession;
  const {
    mutateAsync: disableSessionMutateAsync,
    isPending: isDisablingSession,
  } = disableSession;
  const {
    mutateAsync: deleteSessionMutateAsync,
    isPending: isDeletingSession,
  } = deleteSession;

  return (
    <div className="flex flex-wrap gap-2">
      <Button
        size="sm"
        variant="outline"
        disabled={
          isStartingSession ||
          isSessionRunningStatus(row.status) ||
          isSessionCompletedStatus(row.status)
        }
        onClick={async () => {
          try {
            await startSessionMutateAsync(row.id);
            toast.success("Sesión iniciada");
            await Promise.resolve(onChanged());
          } catch (error) {
            toast.error(getMessage(error));
          }
        }}
      >
        Start
      </Button>
      <Button
        size="sm"
        variant="outline"
        disabled={
          isPausingSession ||
          !isSessionRunningStatus(row.status) ||
          isSessionCompletedStatus(row.status)
        }
        onClick={async () => {
          try {
            await pauseSessionMutateAsync(row.id);
            toast.success("Sesión pausada");
            await Promise.resolve(onChanged());
          } catch (error) {
            toast.error(getMessage(error));
          }
        }}
      >
        Pause
      </Button>
      <Button
        size="sm"
        variant="outline"
        disabled={
          isResumingSession ||
          !isSessionPausedStatus(row.status) ||
          isSessionCompletedStatus(row.status)
        }
        onClick={async () => {
          try {
            await resumeSessionMutateAsync(row.id);
            toast.success("Sesión reanudada");
            await Promise.resolve(onChanged());
          } catch (error) {
            toast.error(getMessage(error));
          }
        }}
      >
        Resume
      </Button>
      <Button
        size="sm"
        variant="outline"
        disabled={isEnablingSession || isDisablingSession || isDeletingSession}
        onClick={async () => {
          try {
            if (row.enabled) {
              await disableSessionMutateAsync(row.id);
              toast.success("Sesión deshabilitada");
            } else {
              await enableSessionMutateAsync(row.id);
              toast.success("Sesión habilitada");
            }
            await Promise.resolve(onChanged());
          } catch (error) {
            toast.error(getMessage(error));
          }
        }}
      >
        {row.enabled ? "Disable" : "Enable"}
      </Button>
      <Button
        size="sm"
        variant="destructive"
        disabled={isDeletingSession}
        onClick={async () => {
          const confirmed = window.confirm(
            "¿Confirmás que querés eliminar la sesión?"
          );
          if (!confirmed) {
            return;
          }
          try {
            await deleteSessionMutateAsync(row.id);
            toast.success("Sesión eliminada");
            await Promise.resolve(onChanged());
          } catch (error) {
            toast.error(getMessage(error));
          }
        }}
      >
        Delete
      </Button>
      <Button asChild size="sm">
        <Link href={`/sessions/${row.id}`}>Detalle</Link>
      </Button>
    </div>
  );
}

function isSessionRunningStatus(status: SessionStatus | string) {
  return status.toLowerCase() === "running";
}

function isSessionPausedStatus(status: SessionStatus | string) {
  return status.toLowerCase() === "paused";
}

function isSessionCompletedStatus(status: SessionStatus | string) {
  const normalized = status.toLowerCase();
  return (
    normalized === "completed" ||
    normalized === "ended" ||
    normalized === "failed"
  );
}
