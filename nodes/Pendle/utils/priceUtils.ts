/*
 * Copyright (c) Velocity BPA, LLC
 * Licensed under the Business Source License 1.1
 * Commercial use requires a separate commercial license.
 * See LICENSE file for details.
 */

/**
 * Utility functions for price calculations and formatting in Pendle protocol
 */

import { ethers } from 'ethers';

/**
 * Format token amount from wei to human-readable
 *
 * @param amount - Amount in wei (as bigint or string)
 * @param decimals - Token decimals (default: 18)
 * @param displayDecimals - Number of decimals to display (default: 6)
 * @returns Formatted string
 */
export function formatTokenAmount(
  amount: bigint | string,
  decimals: number = 18,
  displayDecimals: number = 6,
): string {
  const formatted = ethers.formatUnits(amount.toString(), decimals);
  const num = parseFloat(formatted);

  if (num === 0) return '0';
  if (num < 0.000001) return '<0.000001';

  return num.toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: displayDecimals,
  });
}

/**
 * Parse human-readable amount to wei
 *
 * @param amount - Human-readable amount
 * @param decimals - Token decimals (default: 18)
 * @returns BigInt amount in wei
 */
export function parseTokenAmount(amount: string | number, decimals: number = 18): bigint {
  return ethers.parseUnits(amount.toString(), decimals);
}

/**
 * Calculate price impact for a trade
 *
 * @param expectedPrice - Expected price before trade
 * @param actualPrice - Actual price after trade
 * @returns Price impact as a percentage (negative means unfavorable)
 */
export function calculatePriceImpact(expectedPrice: number, actualPrice: number): number {
  if (expectedPrice === 0) return 0;
  return ((actualPrice - expectedPrice) / expectedPrice) * 100;
}

/**
 * Format price impact for display
 *
 * @param priceImpact - Price impact as a percentage
 * @returns Formatted string with color indicator
 */
export function formatPriceImpact(priceImpact: number): {
  value: string;
  severity: 'low' | 'medium' | 'high' | 'very-high';
} {
  const absImpact = Math.abs(priceImpact);
  let severity: 'low' | 'medium' | 'high' | 'very-high';

  if (absImpact < 0.1) {
    severity = 'low';
  } else if (absImpact < 0.5) {
    severity = 'medium';
  } else if (absImpact < 1) {
    severity = 'high';
  } else {
    severity = 'very-high';
  }

  const sign = priceImpact >= 0 ? '+' : '';
  return {
    value: `${sign}${priceImpact.toFixed(2)}%`,
    severity,
  };
}

/**
 * Calculate minimum output with slippage
 *
 * @param expectedOutput - Expected output amount
 * @param slippagePercent - Slippage tolerance as percentage (e.g., 0.5 for 0.5%)
 * @returns Minimum acceptable output
 */
export function calculateMinOutput(expectedOutput: bigint, slippagePercent: number): bigint {
  const slippageBps = BigInt(Math.floor(slippagePercent * 100));
  const basisPoints = BigInt(10000);
  return (expectedOutput * (basisPoints - slippageBps)) / basisPoints;
}

/**
 * Calculate maximum input with slippage
 *
 * @param expectedInput - Expected input amount
 * @param slippagePercent - Slippage tolerance as percentage
 * @returns Maximum acceptable input
 */
export function calculateMaxInput(expectedInput: bigint, slippagePercent: number): bigint {
  const slippageBps = BigInt(Math.floor(slippagePercent * 100));
  const basisPoints = BigInt(10000);
  return (expectedInput * (basisPoints + slippageBps)) / basisPoints;
}

/**
 * Format USD value
 *
 * @param value - Value in USD
 * @param compact - Use compact notation for large values
 * @returns Formatted string
 */
export function formatUSD(value: number, compact: boolean = false): string {
  if (compact && value >= 1000000) {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      notation: 'compact',
      maximumFractionDigits: 2,
    }).format(value);
  }

  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

/**
 * Format large numbers with abbreviations
 *
 * @param value - Number to format
 * @returns Formatted string (e.g., "1.5M", "2.3B")
 */
export function formatCompactNumber(value: number): string {
  return new Intl.NumberFormat('en-US', {
    notation: 'compact',
    maximumFractionDigits: 2,
  }).format(value);
}

/**
 * Convert exchange rate to readable ratio
 *
 * @param rate - Exchange rate (scaled by 1e18)
 * @returns Human-readable rate
 */
export function parseExchangeRate(rate: bigint | string): number {
  return Number(BigInt(rate)) / 1e18;
}

/**
 * Calculate LP token value
 *
 * @param lpBalance - LP token balance
 * @param totalSupply - Total LP supply
 * @param syReserve - SY reserve in the pool
 * @param ptReserve - PT reserve in the pool
 * @param syPrice - Price of SY in USD
 * @param ptPrice - Price of PT in USD
 * @returns LP token value in USD
 */
export function calculateLPValue(
  lpBalance: bigint,
  totalSupply: bigint,
  syReserve: bigint,
  ptReserve: bigint,
  syPrice: number,
  ptPrice: number,
): number {
  if (totalSupply === BigInt(0)) return 0;

  const share = Number(lpBalance) / Number(totalSupply);
  const syValue = Number(syReserve) * syPrice;
  const ptValue = Number(ptReserve) * ptPrice;
  const totalPoolValue = (syValue + ptValue) / 1e18;

  return totalPoolValue * share;
}

/**
 * Calculate exchange rate between two amounts
 *
 * @param inputAmount - Input amount
 * @param outputAmount - Output amount
 * @returns Exchange rate (output per input)
 */
export function calculateExchangeRate(inputAmount: bigint, outputAmount: bigint): number {
  if (inputAmount === BigInt(0)) return 0;
  return Number(outputAmount) / Number(inputAmount);
}

/**
 * Validate Ethereum address
 *
 * @param address - Address to validate
 * @returns True if valid
 */
export function isValidAddress(address: string): boolean {
  return ethers.isAddress(address);
}

/**
 * Checksum an Ethereum address
 *
 * @param address - Address to checksum
 * @returns Checksummed address
 */
export function checksumAddress(address: string): string {
  return ethers.getAddress(address);
}

/**
 * Truncate address for display
 *
 * @param address - Full address
 * @param startChars - Characters to show at start (default: 6)
 * @param endChars - Characters to show at end (default: 4)
 * @returns Truncated address
 */
export function truncateAddress(
  address: string,
  startChars: number = 6,
  endChars: number = 4,
): string {
  if (!address || address.length < startChars + endChars + 3) {
    return address;
  }
  return `${address.slice(0, startChars)}...${address.slice(-endChars)}`;
}

/**
 * Calculate basis points from percentage
 *
 * @param percentage - Percentage value (e.g., 0.5 for 0.5%)
 * @returns Basis points (e.g., 50)
 */
export function percentageToBps(percentage: number): number {
  return Math.floor(percentage * 100);
}

/**
 * Calculate percentage from basis points
 *
 * @param bps - Basis points (e.g., 50)
 * @returns Percentage (e.g., 0.5)
 */
export function bpsToPercentage(bps: number): number {
  return bps / 100;
}
