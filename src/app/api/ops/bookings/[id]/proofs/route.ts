import { type NextRequest } from "next/server";
import { ok, handle } from "@/lib/api";
import { requireRole } from "@/lib/auth/staff";
import { getProofUrls } from "@/lib/db/queries/ops";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    await requireRole("ops_manager");
    const { id } = await params;
    return ok({ urls: await getProofUrls(id) });
  });
}
