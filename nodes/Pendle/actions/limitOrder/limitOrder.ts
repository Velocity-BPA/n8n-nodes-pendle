/*
 * Copyright (c) Velocity BPA, LLC
 * Licensed under the Business Source License 1.1
 * Commercial use requires a separate commercial license.
 * See LICENSE file for details.
 */

import type { IExecuteFunctions, INodeExecutionData, INodeProperties } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
import { createPendleClient } from '../transport/pendleClient';
import { NETWORKS, CONTRACT_ADDRESSES } from '../constants';

export const limitOrderOperations: INodeProperties[] = [
  {
    displayName: 'Operation', name: 'operation', type: 'options', noDataExpression: true,
    displayOptions: { show: { resource: ['limitOrder'] } },
    options: [
      { name: 'Create Limit Order', value: 'createLimitOrder', description: 'Create new limit order', action: 'Create limit order' },
      { name: 'Get Limit Order', value: 'getLimitOrder', description: 'Get order details', action: 'Get limit order' },
      { name: 'Get Open Orders', value: 'getOpenOrders', description: 'Get user open orders', action: 'Get open orders' },
      { name: 'Cancel Limit Order', value: 'cancelLimitOrder', description: 'Cancel existing order', action: 'Cancel limit order' },
      { name: 'Get Order Status', value: 'getOrderStatus', description: 'Check order status', action: 'Get order status' },
      { name: 'Get Order Book', value: 'getOrderBook', description: 'Get market order book', action: 'Get order book' },
    ],
    default: 'getOpenOrders',
  },
];

export const limitOrderFields: INodeProperties[] = [
  { displayName: 'Market Address', name: 'marketAddress', type: 'string', required: true, default: '', placeholder: '0x...', displayOptions: { show: { resource: ['limitOrder'] } } },
  { displayName: 'Wallet Address', name: 'walletAddress', type: 'string', default: '', placeholder: '0x...', displayOptions: { show: { resource: ['limitOrder'], operation: ['getOpenOrders', 'createLimitOrder'] } } },
  { displayName: 'Order Hash', name: 'orderHash', type: 'string', default: '', placeholder: '0x...', displayOptions: { show: { resource: ['limitOrder'], operation: ['getLimitOrder', 'cancelLimitOrder', 'getOrderStatus'] } } },
  { displayName: 'Order Type', name: 'orderType', type: 'options', options: [{ name: 'Buy PT', value: 'buyPt' }, { name: 'Sell PT', value: 'sellPt' }, { name: 'Buy YT', value: 'buyYt' }, { name: 'Sell YT', value: 'sellYt' }], default: 'buyPt', displayOptions: { show: { resource: ['limitOrder'], operation: ['createLimitOrder'] } } },
  { displayName: 'Amount', name: 'amount', type: 'string', default: '', displayOptions: { show: { resource: ['limitOrder'], operation: ['createLimitOrder'] } } },
  { displayName: 'Target Rate (%)', name: 'targetRate', type: 'number', default: 5, description: 'Target implied rate for the order', displayOptions: { show: { resource: ['limitOrder'], operation: ['createLimitOrder'] } } },
];

function getChainId(credentials: { network?: string; chainId?: number }): number {
  return credentials.network === 'custom' ? (credentials.chainId || 1) : (NETWORKS[credentials.network || 'ethereum']?.chainId || 1);
}

export async function executeLimitOrderOperation(this: IExecuteFunctions, index: number): Promise<INodeExecutionData[]> {
  const operation = this.getNodeParameter('operation', index) as string;
  const credentials = await this.getCredentials('pendleNetwork');
  const chainId = getChainId(credentials as { network?: string; chainId?: number });
  const client = createPendleClient({ chainId, rpcUrl: credentials.rpcUrl as string, apiEndpoint: credentials.apiEndpoint as string });
  const contracts = CONTRACT_ADDRESSES[chainId];
  const marketAddress = this.getNodeParameter('marketAddress', index) as string;
  
  let result: unknown;
  switch (operation) {
    case 'createLimitOrder': {
      const walletAddress = this.getNodeParameter('walletAddress', index) as string;
      const orderType = this.getNodeParameter('orderType', index) as string;
      const amount = this.getNodeParameter('amount', index) as string;
      const targetRate = this.getNodeParameter('targetRate', index) as number;
      result = { operation: 'createLimitOrder', marketAddress, walletAddress, orderType, amount, targetRate: `${targetRate}%`, limitOrderManager: contracts.limitOrderManager, note: 'Execute through limit order manager' };
      break;
    }
    case 'getLimitOrder':
    case 'cancelLimitOrder':
    case 'getOrderStatus': {
      const orderHash = this.getNodeParameter('orderHash', index) as string;
      result = { operation, marketAddress, orderHash, limitOrderManager: contracts.limitOrderManager };
      break;
    }
    case 'getOpenOrders': {
      const walletAddress = this.getNodeParameter('walletAddress', index) as string;
      result = { operation: 'getOpenOrders', marketAddress, walletAddress, note: 'Query through limit order manager events' };
      break;
    }
    case 'getOrderBook': {
      result = { operation: 'getOrderBook', marketAddress, note: 'Aggregate from limit order manager' };
      break;
    }
    default: throw new NodeOperationError(this.getNode(), `Unknown operation: ${operation}`);
  }
  return [{ json: result as object }];
}
