/*
 * Copyright (c) Velocity BPA, LLC
 * Licensed under the Business Source License 1.1
 * Commercial use requires a separate commercial license.
 * See LICENSE file for details.
 */

/**
 * Oracle Client - Handles Pendle PT Oracle operations for TWAP pricing
 */

import { ethers } from 'ethers';
import { CONTRACT_ADDRESSES, PT_ORACLE_ABI, ORACLE_CONFIG } from '../constants';

export interface OracleConfig {
  chainId: number;
  provider: ethers.JsonRpcProvider;
}

export interface OracleState {
  increaseCardinalityRequired: boolean;
  cardinalityRequired: number;
  oldestObservationSatisfied: boolean;
}

export interface OracleInfo {
  marketAddress: string;
  ptToAssetRate: bigint;
  cardinality: number;
  state: OracleState;
  isReady: boolean;
}

export class OracleClient {
  private chainId: number;
  private provider: ethers.JsonRpcProvider;
  private oracleAddress: string;
  private oracle: ethers.Contract;

  constructor(config: OracleConfig) {
    this.chainId = config.chainId;
    this.provider = config.provider;

    const contracts = CONTRACT_ADDRESSES[config.chainId];
    if (!contracts) {
      throw new Error(`No contract addresses for chain ID: ${config.chainId}`);
    }

    this.oracleAddress = contracts.ptOracle;
    this.oracle = new ethers.Contract(this.oracleAddress, PT_ORACLE_ABI, this.provider);
  }

  /**
   * Get PT to asset rate from oracle (TWAP)
   *
   * @param marketAddress - Pendle market address
   * @param duration - TWAP duration in seconds (default: 15 minutes)
   * @returns PT to asset rate (scaled by 1e18)
   */
  async getPtToAssetRate(
    marketAddress: string,
    duration: number = ORACLE_CONFIG.DEFAULT_DURATION,
  ): Promise<bigint> {
    return this.oracle.getPtToAssetRate(marketAddress, duration);
  }

  /**
   * Get oracle state for a market
   *
   * @param marketAddress - Pendle market address
   * @param duration - TWAP duration in seconds
   * @returns Oracle state information
   */
  async getOracleState(
    marketAddress: string,
    duration: number = ORACLE_CONFIG.DEFAULT_DURATION,
  ): Promise<OracleState> {
    const state = await this.oracle.getOracleState(marketAddress, duration);

    return {
      increaseCardinalityRequired: state.increaseCardinalityRequired,
      cardinalityRequired: Number(state.cardinalityRequired),
      oldestObservationSatisfied: state.oldestObservationSatisfied,
    };
  }

  /**
   * Get current cardinality for a market
   *
   * @param marketAddress - Pendle market address
   * @returns Current cardinality (number of observations stored)
   */
  async getCardinality(marketAddress: string): Promise<number> {
    const cardinality = await this.oracle.getCardinality(marketAddress);
    return Number(cardinality);
  }

  /**
   * Check if oracle is ready for a given duration
   *
   * @param marketAddress - Pendle market address
   * @param duration - TWAP duration in seconds
   * @returns True if oracle has enough observations
   */
  async isOracleReady(
    marketAddress: string,
    duration: number = ORACLE_CONFIG.DEFAULT_DURATION,
  ): Promise<boolean> {
    const state = await this.getOracleState(marketAddress, duration);
    return !state.increaseCardinalityRequired && state.oldestObservationSatisfied;
  }

  /**
   * Get comprehensive oracle info for a market
   *
   * @param marketAddress - Pendle market address
   * @param duration - TWAP duration in seconds
   * @returns Complete oracle information
   */
  async getOracleInfo(
    marketAddress: string,
    duration: number = ORACLE_CONFIG.DEFAULT_DURATION,
  ): Promise<OracleInfo> {
    const [ptToAssetRate, cardinality, state] = await Promise.all([
      this.getPtToAssetRate(marketAddress, duration).catch(() => BigInt(0)),
      this.getCardinality(marketAddress),
      this.getOracleState(marketAddress, duration),
    ]);

    const isReady = !state.increaseCardinalityRequired && state.oldestObservationSatisfied;

    return {
      marketAddress,
      ptToAssetRate,
      cardinality,
      state,
      isReady,
    };
  }

  /**
   * Calculate required cardinality for a given duration
   *
   * @param duration - Desired TWAP duration in seconds
   * @param blockTime - Average block time in seconds (default: 12 for Ethereum)
   * @returns Required cardinality
   */
  calculateRequiredCardinality(duration: number, blockTime: number = 12): number {
    return Math.ceil(duration / blockTime);
  }

  /**
   * Format PT to asset rate as human-readable
   *
   * @param rate - Rate scaled by 1e18
   * @returns Rate as decimal number
   */
  formatRate(rate: bigint): number {
    return Number(rate) / 1e18;
  }

  /**
   * Get oracle address
   */
  getOracleAddress(): string {
    return this.oracleAddress;
  }

  /**
   * Validate duration parameter
   *
   * @param duration - Duration to validate
   * @returns Validated duration within bounds
   */
  validateDuration(duration: number): number {
    if (duration < ORACLE_CONFIG.MIN_DURATION) {
      return ORACLE_CONFIG.MIN_DURATION;
    }
    if (duration > ORACLE_CONFIG.MAX_DURATION) {
      return ORACLE_CONFIG.MAX_DURATION;
    }
    return duration;
  }
}

/**
 * Create a new oracle client instance
 */
export function createOracleClient(config: OracleConfig): OracleClient {
  return new OracleClient(config);
}
