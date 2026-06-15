import type { PaymentProvider } from "./provider";
import { easypaisaJazzcash } from "./providers/easypaisa-jazzcash";

const providers = new Map<string, PaymentProvider>();
for (const p of [easypaisaJazzcash]) providers.set(p.key, p);

export const PaymentRegistry = {
  get(key: string): PaymentProvider {
    const p = providers.get(key);
    if (!p) throw new Error(`No payment provider registered for '${key}'`);
    return p;
  },
  has(key: string): boolean {
    return providers.has(key);
  },
};
