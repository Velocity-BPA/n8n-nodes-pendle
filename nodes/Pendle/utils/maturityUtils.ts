/*
 * Copyright (c) Velocity BPA, LLC
 * Licensed under the Business Source License 1.1
 * Commercial use requires a separate commercial license.
 * See LICENSE file for details.
 */

/**
 * Utility functions for handling maturity dates in Pendle protocol
 *
 * Key Concepts:
 * - Maturity: The date when PT becomes redeemable 1:1 for underlying
 * - Before maturity: PT trades at a discount, YT has value
 * - After maturity: PT is redeemable, YT becomes worthless
 */

import { TIME_CONSTANTS, VE_PENDLE_CONFIG } from '../constants/markets';

/**
 * Check if a market is expired
 *
 * @param expiryTimestamp - Unix timestamp of expiry
 * @returns True if the market is expired
 */
export function isExpired(expiryTimestamp: number): boolean {
  const now = Math.floor(Date.now() / 1000);
  return expiryTimestamp <= now;
}

/**
 * Check if a market is expiring soon (within threshold)
 *
 * @param expiryTimestamp - Unix timestamp of expiry
 * @param thresholdDays - Number of days to consider "soon" (default 7)
 * @returns True if expiring within threshold
 */
export function isExpiringSoon(expiryTimestamp: number, thresholdDays: number = 7): boolean {
  const now = Math.floor(Date.now() / 1000);
  const threshold = thresholdDays * TIME_CONSTANTS.ONE_DAY;
  const timeRemaining = expiryTimestamp - now;

  return timeRemaining > 0 && timeRemaining <= threshold;
}

/**
 * Get time remaining until maturity in human-readable format
 *
 * @param expiryTimestamp - Unix timestamp of expiry
 * @returns Human-readable time remaining
 */
export function getTimeRemainingFormatted(expiryTimestamp: number): string {
  const now = Math.floor(Date.now() / 1000);
  const secondsRemaining = expiryTimestamp - now;

  if (secondsRemaining <= 0) {
    return 'Expired';
  }

  const days = Math.floor(secondsRemaining / TIME_CONSTANTS.ONE_DAY);
  const hours = Math.floor((secondsRemaining % TIME_CONSTANTS.ONE_DAY) / TIME_CONSTANTS.ONE_HOUR);
  const minutes = Math.floor(
    (secondsRemaining % TIME_CONSTANTS.ONE_HOUR) / TIME_CONSTANTS.ONE_MINUTE,
  );

  if (days > 365) {
    const years = Math.floor(days / 365);
    const remainingDays = days % 365;
    return `${years}y ${remainingDays}d`;
  } else if (days > 30) {
    const months = Math.floor(days / 30);
    const remainingDays = days % 30;
    return `${months}mo ${remainingDays}d`;
  } else if (days > 0) {
    return `${days}d ${hours}h`;
  } else if (hours > 0) {
    return `${hours}h ${minutes}m`;
  } else {
    return `${minutes}m`;
  }
}

/**
 * Format expiry date for display
 *
 * @param expiryTimestamp - Unix timestamp of expiry
 * @returns Formatted date string
 */
export function formatExpiryDate(expiryTimestamp: number): string {
  const date = new Date(expiryTimestamp * 1000);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

/**
 * Format expiry date in ISO format
 *
 * @param expiryTimestamp - Unix timestamp of expiry
 * @returns ISO date string (YYYY-MM-DD)
 */
export function formatExpiryDateISO(expiryTimestamp: number): string {
  const date = new Date(expiryTimestamp * 1000);
  return date.toISOString().split('T')[0];
}

/**
 * Get the next Thursday (common maturity day for Pendle markets)
 *
 * @param fromDate - Starting date (default: now)
 * @returns Unix timestamp of next Thursday
 */
export function getNextThursday(fromDate?: Date): number {
  const date = fromDate ? new Date(fromDate) : new Date();
  const day = date.getUTCDay();
  const daysUntilThursday = (4 - day + 7) % 7 || 7;

  date.setUTCDate(date.getUTCDate() + daysUntilThursday);
  date.setUTCHours(0, 0, 0, 0);

  return Math.floor(date.getTime() / 1000);
}

/**
 * Round timestamp to nearest week (for vePENDLE lock)
 * vePENDLE locks must be on week boundaries
 *
 * @param timestamp - Unix timestamp to round
 * @returns Rounded timestamp
 */
export function roundToWeek(timestamp: number): number {
  const weekSeconds = VE_PENDLE_CONFIG.LOCK_INTERVAL;
  return Math.floor(timestamp / weekSeconds) * weekSeconds;
}

/**
 * Calculate the maximum lock expiry for vePENDLE
 *
 * @returns Unix timestamp of max lock expiry (2 years from now)
 */
export function getMaxLockExpiry(): number {
  const now = Math.floor(Date.now() / 1000);
  const maxLock = now + VE_PENDLE_CONFIG.MAX_LOCK_DURATION;
  return roundToWeek(maxLock);
}

/**
 * Calculate the minimum lock expiry for vePENDLE
 *
 * @returns Unix timestamp of min lock expiry (1 week from now)
 */
export function getMinLockExpiry(): number {
  const now = Math.floor(Date.now() / 1000);
  const minLock = now + VE_PENDLE_CONFIG.MIN_LOCK_DURATION;
  return roundToWeek(minLock);
}

/**
 * Validate lock expiry for vePENDLE
 *
 * @param expiry - Proposed lock expiry timestamp
 * @returns Validation result with error message if invalid
 */
export function validateLockExpiry(expiry: number): { valid: boolean; error?: string } {
  const now = Math.floor(Date.now() / 1000);
  const minExpiry = getMinLockExpiry();
  const maxExpiry = getMaxLockExpiry();

  if (expiry <= now) {
    return { valid: false, error: 'Lock expiry must be in the future' };
  }

  if (expiry < minExpiry) {
    return { valid: false, error: 'Lock duration must be at least 1 week' };
  }

  if (expiry > maxExpiry) {
    return { valid: false, error: 'Lock duration cannot exceed 2 years' };
  }

  if (expiry % VE_PENDLE_CONFIG.LOCK_INTERVAL !== 0) {
    return { valid: false, error: 'Lock expiry must be on a week boundary' };
  }

  return { valid: true };
}

/**
 * Get maturity status category
 *
 * @param expiryTimestamp - Unix timestamp of expiry
 * @returns Status category
 */
export function getMaturityStatus(
  expiryTimestamp: number,
): 'expired' | 'expiring-soon' | 'active' | 'long-term' {
  if (isExpired(expiryTimestamp)) {
    return 'expired';
  }

  const now = Math.floor(Date.now() / 1000);
  const daysRemaining = (expiryTimestamp - now) / TIME_CONSTANTS.ONE_DAY;

  if (daysRemaining <= 7) {
    return 'expiring-soon';
  } else if (daysRemaining <= 90) {
    return 'active';
  } else {
    return 'long-term';
  }
}

/**
 * Sort markets by expiry date
 *
 * @param markets - Array of markets with expiry property
 * @param ascending - Sort order (default: true for soonest first)
 * @returns Sorted array
 */
export function sortByExpiry<T extends { expiry: number }>(
  markets: T[],
  ascending: boolean = true,
): T[] {
  return [...markets].sort((a, b) => {
    return ascending ? a.expiry - b.expiry : b.expiry - a.expiry;
  });
}

/**
 * Filter markets by expiry range
 *
 * @param markets - Array of markets with expiry property
 * @param minDays - Minimum days to maturity (default: 0)
 * @param maxDays - Maximum days to maturity (optional)
 * @returns Filtered array
 */
export function filterByMaturityRange<T extends { expiry: number }>(
  markets: T[],
  minDays: number = 0,
  maxDays?: number,
): T[] {
  const now = Math.floor(Date.now() / 1000);
  const minExpiry = now + minDays * TIME_CONSTANTS.ONE_DAY;
  const maxExpiry = maxDays ? now + maxDays * TIME_CONSTANTS.ONE_DAY : Infinity;

  return markets.filter((m) => m.expiry >= minExpiry && m.expiry <= maxExpiry);
}

/**
 * Group markets by maturity quarter
 *
 * @param markets - Array of markets with expiry property
 * @returns Grouped markets by quarter (e.g., "2024-Q1")
 */
export function groupByQuarter<T extends { expiry: number }>(markets: T[]): Record<string, T[]> {
  const groups: Record<string, T[]> = {};

  for (const market of markets) {
    const date = new Date(market.expiry * 1000);
    const year = date.getFullYear();
    const quarter = Math.ceil((date.getMonth() + 1) / 3);
    const key = `${year}-Q${quarter}`;

    if (!groups[key]) {
      groups[key] = [];
    }
    groups[key].push(market);
  }

  return groups;
}
