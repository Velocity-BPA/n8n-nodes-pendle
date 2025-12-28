/*
 * Copyright (c) Velocity BPA, LLC
 * Licensed under the Business Source License 1.1
 * Commercial use requires a separate commercial license.
 * See LICENSE file for details.
 */

import type { IExecuteFunctions, INodeExecutionData, INodeProperties } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
import { createPendleClient } from '../transport/pendleClient';
import { NETWORKS, CONTRACT_ADDRESSES, VE_PENDLE_ABI } from '../constants';
import { calculateVePendleBalance, formatExpiryDate, getMaxLockExpiry, roundToWeek } from '../utils';
import { ethers } from 'ethers';

export const stakingOperations: INodeProperties[] = [
  {
    displayName: 'Operation', name: 'operation', type: 'options', noDataExpression: true,
    displayOptions: { show: { resource: ['staking'] } },
    options: [
      { name: 'Get vePENDLE Info', value: 'getVePendleInfo', description: 'Get vePENDLE contract info', action: 'Get vePENDLE info' },
      { name: 'Lock PENDLE', value: 'lockPendle', description: 'Lock PENDLE for vePENDLE', action: 'Lock PENDLE' },
      { name: 'Extend Lock', value: 'extendLock', description: 'Extend lock duration', action: 'Extend lock' },
      { name: 'Increase Lock Amount', value: 'increaseLockAmount', description: 'Add more PENDLE to lock', action: 'Increase lock amount' },
      { name: 'Get Lock Info', value: 'getLockInfo', description: 'Get user lock details', action: 'Get lock info' },
      { name: 'Get vePENDLE Balance', value: 'getVePendleBalance', description: 'Get vePENDLE balance', action: 'Get vePENDLE balance' },
      { name: 'Get Voting Power', value: 'getVotingPower', description: 'Get current voting power', action: 'Get voting power' },
      { name: 'Calculate vePENDLE', value: 'calculateVePendle', description: 'Calculate vePENDLE output', action: 'Calculate vePENDLE' },
      { name: 'Withdraw', value: 'withdraw', description: 'Withdraw after lock expires', action: 'Withdraw' },
    ],
    default: 'getVePendleInfo',
  },
];

export const stakingFields: INodeProperties[] = [
  { displayName: 'Wallet Address', name: 'walletAddress', type: 'string', required: true, default: '', placeholder: '0x...', displayOptions: { show: { resource: ['staking'], operation: ['getLockInfo', 'getVePendleBalance', 'getVotingPower', 'withdraw'] } } },
  { displayName: 'Amount', name: 'amount', type: 'string', required: true, default: '', placeholder: '100', description: 'PENDLE amount to lock', displayOptions: { show: { resource: ['staking'], operation: ['lockPendle', 'increaseLockAmount', 'calculateVePendle'] } } },
  { displayName: 'Lock Duration (Weeks)', name: 'lockWeeks', type: 'number', required: true, default: 52, description: 'Lock duration in weeks (1-104)', displayOptions: { show: { resource: ['staking'], operation: ['lockPendle', 'extendLock', 'calculateVePendle'] } } },
];

function getChainId(credentials: { network?: string; chainId?: number }): number {
  return credentials.network === 'custom' ? (credentials.chainId || 1) : (NETWORKS[credentials.network || 'ethereum']?.chainId || 1);
}

export async function executeStakingOperation(this: IExecuteFunctions, index: number): Promise<INodeExecutionData[]> {
  const operation = this.getNodeParameter('operation', index) as string;
  const credentials = await this.getCredentials('pendleNetwork');
  const chainId = getChainId(credentials as { network?: string; chainId?: number });
  const client = createPendleClient({ chainId, rpcUrl: credentials.rpcUrl as string, apiEndpoint: credentials.apiEndpoint as string });
  const contracts = CONTRACT_ADDRESSES[chainId];
  
  let result: unknown;
  switch (operation) {
    case 'getVePendleInfo': {
      const vePendle = new ethers.Contract(contracts.vePendle, VE_PENDLE_ABI, client.getProvider());
      const totalSupply = await vePendle.totalSupply();
      result = { vePendleAddress: contracts.vePendle, totalSupply: ethers.formatUnits(totalSupply, 18), chainId };
      break;
    }
    case 'getLockInfo':
    case 'getVePendleBalance':
    case 'getVotingPower': {
      const walletAddress = this.getNodeParameter('walletAddress', index) as string;
      const vePendle = new ethers.Contract(contracts.vePendle, VE_PENDLE_ABI, client.getProvider());
      const [balance, position] = await Promise.all([vePendle.balanceOf(walletAddress), vePendle.positionData(walletAddress)]);
      result = { walletAddress, vePendleBalance: ethers.formatUnits(balance, 18), lockedAmount: ethers.formatUnits(position.amount, 18), lockExpiry: Number(position.expiry), lockExpiryDate: formatExpiryDate(Number(position.expiry)) };
      break;
    }
    case 'lockPendle':
    case 'increaseLockAmount': {
      const amount = this.getNodeParameter('amount', index) as string;
      const lockWeeks = this.getNodeParameter('lockWeeks', index, 52) as number;
      const lockExpiry = roundToWeek(Math.floor(Date.now() / 1000) + lockWeeks * 7 * 24 * 3600);
      const estimatedVePendle = calculateVePendleBalance(parseFloat(amount), lockExpiry);
      result = { operation, amount, lockWeeks, lockExpiry, lockExpiryDate: formatExpiryDate(lockExpiry), estimatedVePendle: estimatedVePendle.toFixed(4), note: 'Execute through vePENDLE contract' };
      break;
    }
    case 'extendLock': {
      const lockWeeks = this.getNodeParameter('lockWeeks', index) as number;
      const newExpiry = roundToWeek(Math.floor(Date.now() / 1000) + lockWeeks * 7 * 24 * 3600);
      result = { operation: 'extendLock', newLockWeeks: lockWeeks, newExpiry, newExpiryDate: formatExpiryDate(newExpiry), maxExpiry: getMaxLockExpiry() };
      break;
    }
    case 'calculateVePendle': {
      const amount = this.getNodeParameter('amount', index) as string;
      const lockWeeks = this.getNodeParameter('lockWeeks', index) as number;
      const lockExpiry = roundToWeek(Math.floor(Date.now() / 1000) + lockWeeks * 7 * 24 * 3600);
      const vePendleAmount = calculateVePendleBalance(parseFloat(amount), lockExpiry);
      result = { pendleAmount: amount, lockWeeks, lockExpiry, vePendleAmount: vePendleAmount.toFixed(4), ratio: (vePendleAmount / parseFloat(amount)).toFixed(4) };
      break;
    }
    case 'withdraw': {
      const walletAddress = this.getNodeParameter('walletAddress', index) as string;
      result = { operation: 'withdraw', walletAddress, note: 'Withdraw available after lock expiry' };
      break;
    }
    default: throw new NodeOperationError(this.getNode(), `Unknown operation: ${operation}`);
  }
  return [{ json: result as object }];
}
