"use client";

import { useParams } from "next/navigation";

import { SessionDetailsPage } from "@/components/sessions/SessionDetailsPage";
import { useSession } from "@/lib/hooks";

export default function SessionDetailPage() {
  const params = useParams<{ id?: string }>();
  const id = typeof params?.id === "string" ? params.id : "";

  const sessionQuery = useSession(id ? id : null);

  return <SessionDetailsPage id={id} prefetched={sessionQuery.data ?? undefined} />;
}
