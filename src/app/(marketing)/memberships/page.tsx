import Link from "next/link";
import { notFound } from "next/navigation";
import { getMembershipPlans } from "@/lib/db/queries/public";
import { feature } from "@/lib/config/features";

export default async function MembershipsPage() {
  if (!(await feature("memberships"))) notFound();
  const plans = await getMembershipPlans();

  return (
    <main className="mx-auto max-w-6xl px-5 py-20">
      <p className="text-sm font-medium uppercase tracking-[0.3em] text-volt">Membership</p>
      <h1 className="numeral mt-3 text-5xl font-bold uppercase">Play more. Pay less.</h1>
      <p className="mt-4 max-w-xl text-fg-muted">
        Join the club for standing discounts, priority booking windows, and free practice hours.
        Cancel anytime.
      </p>

      <div className="mt-12 grid gap-6 lg:grid-cols-3">
        {plans.map((p, i) => (
          <div
            key={p.id}
            className={
              "card flex flex-col p-7 " + (i === 1 ? "glow border-volt/40" : "")
            }
          >
            {i === 1 && (
              <span className="mb-3 w-fit rounded-full bg-volt px-3 py-1 text-xs font-semibold text-[#07090a]">
                Most popular
              </span>
            )}
            <div className="numeral text-3xl font-bold uppercase">{p.name}</div>
            <div className="mt-2 flex items-baseline gap-1">
              <span className="text-4xl font-bold text-volt">{p.discount_pct}%</span>
              <span className="text-sm text-fg-muted">off bookings</span>
            </div>
            <div className="mt-1 text-sm text-fg-muted">
              PKR {p.monthly_price.toLocaleString()} / month
            </div>
            <ul className="mt-6 flex-1 space-y-2 text-sm text-fg-muted">
              {p.perks.map((perk) => (
                <li key={perk} className="flex gap-2">
                  <span className="text-volt">✓</span>
                  {perk}
                </li>
              ))}
            </ul>
            <Link
              href="/#contact"
              className="mt-7 rounded-md bg-volt px-5 py-2.5 text-center text-sm font-semibold text-[#07090a] transition hover:bg-volt-dim"
            >
              Enquire
            </Link>
          </div>
        ))}
      </div>
    </main>
  );
}
