const STYLES: Record<string, string> = {
  pending_payment: "border-warn/40 bg-warn/10 text-warn",
  pending_verification: "border-warn/40 bg-warn/10 text-warn",
  reserved: "border-info/40 bg-info/10 text-info",
  confirmed: "border-ok/40 bg-ok/10 text-ok",
  checked_in: "border-volt/40 bg-volt/10 text-volt",
  in_progress: "border-volt/40 bg-volt/10 text-volt",
  completed: "border-border-strong bg-surface-3 text-fg-muted",
  cancelled: "border-danger/30 bg-danger/10 text-danger",
  expired: "border-border-strong bg-surface-2 text-fg-faint",
  no_show: "border-danger/30 bg-danger/10 text-danger",
};

const LABELS: Record<string, string> = {
  pending_payment: "Pending payment",
  pending_verification: "Awaiting verification",
  reserved: "Reserved",
  confirmed: "Confirmed",
  checked_in: "Checked in",
  in_progress: "In progress",
  completed: "Completed",
  cancelled: "Cancelled",
  expired: "Expired",
  no_show: "No show",
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium " +
        (STYLES[status] ?? "border-border bg-surface-2 text-fg-muted")
      }
    >
      {LABELS[status] ?? status}
    </span>
  );
}
