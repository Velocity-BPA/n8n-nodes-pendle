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
import { calculateDaysToMaturity, calculateFixedYield, formatExpiryDate, calculatePTDiscount } from '../utils';
import { ethers } from 'ethers';

export const ptOperations: INodeProperties[] = [
  {
    displayName: 'Operation',
    name: 'operation',
    type: 'options',
    noDataExpression: true,
    displayOptions: { show: { resource: ['pt'] } },
    options: [
      { name: 'Get PT Info', value: 'getPtInfo', description: 'Get Principal Token info', action: 'Get PT info' },
      { name: 'Get PT Price', value: 'getPtPrice', description: 'Get PT price in underlying', action: 'Get PT price' },
      { name: 'Get PT Balance', value: 'getPtBalance', description: 'Get PT balance for wallet', action: 'Get PT balance' },
      { name: 'Get PT Yield', value: 'getPtYield', description: 'Get fixed yield from PT', action: 'Get PT yield' },
      { name: 'Get PT Discount', value: 'getPtDiscount', description: 'Get PT discount from par', action: 'Get PT discount' },
      { name: 'Buy PT', value: 'buyPt', description: 'Buy PT tokens', action: 'Buy PT' },
      { name: 'Sell PT', value: 'sellPt', description: 'Sell PT tokens', action: 'Sell PT' },
      { name: 'Get PT Markets', value: 'getPtMarkets', description: 'Get markets for PT', action: 'Get PT markets' },
      { name: 'Get PT Maturity', value: 'getPtMaturity', description: 'Get PT maturity date', action: 'Get PT maturity' },
      { name: 'Redeem PT', value: 'redeemPt', description: 'Redeem PT after maturity', action: 'Redeem PT' },
      { name: 'Get PT APY', value: 'getPtApy', description: 'Get annualized PT yield', action: 'Get PT APY' },
    ],
    default: 'getPtInfo',
  },
];

export const ptFields: INodeProperties[] = [
  {
    displayName: 'PT Address',
    name: 'ptAddress',
    type: 'string',
    required: true,
    default: '',
    placeholder: '0x...',
    description: 'Principal Token contract address',
    displayOptions: {
      show: { resource: ['pt'], operation: ['getPtInfo', 'getPtPrice', 'getPtBalance', 'getPtYield', 'getPtDiscount', 'getPtMaturity', 'getPtApy'] },
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
      show: { resource: ['pt'], operation: ['buyPt', 'sellPt', 'getPtMarkets', 'redeemPt'] },
    },
  },
  {
    displayName: 'Wallet Address',
    name: 'walletAddress',
    type: 'string',
    required: true,
    default: '',
    placeholder: '0x...',
    description: 'Wallet address to check balance',
    displayOptions: {
      show: { resource: ['pt'], operation: ['getPtBalance'] },
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
      show: { resource: ['pt'], operation: ['buyPt', 'sellPt', 'redeemPt'] },
    },
  },
  {
    displayName: 'Token In',
    name: 'tokenIn',
    type: 'string',
    required: true,
    default: '',
    placeholder: '0x...',
    description: 'Address of token to swap from',
    displayOptions: {
      show: { resource: ['pt'], operation: ['buyPt'] },
    },
  },
  {
    displayName: 'Token Out',
    name: 'tokenOut',
    type: 'string',
    required: true,
    default: '',
    placeholder: '0x...',
    description: 'Address of token to receive',
    displayOptions: {
      show: { resource: ['pt'], operation: ['sellPt'] },
    },
  },
  {
    displayName: 'Slippage (%)',
    name: 'slippage',
    type: 'number',
    default: 0.5,
    description: 'Maximum slippage tolerance in percent',
    displayOptions: {
      show: { resource: ['pt'], operation: ['buyPt', 'sellPt'] },
    },
  },
];

function getChainId(credentials: { network?: string; chainId?: number }): number {
  const network = credentials.network || 'ethereum';
  if (network === 'custom') return credentials.chainId || 1;
  return NETWORKS[network]?.chainId || 1;
}

export async function executePtOperation(
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
    case 'getPtInfo': {
      const ptAddress = this.getNodeParameter('ptAddress', index) as string;
      result = await client.getPTInfo(ptAddress);
      break;
    }

    case 'getPtPrice': {
      const ptAddress = this.getNodeParameter('ptAddress', index) as string;
      const ptInfo = await client.getPTInfo(ptAddress);
      const routerClient = createRouterClient({ chainId, provider: client.getProvider() });
      
      // Get PT to SY rate from markets
      const markets = await client.getMarkets();
      const market = markets.find(m => m.pt.toLowerCase() === ptAddress.toLowerCase());
      if (!market) throw new NodeOperationError(this.getNode(), 'Market not found for PT');
      
      const rate = await routerClient.getPtToSyRate(market.address);
      const priceInSy = Number(rate) / 1e18;
      
      result = {
        ptAddress,
        symbol: ptInfo.symbol,
        priceInSy,
        priceFormatted: priceInSy.toFixed(6),
      };
      break;
    }

    case 'getPtBalance': {
      const ptAddress = this.getNodeParameter('ptAddress', index) as string;
      const walletAddress = this.getNodeParameter('walletAddress', index) as string;
      result = await client.getPTBalance(ptAddress, walletAddress);
      break;
    }

    case 'getPtYield':
    case 'getPtApy': {
      const ptAddress = this.getNodeParameter('ptAddress', index) as string;
      const ptInfo = await client.getPTInfo(ptAddress);
      
      const markets = await client.getMarkets();
      const market = markets.find(m => m.pt.toLowerCase() === ptAddress.toLowerCase());
      if (!market) throw new NodeOperationError(this.getNode(), 'Market not found for PT');
      
      const routerClient = createRouterClient({ chainId, provider: client.getProvider() });
      const impliedYield = await routerClient.getImpliedYield(market.address);
      const daysToMaturity = calculateDaysToMaturity(ptInfo.expiry);
      
      result = {
        ptAddress,
        symbol: ptInfo.symbol,
        impliedApy: impliedYield,
        impliedApyFormatted: `${impliedYield.toFixed(2)}%`,
        daysToMaturity: Math.max(0, Math.floor(daysToMaturity)),
        expiryDate: formatExpiryDate(ptInfo.expiry),
      };
      break;
    }

    case 'getPtDiscount': {
      const ptAddress = this.getNodeParameter('ptAddress', index) as string;
      const markets = await client.getMarkets();
      const market = markets.find(m => m.pt.toLowerCase() === ptAddress.toLowerCase());
      if (!market) throw new NodeOperationError(this.getNode(), 'Market not found for PT');
      
      const routerClient = createRouterClient({ chainId, provider: client.getProvider() });
      const rate = await routerClient.getPtToSyRate(market.address);
      const ptPrice = Number(rate) / 1e18;
      const discount = calculatePTDiscount(ptPrice);
      
      result = {
        ptAddress,
        ptPrice,
        discount,
        discountFormatted: `${discount.toFixed(2)}%`,
      };
      break;
    }

    case 'getPtMaturity': {
      const ptAddress = this.getNodeParameter('ptAddress', index) as string;
      const ptInfo = await client.getPTInfo(ptAddress);
      const daysToMaturity = calculateDaysToMaturity(ptInfo.expiry);
      
      result = {
        ptAddress,
        symbol: ptInfo.symbol,
        expiry: ptInfo.expiry,
        expiryDate: formatExpiryDate(ptInfo.expiry),
        isExpired: ptInfo.isExpired,
        daysToMaturity: Math.max(0, Math.floor(daysToMaturity)),
      };
      break;
    }

    case 'buyPt': {
      const marketAddress = this.getNodeParameter('marketAddress', index) as string;
      const tokenIn = this.getNodeParameter('tokenIn', index) as string;
      const amount = this.getNodeParameter('amount', index) as string;
      const slippage = this.getNodeParameter('slippage', index, 0.5) as number;
      
      const routerClient = createRouterClient({ chainId, provider: client.getProvider(), signer: client.getSigner() });
      const amountWei = ethers.parseUnits(amount, 18);
      
      const quote = await routerClient.getSwapTokenForPtStatic(marketAddress, tokenIn, amountWei);
      const minPtOut = routerClient.applySlippage(quote.netPtOut, slippage);
      
      result = {
        operation: 'buyPt',
        marketAddress,
        tokenIn,
        amountIn: amount,
        expectedPtOut: ethers.formatUnits(quote.netPtOut, 18),
        minPtOut: ethers.formatUnits(minPtOut, 18),
        priceImpact: quote.priceImpact,
        priceImpactFormatted: `${(quote.priceImpact * 100).toFixed(4)}%`,
        fee: ethers.formatUnits(quote.netSyFee, 18),
        note: 'Transaction simulation - use execute to perform actual swap',
      };
      break;
    }

    case 'sellPt': {
      const marketAddress = this.getNodeParameter('marketAddress', index) as string;
      const tokenOut = this.getNodeParameter('tokenOut', index) as string;
      const amount = this.getNodeParameter('amount', index) as string;
      const slippage = this.getNodeParameter('slippage', index, 0.5) as number;
      
      const routerClient = createRouterClient({ chainId, provider: client.getProvider() });
      const amountWei = ethers.parseUnits(amount, 18);
      
      const quote = await routerClient.getSwapPtForTokenStatic(marketAddress, amountWei, tokenOut);
      const minTokenOut = routerClient.applySlippage(quote.netTokenOut, slippage);
      
      result = {
        operation: 'sellPt',
        marketAddress,
        ptIn: amount,
        tokenOut,
        expectedTokenOut: ethers.formatUnits(quote.netTokenOut, 18),
        minTokenOut: ethers.formatUnits(minTokenOut, 18),
        priceImpact: quote.priceImpact,
        priceImpactFormatted: `${(quote.priceImpact * 100).toFixed(4)}%`,
        fee: ethers.formatUnits(quote.netSyFee, 18),
        note: 'Transaction simulation - use execute to perform actual swap',
      };
      break;
    }

    case 'getPtMarkets': {
      const marketAddress = this.getNodeParameter('marketAddress', index) as string;
      const marketData = await client.getMarketByAddress(marketAddress);
      result = {
        marketAddress,
        pt: marketData.pt,
        markets: [marketData],
      };
      break;
    }

    case 'redeemPt': {
      const marketAddress = this.getNodeParameter('marketAddress', index) as string;
      const amount = this.getNodeParameter('amount', index) as string;
      
      const marketData = await client.getMarketData(marketAddress);
      if (!marketData.isExpired) {
        throw new NodeOperationError(this.getNode(), 'Cannot redeem PT before maturity');
      }
      
      result = {
        operation: 'redeemPt',
        marketAddress,
        amount,
        message: 'PT redemption available after maturity',
        isExpired: marketData.isExpired,
        note: 'Execute redemption through router contract',
      };
      break;
    }

    default:
      throw new NodeOperationError(this.getNode(), `Unknown operation: ${operation}`);
  }

  return [{ json: result as object }];
}
