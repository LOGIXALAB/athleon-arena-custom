import { requireStaff } from "@/lib/auth/staff";
import { StaffTopBar } from "@/components/staff/StaffTopBar";

export default async function OpsLayout({ children }: { children: React.ReactNode }) {
  const staff = await requireStaff("ops_manager");
  return (
    <>
      <StaffTopBar role={staff.role} name={staff.full_name} />
      {children}
    </>
  );
}
