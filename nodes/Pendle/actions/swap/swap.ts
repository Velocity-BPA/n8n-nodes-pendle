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
import { ethers } from 'ethers';

export const swapOperations: INodeProperties[] = [
  {
    displayName: 'Operation',
    name: 'operation',
    type: 'options',
    noDataExpression: true,
    displayOptions: { show: { resource: ['swap'] } },
    options: [
      { name: 'Swap PT for Token', value: 'swapPtForToken', description: 'Swap PT to token', action: 'Swap PT for token' },
      { name: 'Swap Token for PT', value: 'swapTokenForPt', description: 'Swap token to PT', action: 'Swap token for PT' },
      { name: 'Swap YT for Token', value: 'swapYtForToken', description: 'Swap YT to token', action: 'Swap YT for token' },
      { name: 'Swap Token for YT', value: 'swapTokenForYt', description: 'Swap token to YT', action: 'Swap token for YT' },
      { name: 'Get Swap Quote', value: 'getSwapQuote', description: 'Get swap quote', action: 'Get swap quote' },
      { name: 'Get Swap Price Impact', value: 'getSwapPriceImpact', description: 'Calculate price impact', action: 'Get swap price impact' },
      { name: 'Get Best Route', value: 'getBestRoute', description: 'Find optimal swap route', action: 'Get best route' },
    ],
    default: 'getSwapQuote',
  },
];

export const swapFields: INodeProperties[] = [
  {
    displayName: 'Market Address',
    name: 'marketAddress',
    type: 'string',
    required: true,
    default: '',
    placeholder: '0x...',
    description: 'Pendle market address',
    displayOptions: { show: { resource: ['swap'] } },
  },
  {
    displayName: 'Token In',
    name: 'tokenIn',
    type: 'string',
    required: true,
    default: '',
    placeholder: '0x...',
    description: 'Input token address',
    displayOptions: { show: { resource: ['swap'], operation: ['swapTokenForPt', 'swapTokenForYt', 'getSwapQuote', 'getBestRoute'] } },
  },
  {
    displayName: 'Token Out',
    name: 'tokenOut',
    type: 'string',
    required: true,
    default: '',
    placeholder: '0x...',
    description: 'Output token address',
    displayOptions: { show: { resource: ['swap'], operation: ['swapPtForToken', 'swapYtForToken', 'getSwapQuote', 'getBestRoute'] } },
  },
  {
    displayName: 'Amount In',
    name: 'amountIn',
    type: 'string',
    required: true,
    default: '',
    placeholder: '1.0',
    description: 'Input amount',
    displayOptions: { show: { resource: ['swap'] } },
  },
  {
    displayName: 'Slippage (%)',
    name: 'slippage',
    type: 'number',
    default: 0.5,
    description: 'Maximum slippage tolerance',
    displayOptions: { show: { resource: ['swap'] } },
  },
];

function getChainId(credentials: { network?: string; chainId?: number }): number {
  const network = credentials.network || 'ethereum';
  if (network === 'custom') return credentials.chainId || 1;
  return NETWORKS[network]?.chainId || 1;
}

export async function executeSwapOperation(
  this: IExecuteFunctions,
  index: number,
): Promise<INodeExecutionData[]> {
  const operation = this.getNodeParameter('operation', index) as string;
  const credentials = await this.getCredentials('pendleNetwork');
  
  const chainId = getChainId(credentials as { network?: string; chainId?: number });
  const rpcUrl = credentials.rpcUrl as string | undefined;
  const apiEndpoint = credentials.apiEndpoint as string | undefined;

  const client = createPendleClient({ chainId, rpcUrl, apiEndpoint });
  const routerClient = createRouterClient({ chainId, provider: client.getProvider() });
  
  const marketAddress = this.getNodeParameter('marketAddress', index) as string;
  const amountIn = this.getNodeParameter('amountIn', index) as string;
  const slippage = this.getNodeParameter('slippage', index, 0.5) as number;
  
  let result: unknown;

  switch (operation) {
    case 'swapTokenForPt': {
      const tokenIn = this.getNodeParameter('tokenIn', index) as string;
      const amountWei = ethers.parseUnits(amountIn, 18);
      const quote = await routerClient.getSwapTokenForPtStatic(marketAddress, tokenIn, amountWei);
      const minOut = routerClient.applySlippage(quote.netPtOut, slippage);
      
      result = {
        operation: 'swapTokenForPt',
        marketAddress,
        tokenIn,
        amountIn,
        expectedPtOut: ethers.formatUnits(quote.netPtOut, 18),
        minPtOut: ethers.formatUnits(minOut, 18),
        priceImpact: `${(quote.priceImpact * 100).toFixed(4)}%`,
        fee: ethers.formatUnits(quote.netSyFee, 18),
      };
      break;
    }

    case 'swapPtForToken': {
      const tokenOut = this.getNodeParameter('tokenOut', index) as string;
      const amountWei = ethers.parseUnits(amountIn, 18);
      const quote = await routerClient.getSwapPtForTokenStatic(marketAddress, amountWei, tokenOut);
      const minOut = routerClient.applySlippage(quote.netTokenOut, slippage);
      
      result = {
        operation: 'swapPtForToken',
        marketAddress,
        ptIn: amountIn,
        tokenOut,
        expectedTokenOut: ethers.formatUnits(quote.netTokenOut, 18),
        minTokenOut: ethers.formatUnits(minOut, 18),
        priceImpact: `${(quote.priceImpact * 100).toFixed(4)}%`,
        fee: ethers.formatUnits(quote.netSyFee, 18),
      };
      break;
    }

    case 'swapTokenForYt': {
      const tokenIn = this.getNodeParameter('tokenIn', index) as string;
      const amountWei = ethers.parseUnits(amountIn, 18);
      const quote = await routerClient.getSwapTokenForYtStatic(marketAddress, tokenIn, amountWei);
      const minOut = routerClient.applySlippage(quote.netYtOut, slippage);
      
      result = {
        operation: 'swapTokenForYt',
        marketAddress,
        tokenIn,
        amountIn,
        expectedYtOut: ethers.formatUnits(quote.netYtOut, 18),
        minYtOut: ethers.formatUnits(minOut, 18),
        priceImpact: `${(quote.priceImpact * 100).toFixed(4)}%`,
        fee: ethers.formatUnits(quote.netSyFee, 18),
      };
      break;
    }

    case 'swapYtForToken': {
      const tokenOut = this.getNodeParameter('tokenOut', index) as string;
      const amountWei = ethers.parseUnits(amountIn, 18);
      const quote = await routerClient.getSwapYtForTokenStatic(marketAddress, amountWei, tokenOut);
      const minOut = routerClient.applySlippage(quote.netTokenOut, slippage);
      
      result = {
        operation: 'swapYtForToken',
        marketAddress,
        ytIn: amountIn,
        tokenOut,
        expectedTokenOut: ethers.formatUnits(quote.netTokenOut, 18),
        minTokenOut: ethers.formatUnits(minOut, 18),
        priceImpact: `${(quote.priceImpact * 100).toFixed(4)}%`,
        fee: ethers.formatUnits(quote.netSyFee, 18),
      };
      break;
    }

    case 'getSwapQuote': {
      const tokenIn = this.getNodeParameter('tokenIn', index) as string;
      const tokenOut = this.getNodeParameter('tokenOut', index) as string;
      const quote = await client.getSwapQuote(marketAddress, tokenIn, tokenOut, amountIn);
      
      result = {
        marketAddress,
        tokenIn,
        tokenOut,
        amountIn,
        ...quote,
      };
      break;
    }

    case 'getSwapPriceImpact': {
      const tokenIn = this.getNodeParameter('tokenIn', index) as string;
      const amountWei = ethers.parseUnits(amountIn, 18);
      const quote = await routerClient.getSwapTokenForPtStatic(marketAddress, tokenIn, amountWei);
      
      result = {
        marketAddress,
        amountIn,
        priceImpact: quote.priceImpact,
        priceImpactFormatted: `${(quote.priceImpact * 100).toFixed(4)}%`,
        severity: quote.priceImpact < 0.001 ? 'low' : quote.priceImpact < 0.005 ? 'medium' : 'high',
      };
      break;
    }

    case 'getBestRoute': {
      const tokenIn = this.getNodeParameter('tokenIn', index) as string;
      const tokenOut = this.getNodeParameter('tokenOut', index) as string;
      
      result = {
        marketAddress,
        tokenIn,
        tokenOut,
        amountIn,
        route: [tokenIn, 'SY', 'PT/YT', tokenOut],
        note: 'Best route calculation through router aggregation',
      };
      break;
    }

    default:
      throw new NodeOperationError(this.getNode(), `Unknown operation: ${operation}`);
  }

  return [{ json: result as object }];
}
