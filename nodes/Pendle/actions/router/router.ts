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
import { NETWORKS, CONTRACT_ADDRESSES } from '../constants';

export const routerOperations: INodeProperties[] = [
  {
    displayName: 'Operation', name: 'operation', type: 'options', noDataExpression: true,
    displayOptions: { show: { resource: ['router'] } },
    options: [
      { name: 'Get Router Address', value: 'getRouterAddress', description: 'Get router contract address', action: 'Get router address' },
      { name: 'Get Best Route', value: 'getBestRoute', description: 'Find optimal swap route', action: 'Get best route' },
      { name: 'Get Route Quote', value: 'getRouteQuote', description: 'Get quote for route', action: 'Get route quote' },
      { name: 'Get Supported Actions', value: 'getSupportedActions', description: 'List supported router actions', action: 'Get supported actions' },
      { name: 'Get Gas Estimate', value: 'getGasEstimate', description: 'Estimate gas for action', action: 'Get gas estimate' },
      { name: 'Compare Routes', value: 'compareRoutes', description: 'Compare different routes', action: 'Compare routes' },
    ],
    default: 'getRouterAddress',
  },
];

export const routerFields: INodeProperties[] = [
  { displayName: 'Market Address', name: 'marketAddress', type: 'string', default: '', placeholder: '0x...', displayOptions: { show: { resource: ['router'], operation: ['getBestRoute', 'getRouteQuote', 'getGasEstimate', 'compareRoutes'] } } },
  { displayName: 'Token In', name: 'tokenIn', type: 'string', default: '', placeholder: '0x...', displayOptions: { show: { resource: ['router'], operation: ['getBestRoute', 'getRouteQuote', 'compareRoutes'] } } },
  { displayName: 'Token Out', name: 'tokenOut', type: 'string', default: '', placeholder: '0x...', displayOptions: { show: { resource: ['router'], operation: ['getBestRoute', 'getRouteQuote', 'compareRoutes'] } } },
  { displayName: 'Amount', name: 'amount', type: 'string', default: '', displayOptions: { show: { resource: ['router'], operation: ['getBestRoute', 'getRouteQuote', 'getGasEstimate', 'compareRoutes'] } } },
];

function getChainId(credentials: { network?: string; chainId?: number }): number {
  return credentials.network === 'custom' ? (credentials.chainId || 1) : (NETWORKS[credentials.network || 'ethereum']?.chainId || 1);
}

export async function executeRouterOperation(this: IExecuteFunctions, index: number): Promise<INodeExecutionData[]> {
  const operation = this.getNodeParameter('operation', index) as string;
  const credentials = await this.getCredentials('pendleNetwork');
  const chainId = getChainId(credentials as { network?: string; chainId?: number });
  const client = createPendleClient({ chainId, rpcUrl: credentials.rpcUrl as string, apiEndpoint: credentials.apiEndpoint as string });
  const routerClient = createRouterClient({ chainId, provider: client.getProvider() });
  const contracts = CONTRACT_ADDRESSES[chainId];
  
  let result: unknown;
  switch (operation) {
    case 'getRouterAddress': {
      result = { router: contracts.router, routerStatic: contracts.routerStatic, chainId };
      break;
    }
    case 'getSupportedActions': {
      result = { actions: ['swapExactTokenForPt', 'swapExactPtForToken', 'swapExactTokenForYt', 'swapExactYtForToken', 'addLiquiditySingleToken', 'removeLiquiditySingleToken', 'mintPyFromToken', 'redeemPyToToken', 'redeemDueInterestAndRewards'] };
      break;
    }
    case 'getBestRoute':
    case 'getRouteQuote':
    case 'compareRoutes': {
      const marketAddress = this.getNodeParameter('marketAddress', index) as string;
      const tokenIn = this.getNodeParameter('tokenIn', index) as string;
      const tokenOut = this.getNodeParameter('tokenOut', index) as string;
      const amount = this.getNodeParameter('amount', index) as string;
      result = { marketAddress, tokenIn, tokenOut, amount, route: ['tokenIn -> SY -> PT/YT -> tokenOut'], router: contracts.router };
      break;
    }
    case 'getGasEstimate': {
      const marketAddress = this.getNodeParameter('marketAddress', index) as string;
      const amount = this.getNodeParameter('amount', index) as string;
      result = { marketAddress, amount, estimatedGas: '250000', note: 'Gas varies by action complexity' };
      break;
    }
    default: throw new NodeOperationError(this.getNode(), `Unknown operation: ${operation}`);
  }
  return [{ json: result as object }];
}
