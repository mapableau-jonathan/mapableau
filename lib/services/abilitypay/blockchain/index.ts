/**
 * Blockchain Adapter Factory
 * Creates and returns the appropriate blockchain adapter based on configuration
 */

import type { BlockchainAdapter, BlockchainProvider, BlockchainAdapterConfig } from "../types";
import { MockBlockchainAdapter } from "./mock-adapter";
import { EthereumBlockchainAdapter } from "./ethereum-adapter";
import { HyperledgerBlockchainAdapter } from "./hyperledger-adapter";
import { PolygonBlockchainAdapter } from "./polygon-adapter";

export function createBlockchainAdapter(
  config: BlockchainAdapterConfig
): BlockchainAdapter {
  switch (config.provider) {
    case "mock":
      return new MockBlockchainAdapter();

    case "ethereum":
      if (!config.networkUrl) {
        throw new Error("Ethereum adapter requires networkUrl");
      }
      return new EthereumBlockchainAdapter({
        networkUrl: config.networkUrl,
        privateKey: config.privateKey,
        contractAddress: config.contractAddress,
      });

    case "hyperledger":
      if (!config.networkConfig || !config.wallet) {
        throw new Error(
          "Hyperledger adapter requires networkConfig and wallet"
        );
      }
      return new HyperledgerBlockchainAdapter({
        networkConfig: config.networkConfig,
        wallet: config.wallet,
        gateway: config.gateway,
      });

    case "polygon":
      if (!config.networkUrl) {
        throw new Error("Polygon adapter requires networkUrl");
      }
      return new PolygonBlockchainAdapter({
        networkUrl: config.networkUrl,
        privateKey: config.privateKey,
        contractAddress: config.contractAddress,
      });

    default:
      throw new Error(`Unsupported blockchain provider: ${config.provider}`);
  }
}

export type { BlockchainAdapter } from "./adapter";
export type { BlockchainAdapterConfig, BlockchainProvider } from "../types";
export { MockBlockchainAdapter } from "./mock-adapter";
export { EthereumBlockchainAdapter } from "./ethereum-adapter";
export { HyperledgerBlockchainAdapter } from "./hyperledger-adapter";
export { PolygonBlockchainAdapter } from "./polygon-adapter";
