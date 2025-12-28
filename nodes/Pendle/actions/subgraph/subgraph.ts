/*
 * Copyright (c) Velocity BPA, LLC
 * Licensed under the Business Source License 1.1
 * Commercial use requires a separate commercial license.
 * See LICENSE file for details.
 */

import type { IExecuteFunctions, INodeExecutionData, INodeProperties } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
import { createSubgraphClient } from '../transport/subgraphClient';
import { NETWORKS } from '../constants';

export const subgraphOperations: INodeProperties[] = [
  {
    displayName: 'Operation', name: 'operation', type: 'options', noDataExpression: true,
    displayOptions: { show: { resource: ['subgraph'] } },
    options: [
      { name: 'Query Markets', value: 'queryMarkets', description: 'Query markets from subgraph', action: 'Query markets' },
      { name: 'Query Positions', value: 'queryPositions', description: 'Query user positions', action: 'Query positions' },
      { name: 'Query Transactions', value: 'queryTransactions', description: 'Query transactions', action: 'Query transactions' },
      { name: 'Query Yields', value: 'queryYields', description: 'Query yield history', action: 'Query yields' },
      { name: 'Query Liquidity', value: 'queryLiquidity', description: 'Query liquidity providers', action: 'Query liquidity' },
      { name: 'Custom GraphQL Query', value: 'customQuery', description: 'Execute custom GraphQL', action: 'Custom GraphQL query' },
      { name: 'Get Subgraph Status', value: 'getSubgraphStatus', description: 'Check subgraph health', action: 'Get subgraph status' },
    ],
    default: 'queryMarkets',
  },
];

export const subgraphFields: INodeProperties[] = [
  { displayName: 'Wallet Address', name: 'walletAddress', type: 'string', default: '', placeholder: '0x...', displayOptions: { show: { resource: ['subgraph'], operation: ['queryPositions', 'queryTransactions'] } } },
  { displayName: 'Market Address', name: 'marketAddress', type: 'string', default: '', placeholder: '0x...', displayOptions: { show: { resource: ['subgraph'], operation: ['queryYields', 'queryLiquidity', 'queryTransactions'] } } },
  { displayName: 'Limit', name: 'limit', type: 'number', default: 100, displayOptions: { show: { resource: ['subgraph'] } } },
  { displayName: 'Custom Query', name: 'customQuery', type: 'string', typeOptions: { rows: 10 }, default: '', placeholder: '{ markets(first: 10) { id name } }', displayOptions: { show: { resource: ['subgraph'], operation: ['customQuery'] } } },
];

function getChainId(credentials: { network?: string; chainId?: number }): number {
  return credentials.network === 'custom' ? (credentials.chainId || 1) : (NETWORKS[credentials.network || 'ethereum']?.chainId || 1);
}

export async function executeSubgraphOperation(this: IExecuteFunctions, index: number): Promise<INodeExecutionData[]> {
  const operation = this.getNodeParameter('operation', index) as string;
  const credentials = await this.getCredentials('pendleNetwork');
  const chainId = getChainId(credentials as { network?: string; chainId?: number });
  const subgraphClient = createSubgraphClient({ chainId });
  const limit = this.getNodeParameter('limit', index, 100) as number;
  
  let result: unknown;
  switch (operation) {
    case 'queryMarkets': {
      const markets = await subgraphClient.queryMarkets(limit);
      result = { markets, count: markets.length };
      break;
    }
    case 'queryPositions': {
      const walletAddress = this.getNodeParameter('walletAddress', index) as string;
      const positions = await subgraphClient.queryPositions(walletAddress, limit);
      result = { walletAddress, positions, count: positions.length };
      break;
    }
    case 'queryTransactions': {
      const walletAddress = this.getNodeParameter('walletAddress', index, '') as string;
      const marketAddress = this.getNodeParameter('marketAddress', index, '') as string;
      const transactions = await subgraphClient.queryTransactions(limit, 0, walletAddress || undefined, marketAddress || undefined);
      result = { transactions, count: transactions.length };
      break;
    }
    case 'queryYields': {
      const marketAddress = this.getNodeParameter('marketAddress', index) as string;
      const yields = await subgraphClient.queryYieldHistory(marketAddress, limit);
      result = { marketAddress, yields, count: yields.length };
      break;
    }
    case 'queryLiquidity': {
      const marketAddress = this.getNodeParameter('marketAddress', index) as string;
      const providers = await subgraphClient.queryLiquidityProviders(marketAddress, limit);
      result = { marketAddress, providers, count: providers.length };
      break;
    }
    case 'customQuery': {
      const query = this.getNodeParameter('customQuery', index) as string;
      result = await subgraphClient.customQuery(query);
      break;
    }
    case 'getSubgraphStatus': {
      const status = await subgraphClient.getStatus();
      result = { chainId, subgraphUrl: subgraphClient.getSubgraphUrl(), ...status };
      break;
    }
    default: throw new NodeOperationError(this.getNode(), `Unknown operation: ${operation}`);
  }
  return [{ json: result as object }];
}
