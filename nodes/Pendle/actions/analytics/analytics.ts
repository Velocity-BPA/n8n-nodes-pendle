/*
 * Copyright (c) Velocity BPA, LLC
 * Licensed under the Business Source License 1.1
 * Commercial use requires a separate commercial license.
 * See LICENSE file for details.
 */

import type { IExecuteFunctions, INodeExecutionData, INodeProperties } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
import { createPendleClient } from '../transport/pendleClient';
import { NETWORKS } from '../constants';

export const analyticsOperations: INodeProperties[] = [
  {
    displayName: 'Operation', name: 'operation', type: 'options', noDataExpression: true,
    displayOptions: { show: { resource: ['analytics'] } },
    options: [
      { name: 'Get Protocol TVL', value: 'getProtocolTvl', description: 'Get total value locked', action: 'Get protocol TVL' },
      { name: 'Get TVL by Chain', value: 'getTvlByChain', description: 'Get TVL per chain', action: 'Get TVL by chain' },
      { name: 'Get Volume Stats', value: 'getVolumeStats', description: 'Get trading volume stats', action: 'Get volume stats' },
      { name: 'Get APY Stats', value: 'getApyStats', description: 'Get APY statistics', action: 'Get APY stats' },
      { name: 'Get Market Rankings', value: 'getMarketRankings', description: 'Get top markets', action: 'Get market rankings' },
      { name: 'Get Top Markets', value: 'getTopMarkets', description: 'Get highest TVL markets', action: 'Get top markets' },
      { name: 'Get Historical Data', value: 'getHistoricalData', description: 'Get historical metrics', action: 'Get historical data' },
    ],
    default: 'getProtocolTvl',
  },
];

export const analyticsFields: INodeProperties[] = [
  { displayName: 'Limit', name: 'limit', type: 'number', default: 10, description: 'Number of results to return', displayOptions: { show: { resource: ['analytics'], operation: ['getMarketRankings', 'getTopMarkets'] } } },
  { displayName: 'Sort By', name: 'sortBy', type: 'options', options: [{ name: 'TVL', value: 'tvl' }, { name: 'Volume', value: 'volume' }, { name: 'APY', value: 'apy' }], default: 'tvl', displayOptions: { show: { resource: ['analytics'], operation: ['getMarketRankings', 'getTopMarkets'] } } },
];

function getChainId(credentials: { network?: string; chainId?: number }): number {
  return credentials.network === 'custom' ? (credentials.chainId || 1) : (NETWORKS[credentials.network || 'ethereum']?.chainId || 1);
}

export async function executeAnalyticsOperation(this: IExecuteFunctions, index: number): Promise<INodeExecutionData[]> {
  const operation = this.getNodeParameter('operation', index) as string;
  const credentials = await this.getCredentials('pendleNetwork');
  const chainId = getChainId(credentials as { network?: string; chainId?: number });
  const client = createPendleClient({ chainId, rpcUrl: credentials.rpcUrl as string, apiEndpoint: credentials.apiEndpoint as string });
  
  let result: unknown;
  switch (operation) {
    case 'getProtocolTvl': {
      const stats = await client.getProtocolStats();
      result = { chainId, totalTvl: stats.totalTvl, totalTvlFormatted: `$${stats.totalTvl.toLocaleString()}` };
      break;
    }
    case 'getTvlByChain': {
      const stats = await client.getProtocolStats();
      result = { chainId, tvl: stats.totalTvl, network: NETWORKS[Object.keys(NETWORKS).find(k => NETWORKS[k].chainId === chainId) || 'ethereum']?.displayName };
      break;
    }
    case 'getVolumeStats': {
      const stats = await client.getProtocolStats();
      result = { chainId, volume24h: stats.totalVolume24h, volume24hFormatted: `$${stats.totalVolume24h.toLocaleString()}` };
      break;
    }
    case 'getApyStats': {
      const markets = await client.getActiveMarkets();
      const apys = markets.map(m => m.impliedApy).filter(a => a > 0);
      result = { avgApy: apys.reduce((a, b) => a + b, 0) / apys.length, maxApy: Math.max(...apys), minApy: Math.min(...apys), marketCount: apys.length };
      break;
    }
    case 'getMarketRankings':
    case 'getTopMarkets': {
      const limit = this.getNodeParameter('limit', index, 10) as number;
      const sortBy = this.getNodeParameter('sortBy', index, 'tvl') as string;
      const markets = await client.getActiveMarkets();
      const sorted = markets.sort((a, b) => sortBy === 'apy' ? b.impliedApy - a.impliedApy : sortBy === 'volume' ? b.volume24h - a.volume24h : b.tvl - a.tvl);
      result = { markets: sorted.slice(0, limit).map((m, i) => ({ rank: i + 1, address: m.address, name: m.name, tvl: m.tvl, volume24h: m.volume24h, impliedApy: m.impliedApy })) };
      break;
    }
    case 'getHistoricalData': {
      result = { note: 'Query historical data through subgraph' };
      break;
    }
    default: throw new NodeOperationError(this.getNode(), `Unknown operation: ${operation}`);
  }
  return [{ json: result as object }];
}
