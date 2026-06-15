/**
 * Notification port. The launch channel is WhatsApp click-to-send (wa.me),
 * which never auto-delivers — it returns a link an ops user taps to send.
 * A future WhatsApp Business API adapter is one new file + a registry line.
 */

export interface NotifyMessage {
  toPhone: string; // E.164, e.g. +923001234567
  body: string;
}

export interface NotifyResult {
  delivered: boolean; // true only for auto-sending channels (Business API, SMS)
  manualAction?: { kind: "wa_link"; url: string };
}

export interface NotifyChannel {
  key: string;
  send(msg: NotifyMessage): Promise<NotifyResult>;
}
