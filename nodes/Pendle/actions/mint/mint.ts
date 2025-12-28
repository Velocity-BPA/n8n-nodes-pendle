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

export const mintOperations: INodeProperties[] = [
  {
    displayName: 'Operation', name: 'operation', type: 'options', noDataExpression: true,
    displayOptions: { show: { resource: ['mint'] } },
    options: [
      { name: 'Mint PT and YT', value: 'mintPtYt', description: 'Mint PT and YT from SY', action: 'Mint PT and YT' },
      { name: 'Get Mint Quote', value: 'getMintQuote', description: 'Get mint output estimate', action: 'Get mint quote' },
      { name: 'Get Mintable Markets', value: 'getMintableMarkets', description: 'List available markets', action: 'Get mintable markets' },
    ],
    default: 'getMintQuote',
  },
];

export const mintFields: INodeProperties[] = [
  { displayName: 'YT Address', name: 'ytAddress', type: 'string', required: true, default: '', placeholder: '0x...', displayOptions: { show: { resource: ['mint'], operation: ['mintPtYt', 'getMintQuote'] } } },
  { displayName: 'Amount', name: 'amount', type: 'string', required: true, default: '1.0', displayOptions: { show: { resource: ['mint'], operation: ['mintPtYt', 'getMintQuote'] } } },
];

function getChainId(credentials: { network?: string; chainId?: number }): number {
  return credentials.network === 'custom' ? (credentials.chainId || 1) : (NETWORKS[credentials.network || 'ethereum']?.chainId || 1);
}

export async function executeMintOperation(this: IExecuteFunctions, index: number): Promise<INodeExecutionData[]> {
  const operation = this.getNodeParameter('operation', index) as string;
  const credentials = await this.getCredentials('pendleNetwork');
  const chainId = getChainId(credentials as { network?: string; chainId?: number });
  const client = createPendleClient({ chainId, rpcUrl: credentials.rpcUrl as string, apiEndpoint: credentials.apiEndpoint as string });
  
  let result: unknown;
  switch (operation) {
    case 'mintPtYt':
    case 'getMintQuote': {
      const ytAddress = this.getNodeParameter('ytAddress', index) as string;
      const amount = this.getNodeParameter('amount', index) as string;
      result = { operation, ytAddress, amount, note: 'Minting 1 SY produces 1 PT + 1 YT' };
      break;
    }
    case 'getMintableMarkets': {
      const markets = await client.getActiveMarkets();
      result = { markets: markets.map(m => ({ address: m.address, name: m.name })), count: markets.length };
      break;
    }
    default: throw new NodeOperationError(this.getNode(), `Unknown operation: ${operation}`);
  }
  return [{ json: result as object }];
}
