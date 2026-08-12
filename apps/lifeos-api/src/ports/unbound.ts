import type { PaymentPreview } from "@lifeos/shared";
import type { IDataZoneStorageProvider } from "./datazone.js";
import type { IElfComMessagingProvider } from "./elfcom.js";
import type {
  IFinProvFiatProvider,
  IFinProvLedgerProvider,
  IFinProvPaymentProvider,
} from "./finprov.js";

export class ModuleUnboundError extends Error {
  readonly code = "module_unbound";
  constructor(readonly moduleId: "datazone" | "finprov" | "elfcom") {
    super(`Module Unbound / Awaiting Sovereign Node: ${moduleId}`);
    this.name = "ModuleUnboundError";
  }
}

function fmtPreview(amount: number, currency: string): string {
  if (currency === "NGN") {
    return new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency: "NGN",
      maximumFractionDigits: 0,
    }).format(amount);
  }
  return `${amount} ${currency}`;
}

/** Empty DataZone slot — no local storage driver. */
export class UnboundDataZoneStorageProvider implements IDataZoneStorageProvider {
  readonly nodeId = "datazone" as const;
  readonly bound = false;

  async put(): Promise<never> {
    throw new ModuleUnboundError("datazone");
  }
  async get(): Promise<null> {
    return null;
  }
  async delete(): Promise<void> {
    throw new ModuleUnboundError("datazone");
  }
  async exists(): Promise<boolean> {
    return false;
  }
}

/** Empty FinProv ledger slot — no mock balances or fake txs. */
export class UnboundFinProvLedgerProvider implements IFinProvLedgerProvider {
  readonly nodeId = "finprov" as const;
  readonly bound = false;

  async getWallet(): Promise<never> {
    throw new ModuleUnboundError("finprov");
  }
  async getBalance(): Promise<never> {
    throw new ModuleUnboundError("finprov");
  }
  async getTransactions(): Promise<never> {
    throw new ModuleUnboundError("finprov");
  }
  async send(): Promise<never> {
    throw new ModuleUnboundError("finprov");
  }
  async requestPayment(): Promise<never> {
    throw new ModuleUnboundError("finprov");
  }
  async receiveAddress(): Promise<never> {
    throw new ModuleUnboundError("finprov");
  }
}

export class UnboundFinProvFiatProvider implements IFinProvFiatProvider {
  readonly nodeId = "finprov" as const;
  readonly bound = false;

  async getCashWallet(): Promise<never> {
    throw new ModuleUnboundError("finprov");
  }
}

/**
 * Payment port stays callable for previews (math only) but refuses settlement
 * until FinProv is bound.
 */
export class UnboundFinProvPaymentProvider implements IFinProvPaymentProvider {
  readonly nodeId = "finprov" as const;
  readonly bound = false;

  async getBalance(): Promise<never> {
    throw new ModuleUnboundError("finprov");
  }

  async getPaymentMethods() {
    return [];
  }

  async createPaymentIntent(): Promise<never> {
    throw new ModuleUnboundError("finprov");
  }

  async authorizePayment() {
    return {
      paymentId: "",
      status: "failed" as const,
      message: "Module Unbound / Awaiting Sovereign Node: finprov",
    };
  }

  async getPaymentStatus(paymentId: string) {
    return { status: "unavailable", paymentId };
  }

  async getReceipt(receiptId: string) {
    return {
      receiptId,
      summary: "Module Unbound / Awaiting Sovereign Node: finprov",
    };
  }

  buildPaymentPreview(input: {
    amount: number;
    currency: string;
    feeRate?: number;
  }): PaymentPreview {
    const feeRate = input.feeRate ?? 0.015;
    const fees = Math.round(input.amount * feeRate);
    const taxes = 0;
    const discounts = 0;
    const total = input.amount + fees + taxes - discounts;
    return {
      currency: input.currency,
      lines: [
        { label: "Subtotal", amount: input.amount, formatted: fmtPreview(input.amount, input.currency) },
        { label: "Service fee", amount: fees, formatted: fmtPreview(fees, input.currency) },
      ],
      subtotal: input.amount,
      fees,
      taxes,
      discounts,
      total,
      totalFormatted: fmtPreview(total, input.currency),
      methodLabel: "FinProv (unbound)",
    };
  }
}

/** Empty ElfCom slot — no fake chat threads. */
export class UnboundElfComMessagingProvider implements IElfComMessagingProvider {
  readonly nodeId = "elfcom" as const;
  readonly bound = false;

  async listThreads() {
    return [];
  }
  async getThread() {
    return null;
  }
  async listMessages() {
    return [];
  }
  async sendMessage(): Promise<never> {
    throw new ModuleUnboundError("elfcom");
  }
}
