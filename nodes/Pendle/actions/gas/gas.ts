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
import { ethers } from 'ethers';

export const gasOperations: INodeProperties[] = [
  {
    displayName: 'Operation', name: 'operation', type: 'options', noDataExpression: true,
    displayOptions: { show: { resource: ['gas'] } },
    options: [
      { name: 'Get Gas Estimate', value: 'getGasEstimate', description: 'Get current gas prices', action: 'Get gas estimate' },
      { name: 'Get Priority Fee', value: 'getPriorityFee', description: 'Get priority fee estimate', action: 'Get priority fee' },
      { name: 'Estimate Transaction Gas', value: 'estimateTxGas', description: 'Estimate gas for transaction', action: 'Estimate transaction gas' },
      { name: 'Get Gas by Action', value: 'getGasByAction', description: 'Get gas estimates by action type', action: 'Get gas by action' },
      { name: 'Get Optimal Gas', value: 'getOptimalGas', description: 'Get optimal gas settings', action: 'Get optimal gas' },
      { name: 'Compare Gas Costs', value: 'compareGasCosts', description: 'Compare gas across actions', action: 'Compare gas costs' },
    ],
    default: 'getGasEstimate',
  },
];

export const gasFields: INodeProperties[] = [
  { displayName: 'Action Type', name: 'actionType', type: 'options', options: [{ name: 'Swap', value: 'swap' }, { name: 'Add Liquidity', value: 'addLiquidity' }, { name: 'Remove Liquidity', value: 'removeLiquidity' }, { name: 'Mint PT/YT', value: 'mint' }, { name: 'Redeem', value: 'redeem' }, { name: 'Stake', value: 'stake' }, { name: 'Vote', value: 'vote' }], default: 'swap', displayOptions: { show: { resource: ['gas'], operation: ['getGasByAction', 'estimateTxGas'] } } },
];

function getChainId(credentials: { network?: string; chainId?: number }): number {
  return credentials.network === 'custom' ? (credentials.chainId || 1) : (NETWORKS[credentials.network || 'ethereum']?.chainId || 1);
}

const GAS_ESTIMATES: Record<string, number> = { swap: 250000, addLiquidity: 350000, removeLiquidity: 300000, mint: 200000, redeem: 150000, stake: 180000, vote: 120000 };

export async function executeGasOperation(this: IExecuteFunctions, index: number): Promise<INodeExecutionData[]> {
  const operation = this.getNodeParameter('operation', index) as string;
  const credentials = await this.getCredentials('pendleNetwork');
  const chainId = getChainId(credentials as { network?: string; chainId?: number });
  const client = createPendleClient({ chainId, rpcUrl: credentials.rpcUrl as string, apiEndpoint: credentials.apiEndpoint as string });
  const provider = client.getProvider();
  
  let result: unknown;
  switch (operation) {
    case 'getGasEstimate':
    case 'getPriorityFee':
    case 'getOptimalGas': {
      const feeData = await provider.getFeeData();
      result = { chainId, gasPrice: feeData.gasPrice?.toString(), maxFeePerGas: feeData.maxFeePerGas?.toString(), maxPriorityFeePerGas: feeData.maxPriorityFeePerGas?.toString(), gasPriceGwei: feeData.gasPrice ? ethers.formatUnits(feeData.gasPrice, 'gwei') : '0' };
      break;
    }
    case 'estimateTxGas':
    case 'getGasByAction': {
      const actionType = this.getNodeParameter('actionType', index) as string;
      const gasLimit = GAS_ESTIMATES[actionType] || 250000;
      const feeData = await provider.getFeeData();
      const gasCost = feeData.gasPrice ? BigInt(gasLimit) * feeData.gasPrice : BigInt(0);
      result = { actionType, estimatedGasLimit: gasLimit, gasPrice: feeData.gasPrice?.toString(), estimatedCostWei: gasCost.toString(), estimatedCostEth: ethers.formatEther(gasCost) };
      break;
    }
    case 'compareGasCosts': {
      const feeData = await provider.getFeeData();
      const comparisons = Object.entries(GAS_ESTIMATES).map(([action, gas]) => ({ action, gasLimit: gas, costWei: feeData.gasPrice ? (BigInt(gas) * feeData.gasPrice).toString() : '0' }));
      result = { chainId, gasPrice: feeData.gasPrice?.toString(), actions: comparisons };
      break;
    }
    default: throw new NodeOperationError(this.getNode(), `Unknown operation: ${operation}`);
  }
  return [{ json: result as object }];
}
