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

export const redeemOperations: INodeProperties[] = [
  {
    displayName: 'Operation', name: 'operation', type: 'options', noDataExpression: true,
    displayOptions: { show: { resource: ['redeem'] } },
    options: [
      { name: 'Redeem PT', value: 'redeemPt', description: 'Redeem PT after maturity', action: 'Redeem PT' },
      { name: 'Redeem YT', value: 'redeemYt', description: 'Redeem remaining YT value', action: 'Redeem YT' },
      { name: 'Redeem PT + YT', value: 'redeemPtYt', description: 'Redeem PT and YT together', action: 'Redeem PT and YT' },
      { name: 'Get Redeem Quote', value: 'getRedeemQuote', description: 'Get redemption quote', action: 'Get redeem quote' },
      { name: 'Get Redeemable Amount', value: 'getRedeemableAmount', description: 'Get redeemable balance', action: 'Get redeemable amount' },
    ],
    default: 'getRedeemQuote',
  },
];

export const redeemFields: INodeProperties[] = [
  { displayName: 'YT Address', name: 'ytAddress', type: 'string', required: true, default: '', placeholder: '0x...', displayOptions: { show: { resource: ['redeem'] } } },
  { displayName: 'Amount', name: 'amount', type: 'string', required: true, default: '', displayOptions: { show: { resource: ['redeem'], operation: ['redeemPt', 'redeemYt', 'redeemPtYt', 'getRedeemQuote'] } } },
  { displayName: 'Wallet Address', name: 'walletAddress', type: 'string', required: true, default: '', displayOptions: { show: { resource: ['redeem'], operation: ['getRedeemableAmount'] } } },
];

function getChainId(credentials: { network?: string; chainId?: number }): number {
  return credentials.network === 'custom' ? (credentials.chainId || 1) : (NETWORKS[credentials.network || 'ethereum']?.chainId || 1);
}

export async function executeRedeemOperation(this: IExecuteFunctions, index: number): Promise<INodeExecutionData[]> {
  const operation = this.getNodeParameter('operation', index) as string;
  const credentials = await this.getCredentials('pendleNetwork');
  const chainId = getChainId(credentials as { network?: string; chainId?: number });
  const client = createPendleClient({ chainId, rpcUrl: credentials.rpcUrl as string, apiEndpoint: credentials.apiEndpoint as string });
  
  const ytAddress = this.getNodeParameter('ytAddress', index) as string;
  let result: unknown;
  
  switch (operation) {
    case 'redeemPt':
    case 'redeemYt':
    case 'redeemPtYt':
    case 'getRedeemQuote': {
      const amount = this.getNodeParameter('amount', index) as string;
      const ytInfo = await client.getYTInfo(ytAddress);
      result = { operation, ytAddress, amount, isExpired: ytInfo.isExpired, note: ytInfo.isExpired ? 'Market expired - redemption available' : 'Market active - early redemption requires PT+YT pair' };
      break;
    }
    case 'getRedeemableAmount': {
      const walletAddress = this.getNodeParameter('walletAddress', index) as string;
      const [ptBalance, ytBalance] = await Promise.all([
        client.getPTBalance(ytAddress, walletAddress),
        client.getYTBalance(ytAddress, walletAddress),
      ]);
      result = { ytAddress, walletAddress, ptBalance: ptBalance.balanceFormatted, ytBalance: ytBalance.balanceFormatted };
      break;
    }
    default: throw new NodeOperationError(this.getNode(), `Unknown operation: ${operation}`);
  }
  return [{ json: result as object }];
}
