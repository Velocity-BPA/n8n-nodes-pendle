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
import { calculateLPShare, calculatePoolComposition, calculateFeeAPR } from '../utils';
import { ethers } from 'ethers';

export const lpOperations: INodeProperties[] = [
  {
    displayName: 'Operation',
    name: 'operation',
    type: 'options',
    noDataExpression: true,
    displayOptions: { show: { resource: ['lp'] } },
    options: [
      { name: 'Get LP Info', value: 'getLpInfo', description: 'Get LP token info', action: 'Get LP info' },
      { name: 'Get LP Balance', value: 'getLpBalance', description: 'Get LP balance', action: 'Get LP balance' },
      { name: 'Get LP Value', value: 'getLpValue', description: 'Get LP position value', action: 'Get LP value' },
      { name: 'Get LP APY', value: 'getLpApy', description: 'Get LP yield rate', action: 'Get LP APY' },
      { name: 'Get LP Composition', value: 'getLpComposition', description: 'Get pool composition', action: 'Get LP composition' },
      { name: 'Add Liquidity', value: 'addLiquidity', description: 'Add liquidity dual-sided', action: 'Add liquidity' },
      { name: 'Remove Liquidity', value: 'removeLiquidity', description: 'Remove liquidity dual-sided', action: 'Remove liquidity' },
      { name: 'Add Liquidity Single Sided', value: 'addLiquiditySingle', description: 'Zap in with single token', action: 'Add liquidity single sided' },
      { name: 'Remove Liquidity Single Sided', value: 'removeLiquiditySingle', description: 'Zap out to single token', action: 'Remove liquidity single sided' },
      { name: 'Get LP Share', value: 'getLpShare', description: 'Get pool share percentage', action: 'Get LP share' },
      { name: 'Zap In', value: 'zapIn', description: 'Zap into LP position', action: 'Zap in' },
      { name: 'Zap Out', value: 'zapOut', description: 'Zap out of LP position', action: 'Zap out' },
    ],
    default: 'getLpInfo',
  },
];

export const lpFields: INodeProperties[] = [
  {
    displayName: 'Market Address',
    name: 'marketAddress',
    type: 'string',
    required: true,
    default: '',
    placeholder: '0x...',
    description: 'Pendle market address (LP token)',
    displayOptions: {
      show: { resource: ['lp'] },
    },
  },
  {
    displayName: 'Wallet Address',
    name: 'walletAddress',
    type: 'string',
    required: true,
    default: '',
    placeholder: '0x...',
    description: 'Wallet address',
    displayOptions: {
      show: { resource: ['lp'], operation: ['getLpBalance', 'getLpValue', 'getLpShare'] },
    },
  },
  {
    displayName: 'Amount',
    name: 'amount',
    type: 'string',
    required: true,
    default: '',
    placeholder: '1.0',
    description: 'Amount of tokens',
    displayOptions: {
      show: { resource: ['lp'], operation: ['addLiquidity', 'removeLiquidity', 'addLiquiditySingle', 'removeLiquiditySingle', 'zapIn', 'zapOut'] },
    },
  },
  {
    displayName: 'Token',
    name: 'token',
    type: 'string',
    default: '',
    placeholder: '0x...',
    description: 'Token address for single-sided operations',
    displayOptions: {
      show: { resource: ['lp'], operation: ['addLiquiditySingle', 'removeLiquiditySingle', 'zapIn', 'zapOut'] },
    },
  },
  {
    displayName: 'Slippage (%)',
    name: 'slippage',
    type: 'number',
    default: 0.5,
    description: 'Maximum slippage tolerance',
    displayOptions: {
      show: { resource: ['lp'], operation: ['addLiquidity', 'removeLiquidity', 'addLiquiditySingle', 'removeLiquiditySingle', 'zapIn', 'zapOut'] },
    },
  },
];

function getChainId(credentials: { network?: string; chainId?: number }): number {
  const network = credentials.network || 'ethereum';
  if (network === 'custom') return credentials.chainId || 1;
  return NETWORKS[network]?.chainId || 1;
}

export async function executeLpOperation(
  this: IExecuteFunctions,
  index: number,
): Promise<INodeExecutionData[]> {
  const operation = this.getNodeParameter('operation', index) as string;
  const credentials = await this.getCredentials('pendleNetwork');
  
  const chainId = getChainId(credentials as { network?: string; chainId?: number });
  const rpcUrl = credentials.rpcUrl as string | undefined;
  const apiEndpoint = credentials.apiEndpoint as string | undefined;

  const client = createPendleClient({ chainId, rpcUrl, apiEndpoint });
  const marketAddress = this.getNodeParameter('marketAddress', index) as string;
  
  let result: unknown;

  switch (operation) {
    case 'getLpInfo': {
      const [marketData, reserves] = await Promise.all([
        client.getMarketByAddress(marketAddress),
        client.getMarketReserves(marketAddress),
      ]);
      
      result = {
        address: marketAddress,
        name: marketData.name,
        symbol: marketData.symbol,
        syReserve: reserves.syReserve.toString(),
        ptReserve: reserves.ptReserve.toString(),
        tvl: marketData.tvl,
        volume24h: marketData.volume24h,
      };
      break;
    }

    case 'getLpBalance': {
      const walletAddress = this.getNodeParameter('walletAddress', index) as string;
      result = await client.getLPBalance(marketAddress, walletAddress);
      break;
    }

    case 'getLpValue': {
      const walletAddress = this.getNodeParameter('walletAddress', index) as string;
      const [balance, marketData] = await Promise.all([
        client.getLPBalance(marketAddress, walletAddress),
        client.getMarketByAddress(marketAddress),
      ]);
      
      const lpBalance = BigInt(balance.balance);
      const totalSupply = await client.getTokenBalance(marketAddress, marketAddress);
      const share = calculateLPShare(lpBalance, BigInt(totalSupply.balance));
      const estimatedValue = marketData.tvl * share;
      
      result = {
        marketAddress,
        walletAddress,
        lpBalance: balance.balanceFormatted,
        poolShare: `${(share * 100).toFixed(4)}%`,
        estimatedValue,
        estimatedValueFormatted: `$${estimatedValue.toLocaleString()}`,
      };
      break;
    }

    case 'getLpApy': {
      const marketData = await client.getMarketByAddress(marketAddress);
      const routerClient = createRouterClient({ chainId, provider: client.getProvider() });
      const impliedYield = await routerClient.getImpliedYield(marketAddress);
      
      const feeApr = calculateFeeAPR(marketData.volume24h, marketData.tvl);
      
      result = {
        marketAddress,
        impliedApy: impliedYield,
        feeApr,
        totalApy: impliedYield + feeApr,
        totalApyFormatted: `${(impliedYield + feeApr).toFixed(2)}%`,
        note: 'Total APY = Implied APY + Fee APR + Incentives',
      };
      break;
    }

    case 'getLpComposition': {
      const reserves = await client.getMarketReserves(marketAddress);
      const composition = calculatePoolComposition(reserves.syReserve, reserves.ptReserve);
      
      result = {
        marketAddress,
        syReserve: reserves.syReserve.toString(),
        ptReserve: reserves.ptReserve.toString(),
        syPercentage: composition.syPercentage,
        ptPercentage: composition.ptPercentage,
        syPercentageFormatted: `${composition.syPercentage.toFixed(2)}%`,
        ptPercentageFormatted: `${composition.ptPercentage.toFixed(2)}%`,
      };
      break;
    }

    case 'getLpShare': {
      const walletAddress = this.getNodeParameter('walletAddress', index) as string;
      const [balance, lpToken] = await Promise.all([
        client.getLPBalance(marketAddress, walletAddress),
        client.getTokenBalance(marketAddress, marketAddress),
      ]);
      
      const share = calculateLPShare(BigInt(balance.balance), BigInt(lpToken.balance));
      
      result = {
        marketAddress,
        walletAddress,
        lpBalance: balance.balanceFormatted,
        totalSupply: lpToken.balanceFormatted,
        share,
        shareFormatted: `${(share * 100).toFixed(4)}%`,
      };
      break;
    }

    case 'addLiquiditySingle':
    case 'zapIn': {
      const token = this.getNodeParameter('token', index) as string;
      const amount = this.getNodeParameter('amount', index) as string;
      const slippage = this.getNodeParameter('slippage', index, 0.5) as number;
      
      const routerClient = createRouterClient({ chainId, provider: client.getProvider() });
      const amountWei = ethers.parseUnits(amount, 18);
      
      const quote = await routerClient.getAddLiquiditySingleTokenStatic(marketAddress, token, amountWei);
      const minLpOut = routerClient.applySlippage(quote.netLpOut, slippage);
      
      result = {
        operation: 'addLiquiditySingleSided',
        marketAddress,
        tokenIn: token,
        amountIn: amount,
        expectedLpOut: ethers.formatUnits(quote.netLpOut, 18),
        minLpOut: ethers.formatUnits(minLpOut, 18),
        priceImpact: quote.priceImpact,
        priceImpactFormatted: `${(quote.priceImpact * 100).toFixed(4)}%`,
        note: 'Transaction simulation',
      };
      break;
    }

    case 'removeLiquiditySingle':
    case 'zapOut': {
      const token = this.getNodeParameter('token', index) as string;
      const amount = this.getNodeParameter('amount', index) as string;
      const slippage = this.getNodeParameter('slippage', index, 0.5) as number;
      
      const routerClient = createRouterClient({ chainId, provider: client.getProvider() });
      const amountWei = ethers.parseUnits(amount, 18);
      
      const quote = await routerClient.getRemoveLiquiditySingleTokenStatic(marketAddress, token, amountWei);
      const minTokenOut = routerClient.applySlippage(quote.netTokenOut, slippage);
      
      result = {
        operation: 'removeLiquiditySingleSided',
        marketAddress,
        lpIn: amount,
        tokenOut: token,
        expectedTokenOut: ethers.formatUnits(quote.netTokenOut, 18),
        minTokenOut: ethers.formatUnits(minTokenOut, 18),
        priceImpact: quote.priceImpact,
        priceImpactFormatted: `${(quote.priceImpact * 100).toFixed(4)}%`,
        note: 'Transaction simulation',
      };
      break;
    }

    case 'addLiquidity': {
      const amount = this.getNodeParameter('amount', index) as string;
      
      result = {
        operation: 'addLiquidityDualSided',
        marketAddress,
        amount,
        note: 'Dual-sided liquidity requires both SY and PT in correct ratio',
      };
      break;
    }

    case 'removeLiquidity': {
      const amount = this.getNodeParameter('amount', index) as string;
      
      result = {
        operation: 'removeLiquidityDualSided',
        marketAddress,
        lpAmount: amount,
        note: 'Returns both SY and PT proportionally',
      };
      break;
    }

    default:
      throw new NodeOperationError(this.getNode(), `Unknown operation: ${operation}`);
  }

  return [{ json: result as object }];
}
