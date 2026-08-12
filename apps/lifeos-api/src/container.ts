import type { IDataZoneStorageProvider } from "./ports/datazone.js";
import type { IElfComMessagingProvider } from "./ports/elfcom.js";
import type {
  IFinProvFiatProvider,
  IFinProvLedgerProvider,
  IFinProvPaymentProvider,
} from "./ports/finprov.js";
import {
  UnboundDataZoneStorageProvider,
  UnboundElfComMessagingProvider,
  UnboundFinProvFiatProvider,
  UnboundFinProvLedgerProvider,
  UnboundFinProvPaymentProvider,
} from "./ports/unbound.js";

export type SovereignNodeId = "datazone" | "finprov" | "elfcom";

export type SovereignBindingStatus = {
  nodeId: SovereignNodeId;
  bound: boolean;
  status: "bound" | "unbound";
  message: string;
};

/**
 * LifeOS dependency injection registry for sovereign nodes.
 * Boot with unbound slots; call bind* when a real adapter is ready.
 */
class LifeOsContainer {
  private datazone: IDataZoneStorageProvider = new UnboundDataZoneStorageProvider();
  private finprovLedger: IFinProvLedgerProvider = new UnboundFinProvLedgerProvider();
  private finprovFiat: IFinProvFiatProvider = new UnboundFinProvFiatProvider();
  private finprovPayment: IFinProvPaymentProvider = new UnboundFinProvPaymentProvider();
  private elfcom: IElfComMessagingProvider = new UnboundElfComMessagingProvider();
  private booted = false;

  boot() {
    if (this.booted) return this.status();
    this.booted = true;
    const statuses = this.status();
    for (const s of statuses) {
      if (!s.bound) {
        console.info(`[lifeos] ${s.message}`);
      } else {
        console.info(`[lifeos] Module bound: ${s.nodeId}`);
      }
    }
    return statuses;
  }

  status(): SovereignBindingStatus[] {
    return [
      this.describe("datazone", this.datazone.bound),
      this.describe("finprov", this.finprovLedger.bound && this.finprovPayment.bound),
      this.describe("elfcom", this.elfcom.bound),
    ];
  }

  private describe(nodeId: SovereignNodeId, bound: boolean): SovereignBindingStatus {
    return {
      nodeId,
      bound,
      status: bound ? "bound" : "unbound",
      message: bound
        ? `Module bound: ${nodeId}`
        : `Module Unbound / Awaiting Sovereign Node: ${nodeId}`,
    };
  }

  getDataZone(): IDataZoneStorageProvider {
    return this.datazone;
  }
  bindDataZone(adapter: IDataZoneStorageProvider) {
    this.datazone = adapter;
  }

  getFinProvLedger(): IFinProvLedgerProvider {
    return this.finprovLedger;
  }
  bindFinProvLedger(adapter: IFinProvLedgerProvider) {
    this.finprovLedger = adapter;
  }

  getFinProvFiat(): IFinProvFiatProvider {
    return this.finprovFiat;
  }
  bindFinProvFiat(adapter: IFinProvFiatProvider) {
    this.finprovFiat = adapter;
  }

  getFinProvPayment(): IFinProvPaymentProvider {
    return this.finprovPayment;
  }
  bindFinProvPayment(adapter: IFinProvPaymentProvider) {
    this.finprovPayment = adapter;
  }

  getElfCom(): IElfComMessagingProvider {
    return this.elfcom;
  }
  bindElfCom(adapter: IElfComMessagingProvider) {
    this.elfcom = adapter;
  }
}

export const container = new LifeOsContainer();
