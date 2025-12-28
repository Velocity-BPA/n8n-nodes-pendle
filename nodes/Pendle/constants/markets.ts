/*
 * Copyright (c) Velocity BPA, LLC
 * Licensed under the Business Source License 1.1
 * Commercial use requires a separate commercial license.
 * See LICENSE file for details.
 */

/**
 * Market-related constants and types for Pendle protocol
 */

export interface MarketInfo {
  address: string;
  name: string;
  symbol: string;
  expiry: number;
  pt: string;
  yt: string;
  sy: string;
  underlying: string;
  underlyingSymbol: string;
}

// Market status enum
export enum MarketStatus {
  ACTIVE = 'active',
  EXPIRED = 'expired',
  PENDING = 'pending',
}

// Market types based on underlying asset
export enum MarketType {
  LST = 'lst', // Liquid Staking Tokens (stETH, rETH, etc.)
  LRT = 'lrt', // Liquid Restaking Tokens (weETH, etc.)
  STABLE = 'stable', // Stablecoins
  NATIVE = 'native', // Native ETH
  OTHER = 'other',
}

// Time constants (in seconds)
export const TIME_CONSTANTS = {
  ONE_MINUTE: 60,
  ONE_HOUR: 3600,
  ONE_DAY: 86400,
  ONE_WEEK: 604800,
  ONE_MONTH: 2592000,
  ONE_YEAR: 31536000,
};

// APY calculation constants
export const APY_CONSTANTS = {
  SECONDS_PER_YEAR: 31536000,
  BASIS_POINTS: 10000,
  PERCENTAGE: 100,
  MAX_APY: 1000, // 1000% max for sanity check
  MIN_APY: -100, // -100% min for sanity check
};

// Slippage settings
export const SLIPPAGE_DEFAULTS = {
  LOW: 0.1, // 0.1%
  MEDIUM: 0.5, // 0.5%
  HIGH: 1.0, // 1.0%
  VERY_HIGH: 3.0, // 3.0%
  DEFAULT: 0.5,
};

// Deadline constants
export const DEADLINE_DEFAULTS = {
  SHORT: 300, // 5 minutes
  MEDIUM: 1200, // 20 minutes
  LONG: 3600, // 1 hour
  DEFAULT: 1200,
};

// Pendle API endpoints
export const PENDLE_API_ENDPOINTS = {
  MARKETS: '/v1/markets',
  MARKET_DATA: '/v1/markets/:chainId/:marketAddress',
  ASSETS: '/v1/assets',
  STATISTICS: '/v1/statistics',
  YIELDS: '/v1/yields',
  LIMIT_ORDERS: '/v1/limit-orders',
  ROUTES: '/v1/routes',
  SWAPS: '/v1/swaps',
  LIQUIDITY: '/v1/liquidity',
};

// Subgraph query limits
export const SUBGRAPH_LIMITS = {
  DEFAULT_FIRST: 100,
  MAX_FIRST: 1000,
  DEFAULT_SKIP: 0,
};

// Oracle configuration
export const ORACLE_CONFIG = {
  DEFAULT_DURATION: 900, // 15 minutes
  MIN_DURATION: 60, // 1 minute
  MAX_DURATION: 86400, // 24 hours
  MIN_CARDINALITY: 144, // ~24 hours at 10 min blocks
};

// Voting epochs
export const VOTING_CONFIG = {
  EPOCH_DURATION: 604800, // 1 week
  MAX_POOLS_PER_VOTE: 10,
  MAX_WEIGHT: 10000, // 100% in basis points
};

// vePENDLE lock configuration
export const VE_PENDLE_CONFIG = {
  MIN_LOCK_DURATION: 604800, // 1 week
  MAX_LOCK_DURATION: 104 * 604800, // 2 years (104 weeks)
  LOCK_INTERVAL: 604800, // Must be multiple of 1 week
};

// Fee constants
export const FEE_CONSTANTS = {
  SWAP_FEE_BPS: 10, // 0.1% typical swap fee
  PROTOCOL_FEE_BPS: 300, // 3% protocol fee on yield
  MAX_FEE_BPS: 1000, // 10% max fee
};
