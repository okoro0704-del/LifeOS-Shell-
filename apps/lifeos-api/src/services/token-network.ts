import { container } from "../container.js";
import type { IFinProvLedgerProvider } from "../ports/finprov.js";

/** FinProv ledger — unbound until a sovereign node is bound on the container. */
export function getTokenNetwork(): IFinProvLedgerProvider {
  return container.getFinProvLedger();
}

export function setTokenNetwork(adapter: IFinProvLedgerProvider) {
  container.bindFinProvLedger(adapter);
}
