import type { LifeOsPaymentAdapter } from "./payment-adapter.types.js";
import { container } from "../container.js";
import type { IFinProvPaymentProvider } from "../ports/finprov.js";

export type { LifeOsPaymentAdapter } from "./payment-adapter.types.js";

/** Payment settlement port — FinProv unbound by default. */
export function getPaymentAdapter(): LifeOsPaymentAdapter {
  return container.getFinProvPayment();
}

export function setPaymentAdapter(adapter: IFinProvPaymentProvider) {
  container.bindFinProvPayment(adapter);
}
