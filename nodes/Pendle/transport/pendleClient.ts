/*
 * Copyright (c) Velocity BPA, LLC
 * Licensed under the Business Source License 1.1
 * Commercial use requires a separate commercial license.
 * See LICENSE file for details.
 */

/**
 * Pendle Client - Main client for interacting with Pendle protocol
 * Handles API calls and blockchain interactions
 */

import { ethers } from 'ethers';
import axios, { AxiosInstance } from 'axios';
import {
  NETWORKS,
  NetworkConfig,
  getNetworkByChainId,
  CONTRACT_ADDRESSES,
  ContractAddresses,
  PENDLE_MARKET_ABI,
  PENDLE_ROUTER_ABI,
  PENDLE_ROUTER_STATIC_ABI,
  ERC20_ABI,
  PT_ABI,
  YT_ABI,
  SY_ABI,
} from '../constants';

export interface PendleClientConfig {
  chainId: number;
  rpcUrl?: string;
  privateKey?: string;
  apiEndpoint?: string;
}

export interface MarketData {
  address: string;
  name: string;
  symbol: string;
  expiry: number;
  pt: string;
  yt: string;
  sy: string;
  underlyingAsset: string;
  impliedApy: number;
  underlyingApy: number;
  tvl: number;
  volume24h: number;
  isExpired: boolean;
}

export interface TokenBalance {
  address: string;
  symbol: string;
  balance: string;
  balanceFormatted: string;
  decimals: number;
}

export interface SwapQuote {
  amountIn: string;
  amountOut: string;
  priceImpact: number;
  fee: string;
  route: string[];
}

export class PendleClient {
  private chainId: number;
  private network: NetworkConfig;
  private contracts: ContractAddresses;
  private provider: ethers.JsonRpcProvider;
  private signer?: ethers.Wallet;
  private api: AxiosInstance;

  constructor(config: PendleClientConfig) {
    this.chainId = config.chainId;

    const network = getNetworkByChainId(config.chainId);
    if (!network) {
      throw new Error(`Unsupported chain ID: ${config.chainId}`);
    }
    this.network = network;

    const contracts = CONTRACT_ADDRESSES[config.chainId];
    if (!contracts) {
      throw new Error(`No contract addresses for chain ID: ${config.chainId}`);
    }
    this.contracts = contracts;

    const rpcUrl = config.rpcUrl || network.rpcUrl;
    this.provider = new ethers.JsonRpcProvider(rpcUrl);

    if (config.privateKey) {
      this.signer = new ethers.Wallet(config.privateKey, this.provider);
    }

    const apiEndpoint = config.apiEndpoint || network.pendleApiUrl;
    this.api = axios.create({
      baseURL: apiEndpoint,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  // ============ Network Methods ============

  getChainId(): number {
    return this.chainId;
  }

  getNetwork(): NetworkConfig {
    return this.network;
  }

  getContracts(): ContractAddresses {
    return this.contracts;
  }

  getProvider(): ethers.JsonRpcProvider {
    return this.provider;
  }

  getSigner(): ethers.Wallet | undefined {
    return this.signer;
  }

  // ============ Market Methods ============

  async getMarkets(): Promise<MarketData[]> {
    try {
      const response = await this.api.get(`/v1/${this.chainId}/markets`);
      return response.data.results || response.data;
    } catch (error) {
      throw this.handleError(error, 'Failed to fetch markets');
    }
  }

  async getMarketByAddress(marketAddress: string): Promise<MarketData> {
    try {
      const response = await this.api.get(`/v1/${this.chainId}/markets/${marketAddress}`);
      return response.data;
    } catch (error) {
      throw this.handleError(error, 'Failed to fetch market');
    }
  }

  async getActiveMarkets(): Promise<MarketData[]> {
    const markets = await this.getMarkets();
    return markets.filter((m) => !m.isExpired);
  }

  async getExpiredMarkets(): Promise<MarketData[]> {
    const markets = await this.getMarkets();
    return markets.filter((m) => m.isExpired);
  }

  async getMarketData(marketAddress: string): Promise<{
    ptAddress: string;
    ytAddress: string;
    syAddress: string;
    expiry: number;
    isExpired: boolean;
  }> {
    const market = new ethers.Contract(marketAddress, PENDLE_MARKET_ABI, this.provider);

    const [ptAddress, ytAddress, syAddress, expiry, isExpired] = await Promise.all([
      market.PT() as Promise<string>,
      market.YT() as Promise<string>,
      market.SY() as Promise<string>,
      market.expiry() as Promise<bigint>,
      market.isExpired() as Promise<boolean>,
    ]);

    return {
      ptAddress,
      ytAddress,
      syAddress,
      expiry: Number(expiry),
      isExpired,
    };
  }

  async getMarketReserves(
    marketAddress: string,
  ): Promise<{ syReserve: bigint; ptReserve: bigint }> {
    const market = new ethers.Contract(marketAddress, PENDLE_MARKET_ABI, this.provider);
    const [syReserve, ptReserve] = await market.getReserves();
    return { syReserve, ptReserve };
  }

  // ============ Token Balance Methods ============

  async getTokenBalance(tokenAddress: string, walletAddress: string): Promise<TokenBalance> {
    const token = new ethers.Contract(tokenAddress, ERC20_ABI, this.provider);

    const [symbol, decimals, balance] = await Promise.all([
      token.symbol() as Promise<string>,
      token.decimals() as Promise<number>,
      token.balanceOf(walletAddress) as Promise<bigint>,
    ]);

    return {
      address: tokenAddress,
      symbol,
      balance: balance.toString(),
      balanceFormatted: ethers.formatUnits(balance, decimals),
      decimals,
    };
  }

  async getPTBalance(ptAddress: string, walletAddress: string): Promise<TokenBalance> {
    return this.getTokenBalance(ptAddress, walletAddress);
  }

  async getYTBalance(ytAddress: string, walletAddress: string): Promise<TokenBalance> {
    return this.getTokenBalance(ytAddress, walletAddress);
  }

  async getSYBalance(syAddress: string, walletAddress: string): Promise<TokenBalance> {
    return this.getTokenBalance(syAddress, walletAddress);
  }

  async getLPBalance(marketAddress: string, walletAddress: string): Promise<TokenBalance> {
    return this.getTokenBalance(marketAddress, walletAddress);
  }

  // ============ PT/YT Methods ============

  async getPTInfo(ptAddress: string): Promise<{
    address: string;
    symbol: string;
    name: string;
    decimals: number;
    sy: string;
    yt: string;
    expiry: number;
    isExpired: boolean;
  }> {
    const pt = new ethers.Contract(ptAddress, PT_ABI, this.provider);

    const [symbol, name, decimals, sy, yt, expiry, isExpired] = await Promise.all([
      pt.symbol() as Promise<string>,
      pt.name() as Promise<string>,
      pt.decimals() as Promise<number>,
      pt.SY() as Promise<string>,
      pt.YT() as Promise<string>,
      pt.expiry() as Promise<bigint>,
      pt.isExpired() as Promise<boolean>,
    ]);

    return {
      address: ptAddress,
      symbol,
      name,
      decimals,
      sy,
      yt,
      expiry: Number(expiry),
      isExpired,
    };
  }

  async getYTInfo(ytAddress: string): Promise<{
    address: string;
    symbol: string;
    name: string;
    decimals: number;
    sy: string;
    pt: string;
    expiry: number;
    isExpired: boolean;
  }> {
    const yt = new ethers.Contract(ytAddress, YT_ABI, this.provider);

    const [symbol, name, decimals, sy, pt, expiry, isExpired] = await Promise.all([
      yt.symbol() as Promise<string>,
      yt.name() as Promise<string>,
      yt.decimals() as Promise<number>,
      yt.SY() as Promise<string>,
      yt.PT() as Promise<string>,
      yt.expiry() as Promise<bigint>,
      yt.isExpired() as Promise<boolean>,
    ]);

    return {
      address: ytAddress,
      symbol,
      name,
      decimals,
      sy,
      pt,
      expiry: Number(expiry),
      isExpired,
    };
  }

  // ============ SY Methods ============

  async getSYInfo(syAddress: string): Promise<{
    address: string;
    symbol: string;
    name: string;
    decimals: number;
    exchangeRate: string;
    tokensIn: string[];
    tokensOut: string[];
  }> {
    const sy = new ethers.Contract(syAddress, SY_ABI, this.provider);

    const [symbol, name, decimals, exchangeRate, tokensIn, tokensOut] = await Promise.all([
      sy.symbol() as Promise<string>,
      sy.name() as Promise<string>,
      sy.decimals() as Promise<number>,
      sy.exchangeRate() as Promise<bigint>,
      sy.getTokensIn() as Promise<string[]>,
      sy.getTokensOut() as Promise<string[]>,
    ]);

    return {
      address: syAddress,
      symbol,
      name,
      decimals,
      exchangeRate: exchangeRate.toString(),
      tokensIn,
      tokensOut,
    };
  }

  async getSYExchangeRate(syAddress: string): Promise<bigint> {
    const sy = new ethers.Contract(syAddress, SY_ABI, this.provider);
    return sy.exchangeRate();
  }

  // ============ Swap Quote Methods ============

  async getSwapQuote(
    marketAddress: string,
    tokenIn: string,
    tokenOut: string,
    amountIn: string,
  ): Promise<SwapQuote> {
    try {
      const response = await this.api.get(`/v1/${this.chainId}/markets/${marketAddress}/swap`, {
        params: {
          tokenIn,
          tokenOut,
          amountIn,
        },
      });
      return response.data;
    } catch (error) {
      throw this.handleError(error, 'Failed to get swap quote');
    }
  }

  async getSwapPtForTokenQuote(
    marketAddress: string,
    ptIn: string,
    tokenOut: string,
  ): Promise<{
    netTokenOut: bigint;
    netSyFee: bigint;
    priceImpact: number;
    exchangeRateAfter: bigint;
  }> {
    const routerStatic = new ethers.Contract(
      this.contracts.routerStatic,
      PENDLE_ROUTER_STATIC_ABI,
      this.provider,
    );

    const result = await routerStatic.swapExactPtForTokenStatic(
      marketAddress,
      ethers.parseUnits(ptIn, 18),
      tokenOut,
    );

    return {
      netTokenOut: result.netTokenOut,
      netSyFee: result.netSyFee,
      priceImpact: Number(result.priceImpact) / 1e18,
      exchangeRateAfter: result.exchangeRateAfter,
    };
  }

  // ============ Implied Yield Methods ============

  async getImpliedYield(marketAddress: string): Promise<number> {
    const routerStatic = new ethers.Contract(
      this.contracts.routerStatic,
      PENDLE_ROUTER_STATIC_ABI,
      this.provider,
    );

    const impliedYield = await routerStatic.getImpliedYield(marketAddress);
    // Convert from ln rate to percentage
    const lnRate = Number(impliedYield) / 1e18;
    return (Math.exp(lnRate) - 1) * 100;
  }

  // ============ Analytics Methods ============

  async getProtocolStats(): Promise<{
    totalTvl: number;
    totalVolume24h: number;
    totalMarkets: number;
    activeMarkets: number;
  }> {
    try {
      const response = await this.api.get(`/v1/${this.chainId}/statistics`);
      return response.data;
    } catch (error) {
      throw this.handleError(error, 'Failed to fetch protocol stats');
    }
  }

  // ============ Transaction Methods ============

  async approveToken(
    tokenAddress: string,
    spenderAddress: string,
    amount: bigint,
  ): Promise<ethers.TransactionResponse> {
    if (!this.signer) {
      throw new Error('Signer required for transactions');
    }

    const token = new ethers.Contract(tokenAddress, ERC20_ABI, this.signer);
    return token.approve(spenderAddress, amount);
  }

  async checkAllowance(
    tokenAddress: string,
    ownerAddress: string,
    spenderAddress: string,
  ): Promise<bigint> {
    const token = new ethers.Contract(tokenAddress, ERC20_ABI, this.provider);
    return token.allowance(ownerAddress, spenderAddress);
  }

  // ============ Gas Estimation ============

  async estimateGas(
    to: string,
    data: string,
    value: bigint = BigInt(0),
  ): Promise<{ gasLimit: bigint; gasPrice: bigint; maxFeePerGas: bigint; maxPriorityFeePerGas: bigint }> {
    const [gasLimit, feeData] = await Promise.all([
      this.provider.estimateGas({ to, data, value }),
      this.provider.getFeeData(),
    ]);

    return {
      gasLimit,
      gasPrice: feeData.gasPrice || BigInt(0),
      maxFeePerGas: feeData.maxFeePerGas || BigInt(0),
      maxPriorityFeePerGas: feeData.maxPriorityFeePerGas || BigInt(0),
    };
  }

  // ============ Error Handling ============

  private handleError(error: unknown, context: string): Error {
    if (axios.isAxiosError(error)) {
      const message = error.response?.data?.message || error.message;
      return new Error(`${context}: ${message}`);
    }
    if (error instanceof Error) {
      return new Error(`${context}: ${error.message}`);
    }
    return new Error(`${context}: Unknown error`);
  }
}

/**
 * Create a new Pendle client instance
 */
export function createPendleClient(config: PendleClientConfig): PendleClient {
  return new PendleClient(config);
}
