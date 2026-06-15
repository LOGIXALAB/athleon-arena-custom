import "server-only";
import { db } from "@/lib/db/server";
import type { Json } from "@/lib/db/tables";

/** Appends an audit-log row. Best-effort: never throws into the caller's path. */
export async function audit(
  actor: string,
  action: string,
  entity: string,
  entityId: string | null,
  detail?: Json,
): Promise<void> {
  try {
    await db().from("audit_log").insert({
      actor,
      action,
      entity,
      entity_id: entityId,
      detail: detail ?? null,
    });
  } catch (e) {
    console.error("[audit] failed:", e);
  }
}
