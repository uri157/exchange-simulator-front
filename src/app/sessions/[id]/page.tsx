"use client";

import { useEffect } from "react";
import { useParams } from "next/navigation";

import { SessionDetailsPage } from "@/components/sessions/SessionDetailsPage";
import { useSession } from "@/lib/hooks";

export default function SessionDetailPage() {
  const { id } = useParams<{ id: string }>();

  const sessionQuery = useSession(id);

  useEffect(() => {
    console.debug("[SessionDetailPage] mount", { sessionId: id });
    return () => {
      console.debug("[SessionDetailPage] unmount", { sessionId: id });
    };
  }, [id]);

  return <SessionDetailsPage id={id} prefetched={sessionQuery.data ?? undefined} />;
}
