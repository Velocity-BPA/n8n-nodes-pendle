/*
 * Copyright (c) Velocity BPA, LLC
 * Licensed under the Business Source License 1.1
 * Commercial use requires a separate commercial license.
 * See LICENSE file for details.
 */

/**
 * Standardized Yield (SY) token configurations for Pendle protocol
 * SY tokens are wrappers around yield-bearing assets
 */

export interface SYTokenConfig {
  address: string;
  name: string;
  symbol: string;
  underlying: string;
  underlyingSymbol: string;
  yieldSource: string;
  decimals: number;
}

// Ethereum Mainnet SY tokens
export const SY_TOKENS_ETHEREUM: Record<string, SYTokenConfig> = {
  'SY-stETH': {
    address: '0xcbC72d92b2dc8187414F6734718563898740C0BC',
    name: 'SY Lido Staked ETH',
    symbol: 'SY-stETH',
    underlying: '0xae7ab96520DE3A18E5e111B5EaAb095312D7fE84',
    underlyingSymbol: 'stETH',
    yieldSource: 'Lido',
    decimals: 18,
  },
  'SY-wstETH': {
    address: '0x2b6b8F879E7C8E2e82b7F4C65c6ce10b5c7C1E0E',
    name: 'SY Wrapped stETH',
    symbol: 'SY-wstETH',
    underlying: '0x7f39C581F595B53c5cb19bD0b3f8dA6c935E2Ca0',
    underlyingSymbol: 'wstETH',
    yieldSource: 'Lido',
    decimals: 18,
  },
  'SY-rETH': {
    address: '0xB905F7e1A77a2F4a5C8c7C5eC4eD3e9f9E5b4e3D',
    name: 'SY Rocket Pool ETH',
    symbol: 'SY-rETH',
    underlying: '0xae78736Cd615f374D3085123A210448E74Fc6393',
    underlyingSymbol: 'rETH',
    yieldSource: 'Rocket Pool',
    decimals: 18,
  },
  'SY-weETH': {
    address: '0x917ceE801a67f933F2e6b33fC0cD1ED2D5909D88',
    name: 'SY EtherFi weETH',
    symbol: 'SY-weETH',
    underlying: '0xCd5fE23C85820F7B72D0926FC9b05b43E359b7ee',
    underlyingSymbol: 'weETH',
    yieldSource: 'EtherFi',
    decimals: 18,
  },
  'SY-sUSDe': {
    address: '0xB43fb5D0B83BcCA9e7a0C7b2c3f1A1A3D8E6F5C4',
    name: 'SY Ethena sUSDe',
    symbol: 'SY-sUSDe',
    underlying: '0x9D39A5DE30e57443BfF2A8307A4256c8797A3497',
    underlyingSymbol: 'sUSDe',
    yieldSource: 'Ethena',
    decimals: 18,
  },
  'SY-aUSDC': {
    address: '0xd393D51E8B41B5b7A34E4c0E7C4D8D9f8b9F3E2A',
    name: 'SY Aave USDC',
    symbol: 'SY-aUSDC',
    underlying: '0xBcca60bB61934080951369a648Fb03DF4F96263C',
    underlyingSymbol: 'aUSDC',
    yieldSource: 'Aave',
    decimals: 6,
  },
  'SY-sDAI': {
    address: '0x83F20F44975D03b1b09e64809B757c47f942BEeA',
    name: 'SY Spark sDAI',
    symbol: 'SY-sDAI',
    underlying: '0x83F20F44975D03b1b09e64809B757c47f942BEeA',
    underlyingSymbol: 'sDAI',
    yieldSource: 'Spark',
    decimals: 18,
  },
};

// Arbitrum SY tokens
export const SY_TOKENS_ARBITRUM: Record<string, SYTokenConfig> = {
  'SY-wstETH': {
    address: '0x80c12D5b6Cc494632Bf11b03F09436c489625E4C',
    name: 'SY Wrapped stETH',
    symbol: 'SY-wstETH',
    underlying: '0x5979D7b546E38E414F7E9822514be443A4800529',
    underlyingSymbol: 'wstETH',
    yieldSource: 'Lido',
    decimals: 18,
  },
  'SY-rETH': {
    address: '0x7A5e3d5aA6B9dE8E7C1a7A4a5F1D9B3e8C5F2A1B',
    name: 'SY Rocket Pool ETH',
    symbol: 'SY-rETH',
    underlying: '0xEC70Dcb4A1EFa46b8F2D97C310C9c4790ba5ffA8',
    underlyingSymbol: 'rETH',
    yieldSource: 'Rocket Pool',
    decimals: 18,
  },
  'SY-weETH': {
    address: '0xb8b0a120F6A68Dd06209619F62429fB1a8e92feC',
    name: 'SY EtherFi weETH',
    symbol: 'SY-weETH',
    underlying: '0x35751007a407ca6FEFfE80b3cB397736D2cf4dbe',
    underlyingSymbol: 'weETH',
    yieldSource: 'EtherFi',
    decimals: 18,
  },
  'SY-GLP': {
    address: '0x7D49E5Adc0EAAD9C027857767638613253eF125f',
    name: 'SY GMX GLP',
    symbol: 'SY-GLP',
    underlying: '0x4277f8F2c384827B5273592FF7CeBd9f2C1ac258',
    underlyingSymbol: 'GLP',
    yieldSource: 'GMX',
    decimals: 18,
  },
};

// All SY tokens by chain ID
export const SY_TOKENS: Record<number, Record<string, SYTokenConfig>> = {
  1: SY_TOKENS_ETHEREUM,
  42161: SY_TOKENS_ARBITRUM,
};

// Get SY token by chain and symbol
export const getSYToken = (chainId: number, symbol: string): SYTokenConfig | undefined => {
  const chainTokens = SY_TOKENS[chainId];
  if (!chainTokens) return undefined;
  return chainTokens[symbol];
};

// Get all SY tokens for a chain
export const getSYTokensForChain = (chainId: number): SYTokenConfig[] => {
  const chainTokens = SY_TOKENS[chainId];
  if (!chainTokens) return [];
  return Object.values(chainTokens);
};

// Common yield sources
export const YIELD_SOURCES = [
  'Lido',
  'Rocket Pool',
  'EtherFi',
  'Ethena',
  'Aave',
  'Compound',
  'Spark',
  'GMX',
  'Pendle',
  'Convex',
  'Yearn',
];
