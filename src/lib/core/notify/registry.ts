import type { NotifyChannel } from "./contract";
import { waClickToSend } from "./providers/wa-click-to-send";

const channels = new Map<string, NotifyChannel>();
for (const c of [waClickToSend]) channels.set(c.key, c);

const DEFAULT_CHANNEL = "wa_click_to_send";

export const NotifyRegistry = {
  get(key: string = DEFAULT_CHANNEL): NotifyChannel {
    const c = channels.get(key);
    if (!c) throw new Error(`No notify channel registered for '${key}'`);
    return c;
  },
  default(): NotifyChannel {
    return channels.get(DEFAULT_CHANNEL)!;
  },
};

/** Composes the standard "booking confirmed" message body (manage link + details). */
export function bookingConfirmedMessage(opts: {
  customerName?: string | null;
  sportName: string;
  courtName: string;
  startsAtLocal: string;
  manageUrl: string;
}): string {
  const hi = opts.customerName ? `Hi ${opts.customerName}, ` : "";
  return (
    `${hi}your Athleon Arena booking is confirmed ✅\n` +
    `${opts.sportName} · ${opts.courtName}\n` +
    `${opts.startsAtLocal}\n\n` +
    `Set up your team & follow the live score here:\n${opts.manageUrl}`
  );
}
