/*
 * Copyright (c) Velocity BPA, LLC
 * Licensed under the Business Source License 1.1
 * Commercial use requires a separate commercial license.
 * See LICENSE file for details.
 */

/**
 * Router Client - Handles Pendle router operations for swaps, minting, and liquidity
 */

import { ethers } from 'ethers';
import {
  CONTRACT_ADDRESSES,
  PENDLE_ROUTER_ABI,
  PENDLE_ROUTER_STATIC_ABI,
  SLIPPAGE_DEFAULTS,
  DEADLINE_DEFAULTS,
} from '../constants';

export interface RouterConfig {
  chainId: number;
  provider: ethers.JsonRpcProvider;
  signer?: ethers.Wallet;
}

export interface TokenInput {
  tokenIn: string;
  netTokenIn: bigint;
  tokenMintSy: string;
  pendleSwap: string;
  swapData: {
    swapType: number;
    extRouter: string;
    extCalldata: string;
    needScale: boolean;
  };
}

export interface TokenOutput {
  tokenOut: string;
  minTokenOut: bigint;
  tokenRedeemSy: string;
  pendleSwap: string;
  swapData: {
    swapType: number;
    extRouter: string;
    extCalldata: string;
    needScale: boolean;
  };
}

export interface ApproxParams {
  guessMin: bigint;
  guessMax: bigint;
  guessOffchain: bigint;
  maxIteration: bigint;
  eps: bigint;
}

export interface LimitOrderData {
  limitRouter: string;
  epsSkipMarket: bigint;
  normalFills: { order: string; signature: string; makingAmount: bigint }[];
  flashFills: { order: string; signature: string; makingAmount: bigint }[];
  optData: string;
}

export interface SwapResult {
  netOut: bigint;
  netSyFee: bigint;
  netSyInterm: bigint;
  transactionHash?: string;
}

export interface LiquidityResult {
  netLpOut: bigint;
  netSyFee?: bigint;
  transactionHash?: string;
}

export class RouterClient {
  private chainId: number;
  private provider: ethers.JsonRpcProvider;
  private signer?: ethers.Wallet;
  private routerAddress: string;
  private routerStaticAddress: string;
  private router: ethers.Contract;
  private routerStatic: ethers.Contract;

  constructor(config: RouterConfig) {
    this.chainId = config.chainId;
    this.provider = config.provider;
    this.signer = config.signer;

    const contracts = CONTRACT_ADDRESSES[config.chainId];
    if (!contracts) {
      throw new Error(`No contract addresses for chain ID: ${config.chainId}`);
    }

    this.routerAddress = contracts.router;
    this.routerStaticAddress = contracts.routerStatic;

    this.router = new ethers.Contract(
      this.routerAddress,
      PENDLE_ROUTER_ABI,
      this.signer || this.provider,
    );

    this.routerStatic = new ethers.Contract(
      this.routerStaticAddress,
      PENDLE_ROUTER_STATIC_ABI,
      this.provider,
    );
  }

  // ============ Static Query Methods ============

  /**
   * Get static quote for swapping token to PT
   */
  async getSwapTokenForPtStatic(
    marketAddress: string,
    tokenIn: string,
    netTokenIn: bigint,
  ): Promise<{
    netPtOut: bigint;
    netSyToSwap: bigint;
    netSyFee: bigint;
    priceImpact: number;
    exchangeRateAfter: bigint;
    netSyFromToken: bigint;
  }> {
    const result = await this.routerStatic.swapExactTokenForPtStatic(
      marketAddress,
      tokenIn,
      netTokenIn,
    );

    return {
      netPtOut: result.netPtOut,
      netSyToSwap: result.netSyToSwap,
      netSyFee: result.netSyFee,
      priceImpact: Number(result.priceImpact) / 1e18,
      exchangeRateAfter: result.exchangeRateAfter,
      netSyFromToken: result.netSyFromToken,
    };
  }

  /**
   * Get static quote for swapping PT to token
   */
  async getSwapPtForTokenStatic(
    marketAddress: string,
    exactPtIn: bigint,
    tokenOut: string,
  ): Promise<{
    netTokenOut: bigint;
    netSyToToken: bigint;
    netSyFee: bigint;
    priceImpact: number;
    exchangeRateAfter: bigint;
  }> {
    const result = await this.routerStatic.swapExactPtForTokenStatic(
      marketAddress,
      exactPtIn,
      tokenOut,
    );

    return {
      netTokenOut: result.netTokenOut,
      netSyToToken: result.netSyToToken,
      netSyFee: result.netSyFee,
      priceImpact: Number(result.priceImpact) / 1e18,
      exchangeRateAfter: result.exchangeRateAfter,
    };
  }

  /**
   * Get static quote for swapping token to YT
   */
  async getSwapTokenForYtStatic(
    marketAddress: string,
    tokenIn: string,
    netTokenIn: bigint,
  ): Promise<{
    netYtOut: bigint;
    netSyToSwap: bigint;
    netSyFee: bigint;
    priceImpact: number;
    exchangeRateAfter: bigint;
    netSyFromToken: bigint;
  }> {
    const result = await this.routerStatic.swapExactTokenForYtStatic(
      marketAddress,
      tokenIn,
      netTokenIn,
    );

    return {
      netYtOut: result.netYtOut,
      netSyToSwap: result.netSyToSwap,
      netSyFee: result.netSyFee,
      priceImpact: Number(result.priceImpact) / 1e18,
      exchangeRateAfter: result.exchangeRateAfter,
      netSyFromToken: result.netSyFromToken,
    };
  }

  /**
   * Get static quote for swapping YT to token
   */
  async getSwapYtForTokenStatic(
    marketAddress: string,
    exactYtIn: bigint,
    tokenOut: string,
  ): Promise<{
    netTokenOut: bigint;
    netSyToToken: bigint;
    netSyFee: bigint;
    priceImpact: number;
    exchangeRateAfter: bigint;
  }> {
    const result = await this.routerStatic.swapExactYtForTokenStatic(
      marketAddress,
      exactYtIn,
      tokenOut,
    );

    return {
      netTokenOut: result.netTokenOut,
      netSyToToken: result.netSyToToken,
      netSyFee: result.netSyFee,
      priceImpact: Number(result.priceImpact) / 1e18,
      exchangeRateAfter: result.exchangeRateAfter,
    };
  }

  /**
   * Get static quote for adding single-sided liquidity
   */
  async getAddLiquiditySingleTokenStatic(
    marketAddress: string,
    tokenIn: string,
    netTokenIn: bigint,
  ): Promise<{
    netLpOut: bigint;
    netPtFromSwap: bigint;
    netSyFee: bigint;
    priceImpact: number;
    exchangeRateAfter: bigint;
    netSyFromToken: bigint;
    netSyToSwap: bigint;
  }> {
    const result = await this.routerStatic.addLiquiditySingleTokenStatic(
      marketAddress,
      tokenIn,
      netTokenIn,
    );

    return {
      netLpOut: result.netLpOut,
      netPtFromSwap: result.netPtFromSwap,
      netSyFee: result.netSyFee,
      priceImpact: Number(result.priceImpact) / 1e18,
      exchangeRateAfter: result.exchangeRateAfter,
      netSyFromToken: result.netSyFromToken,
      netSyToSwap: result.netSyToSwap,
    };
  }

  /**
   * Get static quote for removing single-sided liquidity
   */
  async getRemoveLiquiditySingleTokenStatic(
    marketAddress: string,
    tokenOut: string,
    netLpIn: bigint,
  ): Promise<{
    netTokenOut: bigint;
    netSyFromBurn: bigint;
    netPtFromBurn: bigint;
    netSyFee: bigint;
    priceImpact: number;
    exchangeRateAfter: bigint;
  }> {
    const result = await this.routerStatic.removeLiquiditySingleTokenStatic(
      marketAddress,
      tokenOut,
      netLpIn,
    );

    return {
      netTokenOut: result.netTokenOut,
      netSyFromBurn: result.netSyFromBurn,
      netPtFromBurn: result.netPtFromBurn,
      netSyFee: result.netSyFee,
      priceImpact: Number(result.priceImpact) / 1e18,
      exchangeRateAfter: result.exchangeRateAfter,
    };
  }

  /**
   * Get market state
   */
  async getMarketState(marketAddress: string): Promise<{
    totalPt: bigint;
    totalSy: bigint;
    totalLp: bigint;
    treasury: string;
    scalarRoot: bigint;
    expiry: bigint;
    lnFeeRateRoot: bigint;
    reserveFeePercent: bigint;
    lastLnImpliedRate: bigint;
  }> {
    const state = await this.routerStatic.getMarketState(marketAddress);
    return {
      totalPt: state.totalPt,
      totalSy: state.totalSy,
      totalLp: state.totalLp,
      treasury: state.treasury,
      scalarRoot: state.scalarRoot,
      expiry: state.expiry,
      lnFeeRateRoot: state.lnFeeRateRoot,
      reserveFeePercent: state.reserveFeePercent,
      lastLnImpliedRate: state.lastLnImpliedRate,
    };
  }

  /**
   * Get implied yield
   */
  async getImpliedYield(marketAddress: string): Promise<number> {
    const impliedYield = await this.routerStatic.getImpliedYield(marketAddress);
    const lnRate = Number(impliedYield) / 1e18;
    return (Math.exp(lnRate) - 1) * 100;
  }

  /**
   * Get PT to SY rate
   */
  async getPtToSyRate(marketAddress: string): Promise<bigint> {
    return this.routerStatic.getPtToSyRate(marketAddress);
  }

  /**
   * Get SY to asset rate
   */
  async getSyToAssetRate(syAddress: string): Promise<bigint> {
    return this.routerStatic.getSyToAssetRate(syAddress);
  }

  // ============ Helper Methods ============

  /**
   * Create default token input structure
   */
  createTokenInput(tokenIn: string, netTokenIn: bigint, tokenMintSy: string): TokenInput {
    return {
      tokenIn,
      netTokenIn,
      tokenMintSy,
      pendleSwap: ethers.ZeroAddress,
      swapData: {
        swapType: 0,
        extRouter: ethers.ZeroAddress,
        extCalldata: '0x',
        needScale: false,
      },
    };
  }

  /**
   * Create default token output structure
   */
  createTokenOutput(tokenOut: string, minTokenOut: bigint, tokenRedeemSy: string): TokenOutput {
    return {
      tokenOut,
      minTokenOut,
      tokenRedeemSy,
      pendleSwap: ethers.ZeroAddress,
      swapData: {
        swapType: 0,
        extRouter: ethers.ZeroAddress,
        extCalldata: '0x',
        needScale: false,
      },
    };
  }

  /**
   * Create default approx params for guessing
   */
  createApproxParams(guessOffchain: bigint = BigInt(0)): ApproxParams {
    return {
      guessMin: BigInt(0),
      guessMax: ethers.MaxUint256,
      guessOffchain,
      maxIteration: BigInt(256),
      eps: BigInt(1e14), // 0.01%
    };
  }

  /**
   * Create empty limit order data
   */
  createEmptyLimitOrderData(): LimitOrderData {
    return {
      limitRouter: ethers.ZeroAddress,
      epsSkipMarket: BigInt(0),
      normalFills: [],
      flashFills: [],
      optData: '0x',
    };
  }

  /**
   * Calculate deadline timestamp
   */
  getDeadline(seconds: number = DEADLINE_DEFAULTS.DEFAULT): number {
    return Math.floor(Date.now() / 1000) + seconds;
  }

  /**
   * Calculate minimum output with slippage
   */
  applySlippage(amount: bigint, slippagePercent: number = SLIPPAGE_DEFAULTS.DEFAULT): bigint {
    const slippageBps = BigInt(Math.floor(slippagePercent * 100));
    const basisPoints = BigInt(10000);
    return (amount * (basisPoints - slippageBps)) / basisPoints;
  }

  // ============ Getter Methods ============

  getRouterAddress(): string {
    return this.routerAddress;
  }

  getRouterStaticAddress(): string {
    return this.routerStaticAddress;
  }
}

/**
 * Create a new router client instance
 */
export function createRouterClient(config: RouterConfig): RouterClient {
  return new RouterClient(config);
}
