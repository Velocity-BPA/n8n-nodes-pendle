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

export const yieldOperations: INodeProperties[] = [
  {
    displayName: 'Operation', name: 'operation', type: 'options', noDataExpression: true,
    displayOptions: { show: { resource: ['yield'] } },
    options: [
      { name: 'Get Current Yield', value: 'getCurrentYield', description: 'Get current yield rates', action: 'Get current yield' },
      { name: 'Get Implied Yield', value: 'getImpliedYield', description: 'Get market implied yield', action: 'Get implied yield' },
      { name: 'Get Fixed Yield (PT)', value: 'getFixedYield', description: 'Get fixed yield from PT', action: 'Get fixed yield' },
      { name: 'Get Variable Yield (YT)', value: 'getVariableYield', description: 'Get variable yield from YT', action: 'Get variable yield' },
      { name: 'Get Yield History', value: 'getYieldHistory', description: 'Get historical yields', action: 'Get yield history' },
      { name: 'Compare Yields', value: 'compareYields', description: 'Compare yields across markets', action: 'Compare yields' },
      { name: 'Get Yield to Maturity', value: 'getYieldToMaturity', description: 'Calculate YTM', action: 'Get yield to maturity' },
    ],
    default: 'getCurrentYield',
  },
];

export const yieldFields: INodeProperties[] = [
  { displayName: 'Market Address', name: 'marketAddress', type: 'string', required: true, default: '', placeholder: '0x...', displayOptions: { show: { resource: ['yield'] } } },
];

function getChainId(credentials: { network?: string; chainId?: number }): number {
  return credentials.network === 'custom' ? (credentials.chainId || 1) : (NETWORKS[credentials.network || 'ethereum']?.chainId || 1);
}

export async function executeYieldOperation(this: IExecuteFunctions, index: number): Promise<INodeExecutionData[]> {
  const operation = this.getNodeParameter('operation', index) as string;
  const credentials = await this.getCredentials('pendleNetwork');
  const chainId = getChainId(credentials as { network?: string; chainId?: number });
  const client = createPendleClient({ chainId, rpcUrl: credentials.rpcUrl as string, apiEndpoint: credentials.apiEndpoint as string });
  const marketAddress = this.getNodeParameter('marketAddress', index) as string;
  
  let result: unknown;
  switch (operation) {
    case 'getCurrentYield':
    case 'getImpliedYield':
    case 'getFixedYield':
    case 'getYieldToMaturity': {
      const routerClient = createRouterClient({ chainId, provider: client.getProvider() });
      const impliedYield = await routerClient.getImpliedYield(marketAddress);
      const marketData = await client.getMarketByAddress(marketAddress);
      result = { marketAddress, impliedApy: impliedYield, impliedApyFormatted: `${impliedYield.toFixed(2)}%`, underlyingApy: marketData.underlyingApy };
      break;
    }
    case 'getVariableYield': {
      const marketData = await client.getMarketByAddress(marketAddress);
      result = { marketAddress, underlyingApy: marketData.underlyingApy, underlyingApyFormatted: `${marketData.underlyingApy.toFixed(2)}%` };
      break;
    }
    case 'getYieldHistory': {
      result = { marketAddress, note: 'Query yield history through subgraph' };
      break;
    }
    case 'compareYields': {
      const markets = await client.getActiveMarkets();
      const topMarkets = markets.sort((a, b) => b.impliedApy - a.impliedApy).slice(0, 10);
      result = { markets: topMarkets.map(m => ({ address: m.address, name: m.name, impliedApy: m.impliedApy })) };
      break;
    }
    default: throw new NodeOperationError(this.getNode(), `Unknown operation: ${operation}`);
  }
  return [{ json: result as object }];
}
