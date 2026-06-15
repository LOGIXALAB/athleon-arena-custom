import "server-only";
import { requireServerEnv } from "@/lib/env";
import {
  channels,
  type CourtEventName,
  type MatchEventName,
  type OpsEventName,
} from "./channels";

/**
 * Publishes a broadcast message via Supabase Realtime's HTTP endpoint. Avoids
 * holding a websocket open in serverless route handlers. The row in the DB is
 * the truth; this push is just speed. Failures never break the request path.
 */
async function broadcast(topic: string, event: string, payload: unknown): Promise<void> {
  try {
    const { url, serviceRole } = requireServerEnv();
    await fetch(`${url}/realtime/v1/api/broadcast`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: serviceRole,
        Authorization: `Bearer ${serviceRole}`,
      },
      body: JSON.stringify({
        messages: [{ topic, event, payload, private: false }],
      }),
    });
  } catch (e) {
    console.error(`[realtime] broadcast ${topic}/${event} failed:`, e);
  }
}

export function publishMatch(matchId: string, event: MatchEventName, payload: unknown) {
  return broadcast(channels.match(matchId), event, payload);
}

export function publishCourt(courtId: string, event: CourtEventName, payload: unknown) {
  return broadcast(channels.court(courtId), event, payload);
}

export function publishOps(venueId: string, event: OpsEventName, payload: unknown) {
  return broadcast(channels.ops(venueId), event, payload);
}
