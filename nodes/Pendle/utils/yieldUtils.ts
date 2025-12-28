/*
 * Copyright (c) Velocity BPA, LLC
 * Licensed under the Business Source License 1.1
 * Commercial use requires a separate commercial license.
 * See LICENSE file for details.
 */

/**
 * Utility functions for yield calculations in Pendle protocol
 *
 * Key Concepts:
 * - Implied APY: The yield rate implied by market prices (PT discount)
 * - Underlying APY: The base yield rate of the underlying asset
 * - Fixed Yield: The guaranteed yield from holding PT to maturity
 * - Yield Leverage: The amplified yield from holding YT
 */

import { APY_CONSTANTS, TIME_CONSTANTS } from '../constants/markets';

/**
 * Calculate implied APY from PT price and time to maturity
 * Formula: impliedAPY = ((1 / ptPrice) ^ (365 / daysToMaturity) - 1) * 100
 *
 * @param ptPrice - Current PT price (as a ratio, e.g., 0.95 for 5% discount)
 * @param daysToMaturity - Days until the PT matures
 * @returns The implied APY as a percentage
 */
export function calculateImpliedAPY(ptPrice: number, daysToMaturity: number): number {
  if (ptPrice <= 0 || ptPrice > 1) {
    throw new Error('PT price must be between 0 and 1');
  }
  if (daysToMaturity <= 0) {
    return 0; // Expired market
  }

  const yearsToMaturity = daysToMaturity / 365;
  const impliedAPY = (Math.pow(1 / ptPrice, 1 / yearsToMaturity) - 1) * 100;

  // Sanity check
  if (impliedAPY > APY_CONSTANTS.MAX_APY || impliedAPY < APY_CONSTANTS.MIN_APY) {
    throw new Error(`Calculated APY ${impliedAPY}% is outside reasonable bounds`);
  }

  return impliedAPY;
}

/**
 * Calculate fixed yield from buying PT at current price
 * This is the guaranteed return if holding PT to maturity
 *
 * @param ptPrice - Current PT price (as a ratio)
 * @returns The fixed yield as a percentage
 */
export function calculateFixedYield(ptPrice: number): number {
  if (ptPrice <= 0 || ptPrice > 1) {
    throw new Error('PT price must be between 0 and 1');
  }

  return ((1 - ptPrice) / ptPrice) * 100;
}

/**
 * Calculate PT price from target APY and maturity
 *
 * @param targetAPY - Desired APY as a percentage
 * @param daysToMaturity - Days until maturity
 * @returns The PT price that would give the target APY
 */
export function calculatePTPrice(targetAPY: number, daysToMaturity: number): number {
  if (daysToMaturity <= 0) {
    return 1; // At maturity, PT = 1:1 with underlying
  }

  const yearsToMaturity = daysToMaturity / 365;
  const apyDecimal = targetAPY / 100;
  const ptPrice = 1 / Math.pow(1 + apyDecimal, yearsToMaturity);

  return Math.max(0, Math.min(1, ptPrice));
}

/**
 * Calculate yield leverage for YT
 * YT holders receive the variable yield on the underlying, amplified by the leverage
 * Leverage = 1 / ytPrice (when YT is cheap, leverage is high)
 *
 * @param ytPrice - Current YT price (as a ratio of underlying)
 * @param underlyingAPY - The APY of the underlying asset
 * @returns The effective yield considering leverage
 */
export function calculateYTLeverage(ytPrice: number): number {
  if (ytPrice <= 0) {
    throw new Error('YT price must be greater than 0');
  }

  return 1 / ytPrice;
}

/**
 * Calculate effective YT yield (variable yield with leverage)
 *
 * @param ytPrice - Current YT price (as a ratio)
 * @param underlyingAPY - The APY of the underlying asset
 * @returns The effective APY for YT holders
 */
export function calculateYTEffectiveYield(ytPrice: number, underlyingAPY: number): number {
  const leverage = calculateYTLeverage(ytPrice);
  return underlyingAPY * leverage;
}

/**
 * Calculate days to maturity from expiry timestamp
 *
 * @param expiryTimestamp - Unix timestamp of maturity
 * @returns Days until maturity (can be negative if expired)
 */
export function calculateDaysToMaturity(expiryTimestamp: number): number {
  const now = Math.floor(Date.now() / 1000);
  const secondsToMaturity = expiryTimestamp - now;
  return secondsToMaturity / TIME_CONSTANTS.ONE_DAY;
}

/**
 * Calculate time to maturity in various units
 *
 * @param expiryTimestamp - Unix timestamp of maturity
 * @returns Object with time in different units
 */
export function calculateTimeToMaturity(expiryTimestamp: number): {
  seconds: number;
  minutes: number;
  hours: number;
  days: number;
  weeks: number;
  isExpired: boolean;
} {
  const now = Math.floor(Date.now() / 1000);
  const seconds = expiryTimestamp - now;

  return {
    seconds,
    minutes: seconds / TIME_CONSTANTS.ONE_MINUTE,
    hours: seconds / TIME_CONSTANTS.ONE_HOUR,
    days: seconds / TIME_CONSTANTS.ONE_DAY,
    weeks: seconds / TIME_CONSTANTS.ONE_WEEK,
    isExpired: seconds <= 0,
  };
}

/**
 * Calculate PT discount from market price
 *
 * @param ptPrice - Current PT price
 * @returns Discount as a percentage (e.g., 5 for 5% discount)
 */
export function calculatePTDiscount(ptPrice: number): number {
  if (ptPrice <= 0 || ptPrice > 1) {
    throw new Error('PT price must be between 0 and 1');
  }

  return (1 - ptPrice) * 100;
}

/**
 * Calculate LP APY from multiple sources
 * LP APY = Trading Fees APY + Incentive APY + Underlying APY
 *
 * @param tradingFeesAPY - APY from trading fees
 * @param incentiveAPY - APY from PENDLE incentives
 * @param underlyingAPY - APY from underlying yield
 * @param boostMultiplier - vePENDLE boost (1 to 2.5)
 * @returns Total LP APY
 */
export function calculateLPAPY(
  tradingFeesAPY: number,
  incentiveAPY: number,
  underlyingAPY: number,
  boostMultiplier: number = 1,
): number {
  const boostedIncentiveAPY = incentiveAPY * Math.min(boostMultiplier, 2.5);
  return tradingFeesAPY + boostedIncentiveAPY + underlyingAPY;
}

/**
 * Calculate vePENDLE voting power
 * vePENDLE decays linearly over time until lock expiry
 *
 * @param lockedAmount - Amount of PENDLE locked
 * @param lockExpiry - Unix timestamp of lock expiry
 * @param maxLockDuration - Maximum lock duration in seconds (default 2 years)
 * @returns Current voting power
 */
export function calculateVePendleBalance(
  lockedAmount: number,
  lockExpiry: number,
  maxLockDuration: number = 2 * TIME_CONSTANTS.ONE_YEAR,
): number {
  const now = Math.floor(Date.now() / 1000);
  const timeRemaining = lockExpiry - now;

  if (timeRemaining <= 0) {
    return 0;
  }

  const decayRatio = timeRemaining / maxLockDuration;
  return lockedAmount * decayRatio;
}

/**
 * Format APY for display
 *
 * @param apy - APY as a number (e.g., 5.25 for 5.25%)
 * @param decimals - Number of decimal places (default 2)
 * @returns Formatted string (e.g., "5.25%")
 */
export function formatAPY(apy: number, decimals: number = 2): string {
  return `${apy.toFixed(decimals)}%`;
}

/**
 * Parse ln implied rate from contract to APY
 * Pendle contracts store rates as ln(1 + r) scaled by 1e18
 *
 * @param lnImpliedRate - The ln implied rate from contract (as bigint or string)
 * @returns APY as a percentage
 */
export function parseLnImpliedRate(lnImpliedRate: bigint | string): number {
  const lnRate = Number(BigInt(lnImpliedRate)) / 1e18;
  const rate = Math.exp(lnRate) - 1;
  return rate * 100;
}

/**
 * Convert APY to ln implied rate for contract calls
 *
 * @param apy - APY as a percentage
 * @returns ln implied rate scaled by 1e18
 */
export function apyToLnImpliedRate(apy: number): bigint {
  const rate = apy / 100;
  const lnRate = Math.log(1 + rate);
  return BigInt(Math.floor(lnRate * 1e18));
}
