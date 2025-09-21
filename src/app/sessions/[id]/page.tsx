"use client";

import { useParams } from "next/navigation";

import { SessionDetailsPage } from "@/components/sessions/SessionDetailsPage";
import { useSession } from "@/lib/hooks";

export default function SessionDetailPage() {
  const { id } = useParams<{ id: string }>();

  const sessionQuery = useSession(id);

  return <SessionDetailsPage id={id} prefetched={sessionQuery.data ?? undefined} />;
}
