import { notFound } from "next/navigation";
import { getActiveSports } from "@/lib/db/queries/public";
import { feature } from "@/lib/config/features";
import { BookingFlow } from "./BookingFlow";

export default async function BookSportPage({
  params,
}: {
  params: Promise<{ sport: string }>;
}) {
  const { sport } = await params;
  const sports = await getActiveSports();
  const match = sports.find((s) => s.id === sport);
  if (!match) notFound();
  const onlineEnabled = await feature("online_payments");
  const home = process.env.NEXT_PUBLIC_MARKETING_URL || "/book";

  return (
    <main className="mx-auto max-w-3xl px-5 py-10">
      <a href={home} className="text-sm text-fg-muted transition hover:text-fg">
        ← Athleon Arena
      </a>
      <h1 className="numeral mt-3 text-4xl font-bold uppercase">
        Book {match.name}
      </h1>
      <BookingFlow sportId={match.id} sportName={match.name} onlineEnabled={onlineEnabled} />
    </main>
  );
}
