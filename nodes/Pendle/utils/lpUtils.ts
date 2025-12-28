/*
 * Copyright (c) Velocity BPA, LLC
 * Licensed under the Business Source License 1.1
 * Commercial use requires a separate commercial license.
 * See LICENSE file for details.
 */

/**
 * Utility functions for Liquidity Provider operations in Pendle protocol
 *
 * Key Concepts:
 * - LP tokens: Represent share of liquidity in a Pendle market
 * - Single-sided: Add/remove liquidity with just one token (zap)
 * - Dual-sided: Add/remove liquidity with both PT and SY
 * - Impermanent Loss: Risk from PT price changes before maturity
 */

import { FEE_CONSTANTS } from '../constants/markets';

/**
 * Calculate LP share from balance and total supply
 *
 * @param lpBalance - User's LP token balance
 * @param totalSupply - Total LP token supply
 * @returns Share as a decimal (e.g., 0.05 for 5%)
 */
export function calculateLPShare(lpBalance: bigint, totalSupply: bigint): number {
  if (totalSupply === BigInt(0)) return 0;
  return Number(lpBalance) / Number(totalSupply);
}

/**
 * Calculate LP share as percentage
 *
 * @param lpBalance - User's LP token balance
 * @param totalSupply - Total LP token supply
 * @returns Share as percentage string
 */
export function calculateLPSharePercentage(lpBalance: bigint, totalSupply: bigint): string {
  const share = calculateLPShare(lpBalance, totalSupply);
  return `${(share * 100).toFixed(4)}%`;
}

/**
 * Calculate pool composition from reserves
 *
 * @param syReserve - SY token reserve
 * @param ptReserve - PT token reserve
 * @returns Composition percentages
 */
export function calculatePoolComposition(
  syReserve: bigint,
  ptReserve: bigint,
): { syPercentage: number; ptPercentage: number } {
  const total = Number(syReserve) + Number(ptReserve);
  if (total === 0) {
    return { syPercentage: 50, ptPercentage: 50 };
  }

  return {
    syPercentage: (Number(syReserve) / total) * 100,
    ptPercentage: (Number(ptReserve) / total) * 100,
  };
}

/**
 * Calculate expected LP tokens from adding liquidity
 * Simplified calculation - actual amount may vary due to price impact
 *
 * @param syAmount - SY amount to add
 * @param ptAmount - PT amount to add
 * @param syReserve - Current SY reserve
 * @param ptReserve - Current PT reserve
 * @param totalSupply - Current LP total supply
 * @returns Expected LP tokens to receive
 */
export function calculateExpectedLPTokens(
  syAmount: bigint,
  ptAmount: bigint,
  syReserve: bigint,
  ptReserve: bigint,
  totalSupply: bigint,
): bigint {
  if (totalSupply === BigInt(0)) {
    // First LP - simplified calculation
    return BigInt(Math.floor(Math.sqrt(Number(syAmount) * Number(ptAmount))));
  }

  // Calculate based on the limiting factor
  const syRatio = (syAmount * totalSupply) / syReserve;
  const ptRatio = (ptAmount * totalSupply) / ptReserve;

  return syRatio < ptRatio ? syRatio : ptRatio;
}

/**
 * Calculate expected outputs from removing liquidity
 *
 * @param lpAmount - LP tokens to remove
 * @param syReserve - Current SY reserve
 * @param ptReserve - Current PT reserve
 * @param totalSupply - Current LP total supply
 * @returns Expected SY and PT amounts
 */
export function calculateRemoveLiquidityOutputs(
  lpAmount: bigint,
  syReserve: bigint,
  ptReserve: bigint,
  totalSupply: bigint,
): { syOut: bigint; ptOut: bigint } {
  if (totalSupply === BigInt(0)) {
    return { syOut: BigInt(0), ptOut: BigInt(0) };
  }

  return {
    syOut: (lpAmount * syReserve) / totalSupply,
    ptOut: (lpAmount * ptReserve) / totalSupply,
  };
}

/**
 * Calculate impermanent loss for LP position
 * IL occurs when PT price changes from when liquidity was added
 *
 * @param initialPtPrice - PT price when liquidity was added
 * @param currentPtPrice - Current PT price
 * @returns Impermanent loss as a percentage (negative = loss)
 */
export function calculateImpermanentLoss(
  initialPtPrice: number,
  currentPtPrice: number,
): number {
  if (initialPtPrice <= 0 || currentPtPrice <= 0) return 0;

  const priceRatio = currentPtPrice / initialPtPrice;
  const sqrtRatio = Math.sqrt(priceRatio);

  // IL formula: 2 * sqrt(priceRatio) / (1 + priceRatio) - 1
  const il = (2 * sqrtRatio) / (1 + priceRatio) - 1;

  return il * 100;
}

/**
 * Calculate trading fee earnings for LP
 *
 * @param volume24h - 24h trading volume in USD
 * @param lpShare - User's share of the pool (0-1)
 * @param feeRate - Fee rate in basis points (default: swap fee)
 * @returns Estimated 24h fee earnings in USD
 */
export function calculateFeeEarnings(
  volume24h: number,
  lpShare: number,
  feeRate: number = FEE_CONSTANTS.SWAP_FEE_BPS,
): number {
  const feePercentage = feeRate / 10000;
  return volume24h * feePercentage * lpShare;
}

/**
 * Calculate APR from trading fees
 *
 * @param volume24h - 24h trading volume in USD
 * @param tvl - Total value locked in USD
 * @param feeRate - Fee rate in basis points
 * @returns Annualized APR as percentage
 */
export function calculateFeeAPR(
  volume24h: number,
  tvl: number,
  feeRate: number = FEE_CONSTANTS.SWAP_FEE_BPS,
): number {
  if (tvl === 0) return 0;

  const dailyFees = volume24h * (feeRate / 10000);
  const dailyReturn = dailyFees / tvl;
  const annualizedReturn = dailyReturn * 365;

  return annualizedReturn * 100;
}

/**
 * Calculate optimal ratio for dual-sided liquidity
 *
 * @param syReserve - Current SY reserve
 * @param ptReserve - Current PT reserve
 * @returns Optimal PT per SY ratio
 */
export function calculateOptimalRatio(syReserve: bigint, ptReserve: bigint): number {
  if (syReserve === BigInt(0)) return 1;
  return Number(ptReserve) / Number(syReserve);
}

/**
 * Calculate required PT amount for given SY amount (dual-sided)
 *
 * @param syAmount - SY amount to add
 * @param syReserve - Current SY reserve
 * @param ptReserve - Current PT reserve
 * @returns Required PT amount
 */
export function calculateRequiredPT(
  syAmount: bigint,
  syReserve: bigint,
  ptReserve: bigint,
): bigint {
  if (syReserve === BigInt(0)) return syAmount;
  return (syAmount * ptReserve) / syReserve;
}

/**
 * Calculate required SY amount for given PT amount (dual-sided)
 *
 * @param ptAmount - PT amount to add
 * @param syReserve - Current SY reserve
 * @param ptReserve - Current PT reserve
 * @returns Required SY amount
 */
export function calculateRequiredSY(
  ptAmount: bigint,
  syReserve: bigint,
  ptReserve: bigint,
): bigint {
  if (ptReserve === BigInt(0)) return ptAmount;
  return (ptAmount * syReserve) / ptReserve;
}

/**
 * Estimate zap output for single-sided liquidity
 * This is a simplified estimate - actual output depends on market conditions
 *
 * @param inputAmount - Amount of input token
 * @param inputIsSY - True if input is SY, false if PT
 * @param syReserve - Current SY reserve
 * @param ptReserve - Current PT reserve
 * @param totalSupply - Current LP total supply
 * @returns Estimated LP tokens
 */
export function estimateZapOutput(
  inputAmount: bigint,
  inputIsSY: boolean,
  syReserve: bigint,
  ptReserve: bigint,
  totalSupply: bigint,
): bigint {
  // Simplified estimate: assume half is swapped and paired
  const halfAmount = inputAmount / BigInt(2);

  if (inputIsSY) {
    // Half SY stays, half is swapped to PT
    const estimatedPT = (halfAmount * ptReserve) / syReserve;
    return calculateExpectedLPTokens(halfAmount, estimatedPT, syReserve, ptReserve, totalSupply);
  } else {
    // Half PT stays, half is swapped to SY
    const estimatedSY = (halfAmount * syReserve) / ptReserve;
    return calculateExpectedLPTokens(estimatedSY, halfAmount, syReserve, ptReserve, totalSupply);
  }
}

/**
 * Validate liquidity amounts
 *
 * @param syAmount - SY amount
 * @param ptAmount - PT amount
 * @param minAmount - Minimum amount (in wei)
 * @returns Validation result
 */
export function validateLiquidityAmounts(
  syAmount: bigint,
  ptAmount: bigint,
  minAmount: bigint = BigInt(1000), // 1000 wei minimum
): { valid: boolean; error?: string } {
  if (syAmount < minAmount && ptAmount < minAmount) {
    return { valid: false, error: 'Amounts too small' };
  }

  if (syAmount < BigInt(0) || ptAmount < BigInt(0)) {
    return { valid: false, error: 'Amounts cannot be negative' };
  }

  return { valid: true };
}
