import { createTokenNetworkProvider, type TokenNetworkProvider } from "@lifeos/token-network";
import { config } from "../lib/config.js";

let provider: TokenNetworkProvider | null = null;

export function getTokenNetwork(): TokenNetworkProvider {
  if (!provider) {
    provider = createTokenNetworkProvider(config.tokenNetworkProvider);
  }
  return provider;
}
