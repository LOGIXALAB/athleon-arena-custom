import { notFound } from "next/navigation";
import { getDisplayState } from "@/lib/db/queries/display";
import { DisplayClient } from "./DisplayClient";

export const dynamic = "force-dynamic";

export default async function DisplayPage({ params }: { params: Promise<{ courtId: string }> }) {
  const { courtId } = await params;
  const ds = await getDisplayState(courtId);
  if (!ds) notFound();

  return (
    <DisplayClient
      courtId={ds.courtId}
      courtName={ds.courtName}
      venueName={ds.venueName}
      timezone={ds.timezone}
      initialMode={ds.mode}
      initialMatchId={ds.matchId}
      initialScoreboard={ds.snapshot?.scoreboard ?? null}
      initialSummary={ds.snapshot?.summary ?? null}
      initialComplete={ds.snapshot?.isComplete ?? false}
      nextBooking={ds.nextBooking}
    />
  );
}
