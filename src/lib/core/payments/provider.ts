/**
 * Payment provider port. Swapping or adding gateways touches only this folder.
 * Launch providers: easypaisa_jazzcash (stub), bank_transfer, cash.
 */

export interface CheckoutBooking {
  id: string;
  amountDue: number;
  currency: string;
}

export interface CheckoutResult {
  redirectUrl: string;
  providerRef: string;
}

export interface WebhookResult {
  providerRef: string;
  status: "succeeded" | "failed";
  amount: number;
}

export interface PaymentProvider {
  key: string;
  /** Whether this provider can take money online right now (gated by config/flags). */
  online: boolean;
  createCheckout(b: CheckoutBooking, returnUrl: string): Promise<CheckoutResult>;
  verifyWebhook(rawBody: string, headers: Record<string, string>): Promise<WebhookResult>;
}
