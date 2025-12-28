/*
 * Copyright (c) Velocity BPA, LLC
 * Licensed under the Business Source License 1.1
 * Commercial use requires a separate commercial license.
 * See LICENSE file for details.
 */

/**
 * Network configurations for Pendle protocol
 * Pendle is deployed across multiple EVM-compatible chains
 */

export interface NetworkConfig {
  chainId: number;
  name: string;
  displayName: string;
  rpcUrl: string;
  explorerUrl: string;
  pendleApiUrl: string;
  subgraphUrl: string;
  nativeCurrency: {
    name: string;
    symbol: string;
    decimals: number;
  };
}

export const NETWORKS: Record<string, NetworkConfig> = {
  ethereum: {
    chainId: 1,
    name: 'ethereum',
    displayName: 'Ethereum Mainnet',
    rpcUrl: 'https://eth.llamarpc.com',
    explorerUrl: 'https://etherscan.io',
    pendleApiUrl: 'https://api-v2.pendle.finance/core',
    subgraphUrl: 'https://api.thegraph.com/subgraphs/name/pendle-finance/pendle-v2',
    nativeCurrency: {
      name: 'Ether',
      symbol: 'ETH',
      decimals: 18,
    },
  },
  arbitrum: {
    chainId: 42161,
    name: 'arbitrum',
    displayName: 'Arbitrum One',
    rpcUrl: 'https://arb1.arbitrum.io/rpc',
    explorerUrl: 'https://arbiscan.io',
    pendleApiUrl: 'https://api-v2.pendle.finance/core',
    subgraphUrl: 'https://api.thegraph.com/subgraphs/name/pendle-finance/pendle-v2-arbitrum',
    nativeCurrency: {
      name: 'Ether',
      symbol: 'ETH',
      decimals: 18,
    },
  },
  bnb: {
    chainId: 56,
    name: 'bnb',
    displayName: 'BNB Chain',
    rpcUrl: 'https://bsc-dataseed.binance.org',
    explorerUrl: 'https://bscscan.com',
    pendleApiUrl: 'https://api-v2.pendle.finance/core',
    subgraphUrl: 'https://api.thegraph.com/subgraphs/name/pendle-finance/pendle-v2-bsc',
    nativeCurrency: {
      name: 'BNB',
      symbol: 'BNB',
      decimals: 18,
    },
  },
  optimism: {
    chainId: 10,
    name: 'optimism',
    displayName: 'Optimism',
    rpcUrl: 'https://mainnet.optimism.io',
    explorerUrl: 'https://optimistic.etherscan.io',
    pendleApiUrl: 'https://api-v2.pendle.finance/core',
    subgraphUrl: 'https://api.thegraph.com/subgraphs/name/pendle-finance/pendle-v2-optimism',
    nativeCurrency: {
      name: 'Ether',
      symbol: 'ETH',
      decimals: 18,
    },
  },
  mantle: {
    chainId: 5000,
    name: 'mantle',
    displayName: 'Mantle',
    rpcUrl: 'https://rpc.mantle.xyz',
    explorerUrl: 'https://explorer.mantle.xyz',
    pendleApiUrl: 'https://api-v2.pendle.finance/core',
    subgraphUrl: 'https://api.thegraph.com/subgraphs/name/pendle-finance/pendle-v2-mantle',
    nativeCurrency: {
      name: 'Mantle',
      symbol: 'MNT',
      decimals: 18,
    },
  },
};

export const SUPPORTED_CHAIN_IDS = Object.values(NETWORKS).map((n) => n.chainId);

export const getNetworkByChainId = (chainId: number): NetworkConfig | undefined => {
  return Object.values(NETWORKS).find((n) => n.chainId === chainId);
};

export const getNetworkByName = (name: string): NetworkConfig | undefined => {
  return NETWORKS[name.toLowerCase()];
};

export const DEFAULT_NETWORK = 'ethereum';
export const DEFAULT_CHAIN_ID = 1;
