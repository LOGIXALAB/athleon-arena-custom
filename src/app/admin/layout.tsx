import Link from "next/link";
import { requireStaff } from "@/lib/auth/staff";
import { StaffTopBar } from "@/components/staff/StaffTopBar";

const NAV = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/pricing", label: "Pricing" },
  { href: "/admin/schedules", label: "Schedules" },
  { href: "/admin/memberships", label: "Memberships" },
  { href: "/admin/analytics", label: "Analytics" },
  { href: "/admin/staff", label: "Staff" },
  { href: "/admin/flags", label: "Feature flags" },
  { href: "/admin/audit", label: "Audit log" },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const staff = await requireStaff("owner");
  return (
    <>
      <StaffTopBar role={staff.role} name={staff.full_name} />
      <div className="mx-auto flex max-w-7xl gap-6 px-5 py-6">
        <aside className="hidden w-48 shrink-0 lg:block">
          <nav className="space-y-1 text-sm">
            {NAV.map((n) => (
              <Link key={n.href} href={n.href} className="block rounded-md px-3 py-2 text-fg-muted transition hover:bg-surface-2 hover:text-fg">
                {n.label}
              </Link>
            ))}
          </nav>
        </aside>
        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </>
  );
}
