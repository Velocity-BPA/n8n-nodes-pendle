/*
 * Copyright (c) Velocity BPA, LLC
 * Licensed under the Business Source License 1.1
 * Commercial use requires a separate commercial license.
 * See LICENSE file for details.
 */

import type { IExecuteFunctions, INodeExecutionData, INodeProperties } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
import { createPendleClient } from '../transport/pendleClient';
import { createRouterClient } from '../transport/routerClient';
import { NETWORKS } from '../constants';
import { calculateDaysToMaturity, calculateYTLeverage, formatExpiryDate } from '../utils';
import { ethers } from 'ethers';

export const ytOperations: INodeProperties[] = [
  {
    displayName: 'Operation',
    name: 'operation',
    type: 'options',
    noDataExpression: true,
    displayOptions: { show: { resource: ['yt'] } },
    options: [
      { name: 'Get YT Info', value: 'getYtInfo', description: 'Get Yield Token info', action: 'Get YT info' },
      { name: 'Get YT Price', value: 'getYtPrice', description: 'Get YT price', action: 'Get YT price' },
      { name: 'Get YT Balance', value: 'getYtBalance', description: 'Get YT balance', action: 'Get YT balance' },
      { name: 'Get YT Yield', value: 'getYtYield', description: 'Get variable yield from YT', action: 'Get YT yield' },
      { name: 'Buy YT', value: 'buyYt', description: 'Buy YT tokens', action: 'Buy YT' },
      { name: 'Sell YT', value: 'sellYt', description: 'Sell YT tokens', action: 'Sell YT' },
      { name: 'Get YT Maturity', value: 'getYtMaturity', description: 'Get YT maturity date', action: 'Get YT maturity' },
      { name: 'Get Accrued Yield', value: 'getAccruedYield', description: 'Get unclaimed yield', action: 'Get accrued yield' },
      { name: 'Claim Yield', value: 'claimYield', description: 'Claim accrued yield', action: 'Claim yield' },
      { name: 'Get YT Leverage', value: 'getYtLeverage', description: 'Get yield leverage', action: 'Get YT leverage' },
    ],
    default: 'getYtInfo',
  },
];

export const ytFields: INodeProperties[] = [
  {
    displayName: 'YT Address',
    name: 'ytAddress',
    type: 'string',
    required: true,
    default: '',
    placeholder: '0x...',
    description: 'Yield Token contract address',
    displayOptions: {
      show: { resource: ['yt'], operation: ['getYtInfo', 'getYtPrice', 'getYtBalance', 'getYtYield', 'getYtMaturity', 'getAccruedYield', 'claimYield', 'getYtLeverage'] },
    },
  },
  {
    displayName: 'Market Address',
    name: 'marketAddress',
    type: 'string',
    required: true,
    default: '',
    placeholder: '0x...',
    description: 'Pendle market address',
    displayOptions: {
      show: { resource: ['yt'], operation: ['buyYt', 'sellYt'] },
    },
  },
  {
    displayName: 'Wallet Address',
    name: 'walletAddress',
    type: 'string',
    required: true,
    default: '',
    placeholder: '0x...',
    description: 'Wallet address to check',
    displayOptions: {
      show: { resource: ['yt'], operation: ['getYtBalance', 'getAccruedYield', 'claimYield'] },
    },
  },
  {
    displayName: 'Amount',
    name: 'amount',
    type: 'string',
    required: true,
    default: '',
    placeholder: '1.0',
    description: 'Amount in token units',
    displayOptions: {
      show: { resource: ['yt'], operation: ['buyYt', 'sellYt'] },
    },
  },
  {
    displayName: 'Token In',
    name: 'tokenIn',
    type: 'string',
    required: true,
    default: '',
    placeholder: '0x...',
    description: 'Token to swap from',
    displayOptions: {
      show: { resource: ['yt'], operation: ['buyYt'] },
    },
  },
  {
    displayName: 'Token Out',
    name: 'tokenOut',
    type: 'string',
    required: true,
    default: '',
    placeholder: '0x...',
    description: 'Token to receive',
    displayOptions: {
      show: { resource: ['yt'], operation: ['sellYt'] },
    },
  },
  {
    displayName: 'Slippage (%)',
    name: 'slippage',
    type: 'number',
    default: 0.5,
    description: 'Maximum slippage tolerance',
    displayOptions: {
      show: { resource: ['yt'], operation: ['buyYt', 'sellYt'] },
    },
  },
];

function getChainId(credentials: { network?: string; chainId?: number }): number {
  const network = credentials.network || 'ethereum';
  if (network === 'custom') return credentials.chainId || 1;
  return NETWORKS[network]?.chainId || 1;
}

export async function executeYtOperation(
  this: IExecuteFunctions,
  index: number,
): Promise<INodeExecutionData[]> {
  const operation = this.getNodeParameter('operation', index) as string;
  const credentials = await this.getCredentials('pendleNetwork');
  
  const chainId = getChainId(credentials as { network?: string; chainId?: number });
  const rpcUrl = credentials.rpcUrl as string | undefined;
  const privateKey = credentials.privateKey as string | undefined;
  const apiEndpoint = credentials.apiEndpoint as string | undefined;

  const client = createPendleClient({ chainId, rpcUrl, privateKey, apiEndpoint });
  let result: unknown;

  switch (operation) {
    case 'getYtInfo': {
      const ytAddress = this.getNodeParameter('ytAddress', index) as string;
      result = await client.getYTInfo(ytAddress);
      break;
    }

    case 'getYtPrice': {
      const ytAddress = this.getNodeParameter('ytAddress', index) as string;
      const ytInfo = await client.getYTInfo(ytAddress);
      const markets = await client.getMarkets();
      const market = markets.find(m => m.yt.toLowerCase() === ytAddress.toLowerCase());
      
      if (!market) throw new NodeOperationError(this.getNode(), 'Market not found for YT');
      
      // YT price = 1 - PT price (approximately)
      const routerClient = createRouterClient({ chainId, provider: client.getProvider() });
      const ptRate = await routerClient.getPtToSyRate(market.address);
      const ptPrice = Number(ptRate) / 1e18;
      const ytPrice = Math.max(0, 1 - ptPrice);
      
      result = {
        ytAddress,
        symbol: ytInfo.symbol,
        priceInSy: ytPrice,
        priceFormatted: ytPrice.toFixed(6),
      };
      break;
    }

    case 'getYtBalance': {
      const ytAddress = this.getNodeParameter('ytAddress', index) as string;
      const walletAddress = this.getNodeParameter('walletAddress', index) as string;
      result = await client.getYTBalance(ytAddress, walletAddress);
      break;
    }

    case 'getYtYield': {
      const ytAddress = this.getNodeParameter('ytAddress', index) as string;
      const ytInfo = await client.getYTInfo(ytAddress);
      const markets = await client.getMarkets();
      const market = markets.find(m => m.yt.toLowerCase() === ytAddress.toLowerCase());
      
      if (!market) throw new NodeOperationError(this.getNode(), 'Market not found for YT');
      
      result = {
        ytAddress,
        symbol: ytInfo.symbol,
        underlyingApy: market.underlyingApy,
        underlyingApyFormatted: `${market.underlyingApy.toFixed(2)}%`,
        daysToMaturity: Math.max(0, Math.floor(calculateDaysToMaturity(ytInfo.expiry))),
      };
      break;
    }

    case 'getYtMaturity': {
      const ytAddress = this.getNodeParameter('ytAddress', index) as string;
      const ytInfo = await client.getYTInfo(ytAddress);
      const daysToMaturity = calculateDaysToMaturity(ytInfo.expiry);
      
      result = {
        ytAddress,
        symbol: ytInfo.symbol,
        expiry: ytInfo.expiry,
        expiryDate: formatExpiryDate(ytInfo.expiry),
        isExpired: ytInfo.isExpired,
        daysToMaturity: Math.max(0, Math.floor(daysToMaturity)),
      };
      break;
    }

    case 'getYtLeverage': {
      const ytAddress = this.getNodeParameter('ytAddress', index) as string;
      const ytInfo = await client.getYTInfo(ytAddress);
      const markets = await client.getMarkets();
      const market = markets.find(m => m.yt.toLowerCase() === ytAddress.toLowerCase());
      
      if (!market) throw new NodeOperationError(this.getNode(), 'Market not found for YT');
      
      const routerClient = createRouterClient({ chainId, provider: client.getProvider() });
      const ptRate = await routerClient.getPtToSyRate(market.address);
      const ptPrice = Number(ptRate) / 1e18;
      const ytPrice = Math.max(0.001, 1 - ptPrice); // Avoid division by zero
      const leverage = calculateYTLeverage(ytPrice);
      
      result = {
        ytAddress,
        symbol: ytInfo.symbol,
        ytPrice,
        leverage,
        leverageFormatted: `${leverage.toFixed(2)}x`,
        effectiveApy: market.underlyingApy * leverage,
        effectiveApyFormatted: `${(market.underlyingApy * leverage).toFixed(2)}%`,
      };
      break;
    }

    case 'buyYt': {
      const marketAddress = this.getNodeParameter('marketAddress', index) as string;
      const tokenIn = this.getNodeParameter('tokenIn', index) as string;
      const amount = this.getNodeParameter('amount', index) as string;
      const slippage = this.getNodeParameter('slippage', index, 0.5) as number;
      
      const routerClient = createRouterClient({ chainId, provider: client.getProvider() });
      const amountWei = ethers.parseUnits(amount, 18);
      
      const quote = await routerClient.getSwapTokenForYtStatic(marketAddress, tokenIn, amountWei);
      const minYtOut = routerClient.applySlippage(quote.netYtOut, slippage);
      
      result = {
        operation: 'buyYt',
        marketAddress,
        tokenIn,
        amountIn: amount,
        expectedYtOut: ethers.formatUnits(quote.netYtOut, 18),
        minYtOut: ethers.formatUnits(minYtOut, 18),
        priceImpact: quote.priceImpact,
        priceImpactFormatted: `${(quote.priceImpact * 100).toFixed(4)}%`,
        fee: ethers.formatUnits(quote.netSyFee, 18),
        note: 'Transaction simulation',
      };
      break;
    }

    case 'sellYt': {
      const marketAddress = this.getNodeParameter('marketAddress', index) as string;
      const tokenOut = this.getNodeParameter('tokenOut', index) as string;
      const amount = this.getNodeParameter('amount', index) as string;
      const slippage = this.getNodeParameter('slippage', index, 0.5) as number;
      
      const routerClient = createRouterClient({ chainId, provider: client.getProvider() });
      const amountWei = ethers.parseUnits(amount, 18);
      
      const quote = await routerClient.getSwapYtForTokenStatic(marketAddress, amountWei, tokenOut);
      const minTokenOut = routerClient.applySlippage(quote.netTokenOut, slippage);
      
      result = {
        operation: 'sellYt',
        marketAddress,
        ytIn: amount,
        tokenOut,
        expectedTokenOut: ethers.formatUnits(quote.netTokenOut, 18),
        minTokenOut: ethers.formatUnits(minTokenOut, 18),
        priceImpact: quote.priceImpact,
        priceImpactFormatted: `${(quote.priceImpact * 100).toFixed(4)}%`,
        fee: ethers.formatUnits(quote.netSyFee, 18),
        note: 'Transaction simulation',
      };
      break;
    }

    case 'getAccruedYield': {
      const ytAddress = this.getNodeParameter('ytAddress', index) as string;
      const walletAddress = this.getNodeParameter('walletAddress', index) as string;
      
      result = {
        ytAddress,
        walletAddress,
        message: 'Query accrued yield through YT contract userInterest function',
        note: 'Yield accrues in the underlying SY token',
      };
      break;
    }

    case 'claimYield': {
      const ytAddress = this.getNodeParameter('ytAddress', index) as string;
      const walletAddress = this.getNodeParameter('walletAddress', index) as string;
      
      result = {
        operation: 'claimYield',
        ytAddress,
        walletAddress,
        message: 'Claim yield through router redeemDueInterestAndRewards',
        note: 'Transaction simulation - execute through router',
      };
      break;
    }

    default:
      throw new NodeOperationError(this.getNode(), `Unknown operation: ${operation}`);
  }

  return [{ json: result as object }];
}
