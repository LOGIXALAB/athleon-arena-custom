import { notFound } from "next/navigation";
import { getBookingByToken } from "@/lib/db/queries/booking";
import { getActiveSports } from "@/lib/db/queries/public";
import { ManageClient } from "./ManageClient";

export default async function ManagePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const bundle = await getBookingByToken(token);
  if (!bundle) notFound();

  const sports = await getActiveSports();
  const sport = sports.find((s) => s.id === bundle.booking.sport_id);
  const roles = sport?.roster_schema.roles ?? [];
  const maxPlayers = sport?.roster_schema.maxPlayers ?? 11;

  return (
    <ManageClient
      token={token}
      initial={{
        booking: {
          id: bundle.booking.id,
          status: bundle.booking.status,
          sportId: bundle.booking.sport_id,
          sportName: sport?.name ?? bundle.booking.sport_id,
          startsAt: bundle.booking.starts_at,
          endsAt: bundle.booking.ends_at,
          paymentMethod: bundle.booking.payment_method,
          amountDue: bundle.booking.amount_due,
          currency: bundle.booking.currency,
        },
        venue: { name: bundle.venue.name, timezone: bundle.venue.timezone, settings: bundle.venue.settings },
        court: { name: bundle.court.name },
        teams: bundle.teams.map((t) => ({
          side: t.side,
          name: t.name,
          captainName: t.captain_name,
          contactPhone: t.contact_phone,
          players: t.players.map((p) => ({ id: p.id, name: p.name, jerseyNo: p.jersey_no, role: p.role })),
        })),
        match: bundle.match ? { id: bundle.match.id, status: bundle.match.status } : null,
      }}
      roles={roles}
      maxPlayers={maxPlayers}
    />
  );
}
