/**
 * Creates Supabase Auth users + matching staff_users rows. Idempotent.
 * Run:  npm run seed:staff
 *
 * Prints credentials once to seed-credentials.txt (gitignored).
 */
import { createClient } from "@supabase/supabase-js";
import { existsSync, writeFileSync } from "node:fs";
import { VENUE_ID } from "./seed";

if (existsSync(".env.local")) process.loadEnvFile(".env.local");

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}
const sb = createClient(url, key, { auth: { persistSession: false } });

type Role = "admin" | "owner" | "ops_manager" | "scorer";
const STAFF: { email: string; name: string; role: Role; password: string }[] = [
  { email: "admin@athleon.pk", name: "Athleon Admin", role: "admin", password: "Athleon!Admin1" },
  { email: "owner@athleon.pk", name: "Arena Owner", role: "owner", password: "Athleon!Owner1" },
  { email: "ops@athleon.pk", name: "Ops Manager", role: "ops_manager", password: "Athleon!Ops1" },
  { email: "scorer@athleon.pk", name: "Match Scorer", role: "scorer", password: "Athleon!Score1" },
];

async function findUserByEmail(email: string) {
  // listUsers is paginated; one page is plenty for a handful of staff.
  const { data } = await sb.auth.admin.listUsers({ page: 1, perPage: 200 });
  return data.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
}

async function main() {
  const lines: string[] = ["Athleon staff credentials (seed)", "================================"];
  for (const s of STAFF) {
    let userId: string;
    const existing = await findUserByEmail(s.email);
    if (existing) {
      userId = existing.id;
      await sb.auth.admin.updateUserById(userId, { password: s.password });
      console.log(`• ${s.email} exists → password reset`);
    } else {
      const { data, error } = await sb.auth.admin.createUser({
        email: s.email,
        password: s.password,
        email_confirm: true,
      });
      if (error || !data.user) {
        console.error(`✗ create ${s.email}`, error);
        process.exit(1);
      }
      userId = data.user.id;
      console.log(`✓ created ${s.email}`);
    }

    const { error: upErr } = await sb.from("staff_users").upsert({
      id: userId,
      email: s.email,
      full_name: s.name,
      role: s.role,
      // owner/admin span all venues; ops/scorer scoped to the launch venue
      venue_id: s.role === "ops_manager" || s.role === "scorer" ? VENUE_ID : null,
      is_active: true,
    });
    if (upErr) {
      console.error(`✗ staff_users ${s.email}`, upErr);
      process.exit(1);
    }
    lines.push(`${s.role.padEnd(12)} ${s.email}   ${s.password}`);
  }

  writeFileSync("seed-credentials.txt", lines.join("\n") + "\n");
  console.log("\nStaff seeded. Credentials written to seed-credentials.txt");
}

main();
