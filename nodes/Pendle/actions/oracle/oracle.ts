/*
 * Copyright (c) Velocity BPA, LLC
 * Licensed under the Business Source License 1.1
 * Commercial use requires a separate commercial license.
 * See LICENSE file for details.
 */

import type { IExecuteFunctions, INodeExecutionData, INodeProperties } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
import { createPendleClient } from '../transport/pendleClient';
import { createOracleClient } from '../transport/oracleClient';
import { NETWORKS, CONTRACT_ADDRESSES, ORACLE_CONFIG } from '../constants';

export const oracleOperations: INodeProperties[] = [
  {
    displayName: 'Operation', name: 'operation', type: 'options', noDataExpression: true,
    displayOptions: { show: { resource: ['oracle'] } },
    options: [
      { name: 'Get PT Oracle Price', value: 'getPtOraclePrice', description: 'Get PT TWAP price', action: 'Get PT oracle price' },
      { name: 'Get TWAP Price', value: 'getTwapPrice', description: 'Get time-weighted average price', action: 'Get TWAP price' },
      { name: 'Get Oracle Status', value: 'getOracleStatus', description: 'Check oracle readiness', action: 'Get oracle status' },
      { name: 'Get Cardinality', value: 'getCardinality', description: 'Get observation count', action: 'Get cardinality' },
      { name: 'Get Oracle Info', value: 'getOracleInfo', description: 'Get comprehensive oracle info', action: 'Get oracle info' },
    ],
    default: 'getPtOraclePrice',
  },
];

export const oracleFields: INodeProperties[] = [
  { displayName: 'Market Address', name: 'marketAddress', type: 'string', required: true, default: '', placeholder: '0x...', displayOptions: { show: { resource: ['oracle'] } } },
  { displayName: 'TWAP Duration (seconds)', name: 'duration', type: 'number', default: 900, description: 'TWAP duration (default 15 minutes)', displayOptions: { show: { resource: ['oracle'] } } },
];

function getChainId(credentials: { network?: string; chainId?: number }): number {
  return credentials.network === 'custom' ? (credentials.chainId || 1) : (NETWORKS[credentials.network || 'ethereum']?.chainId || 1);
}

export async function executeOracleOperation(this: IExecuteFunctions, index: number): Promise<INodeExecutionData[]> {
  const operation = this.getNodeParameter('operation', index) as string;
  const credentials = await this.getCredentials('pendleNetwork');
  const chainId = getChainId(credentials as { network?: string; chainId?: number });
  const client = createPendleClient({ chainId, rpcUrl: credentials.rpcUrl as string, apiEndpoint: credentials.apiEndpoint as string });
  const oracleClient = createOracleClient({ chainId, provider: client.getProvider() });
  
  const marketAddress = this.getNodeParameter('marketAddress', index) as string;
  const duration = this.getNodeParameter('duration', index, ORACLE_CONFIG.DEFAULT_DURATION) as number;
  
  let result: unknown;
  switch (operation) {
    case 'getPtOraclePrice':
    case 'getTwapPrice': {
      const rate = await oracleClient.getPtToAssetRate(marketAddress, duration);
      result = { marketAddress, duration, ptToAssetRate: rate.toString(), ptToAssetRateFormatted: oracleClient.formatRate(rate).toFixed(8) };
      break;
    }
    case 'getOracleStatus': {
      const state = await oracleClient.getOracleState(marketAddress, duration);
      const isReady = await oracleClient.isOracleReady(marketAddress, duration);
      result = { marketAddress, duration, isReady, ...state };
      break;
    }
    case 'getCardinality': {
      const cardinality = await oracleClient.getCardinality(marketAddress);
      const required = oracleClient.calculateRequiredCardinality(duration);
      result = { marketAddress, cardinality, requiredFor: duration, requiredCardinality: required, sufficient: cardinality >= required };
      break;
    }
    case 'getOracleInfo': {
      const info = await oracleClient.getOracleInfo(marketAddress, duration);
      result = { ...info, oracleAddress: oracleClient.getOracleAddress() };
      break;
    }
    default: throw new NodeOperationError(this.getNode(), `Unknown operation: ${operation}`);
  }
  return [{ json: result as object }];
}
