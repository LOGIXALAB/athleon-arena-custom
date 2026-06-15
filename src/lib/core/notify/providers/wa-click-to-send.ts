import type { NotifyChannel, NotifyMessage, NotifyResult } from "../contract";

/** E.164 / local → wa.me digits (no '+', no spaces, no dashes). */
export function waDigits(phone: string): string {
  const trimmed = phone.trim().replace(/[\s\-()]/g, "");
  if (trimmed.startsWith("+")) return trimmed.slice(1);
  if (trimmed.startsWith("00")) return trimmed.slice(2);
  // local PK number like 03001234567 → 923001234567
  if (trimmed.startsWith("0")) return "92" + trimmed.slice(1);
  return trimmed;
}

/** Builds a click-to-send WhatsApp deep link. Body is truncated to keep mobile happy. */
export function waLink(phone: string, body: string): string {
  const text = body.length > 600 ? body.slice(0, 597) + "…" : body;
  return `https://wa.me/${waDigits(phone)}?text=${encodeURIComponent(text)}`;
}

export const waClickToSend: NotifyChannel = {
  key: "wa_click_to_send",
  async send(msg: NotifyMessage): Promise<NotifyResult> {
    return {
      delivered: false,
      manualAction: { kind: "wa_link", url: waLink(msg.toPhone, msg.body) },
    };
  },
};
