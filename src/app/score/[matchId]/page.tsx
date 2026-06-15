import Link from "next/link";
import { notFound } from "next/navigation";
import { requireStaff } from "@/lib/auth/staff";
import { StaffTopBar } from "@/components/staff/StaffTopBar";
import { getMatchRow } from "@/lib/db/queries/match";
import { ScorePanel } from "@/components/scoring/ScorePanel";

export default async function ScorePage({ params }: { params: Promise<{ matchId: string }> }) {
  const staff = await requireStaff("scorer");
  const { matchId } = await params;
  const match = await getMatchRow(matchId);
  if (!match) notFound();

  return (
    <>
      <StaffTopBar role={staff.role} name={staff.full_name} />
      <main className="mx-auto max-w-md px-4 py-6">
        <Link href="/ops" className="text-sm text-fg-muted transition hover:text-fg">← Ops</Link>
        <h1 className="numeral mb-4 mt-2 text-2xl font-bold uppercase">Scorer</h1>
        <ScorePanel matchId={matchId} />
      </main>
    </>
  );
}
