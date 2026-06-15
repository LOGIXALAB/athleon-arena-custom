import type { PaymentProvider } from "../provider";

/**
 * STUB. No merchant account yet. Online payments are gated behind the
 * `online_payments` feature flag; until a real gateway is wired, checkout
 * throws and the UI shows "Coming soon". Replace the body when credentials exist.
 */
export const easypaisaJazzcash: PaymentProvider = {
  key: "easypaisa_jazzcash",
  online: false,
  async createCheckout() {
    throw new Error("GATEWAY_NOT_CONFIGURED");
  },
  async verifyWebhook() {
    throw new Error("GATEWAY_NOT_CONFIGURED");
  },
};
