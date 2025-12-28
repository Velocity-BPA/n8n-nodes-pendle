/*
 * Copyright (c) Velocity BPA, LLC
 * Licensed under the Business Source License 1.1
 * Commercial use requires a separate commercial license.
 * See LICENSE file for details.
 */

import type { IExecuteFunctions, INodeExecutionData, INodeProperties } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
import { createPendleClient } from '../transport/pendleClient';
import { NETWORKS, CONTRACT_ADDRESSES, VOTING_CONTROLLER_ABI } from '../constants';
import { ethers } from 'ethers';

export const votingOperations: INodeProperties[] = [
  {
    displayName: 'Operation', name: 'operation', type: 'options', noDataExpression: true,
    displayOptions: { show: { resource: ['voting'] } },
    options: [
      { name: 'Get Active Pools', value: 'getActivePools', description: 'Get votable pools', action: 'Get active pools' },
      { name: 'Get Vote Allocations', value: 'getVoteAllocations', description: 'Get user vote allocations', action: 'Get vote allocations' },
      { name: 'Vote for Pools', value: 'voteForPools', description: 'Cast votes for pools', action: 'Vote for pools' },
      { name: 'Get Voting Power', value: 'getVotingPower', description: 'Get user voting power', action: 'Get voting power' },
      { name: 'Get Pool Weights', value: 'getPoolWeights', description: 'Get pool vote weights', action: 'Get pool weights' },
      { name: 'Get Voting Epoch', value: 'getVotingEpoch', description: 'Get current epoch info', action: 'Get voting epoch' },
    ],
    default: 'getActivePools',
  },
];

export const votingFields: INodeProperties[] = [
  { displayName: 'Wallet Address', name: 'walletAddress', type: 'string', required: true, default: '', placeholder: '0x...', displayOptions: { show: { resource: ['voting'], operation: ['getVoteAllocations', 'getVotingPower', 'voteForPools'] } } },
  { displayName: 'Pool Address', name: 'poolAddress', type: 'string', default: '', placeholder: '0x...', displayOptions: { show: { resource: ['voting'], operation: ['getPoolWeights'] } } },
];

function getChainId(credentials: { network?: string; chainId?: number }): number {
  return credentials.network === 'custom' ? (credentials.chainId || 1) : (NETWORKS[credentials.network || 'ethereum']?.chainId || 1);
}

export async function executeVotingOperation(this: IExecuteFunctions, index: number): Promise<INodeExecutionData[]> {
  const operation = this.getNodeParameter('operation', index) as string;
  const credentials = await this.getCredentials('pendleNetwork');
  const chainId = getChainId(credentials as { network?: string; chainId?: number });
  const client = createPendleClient({ chainId, rpcUrl: credentials.rpcUrl as string, apiEndpoint: credentials.apiEndpoint as string });
  const contracts = CONTRACT_ADDRESSES[chainId];
  
  let result: unknown;
  switch (operation) {
    case 'getActivePools': {
      const markets = await client.getActiveMarkets();
      result = { pools: markets.map(m => ({ address: m.address, name: m.name, tvl: m.tvl })), count: markets.length };
      break;
    }
    case 'getVoteAllocations':
    case 'getVotingPower': {
      const walletAddress = this.getNodeParameter('walletAddress', index) as string;
      const votingController = new ethers.Contract(contracts.votingController, VOTING_CONTROLLER_ABI, client.getProvider());
      const votingPower = await votingController.getUserVotingPower(walletAddress);
      result = { walletAddress, votingPower: ethers.formatUnits(votingPower, 18) };
      break;
    }
    case 'voteForPools': {
      const walletAddress = this.getNodeParameter('walletAddress', index) as string;
      result = { operation: 'voteForPools', walletAddress, note: 'Execute through voting controller contract' };
      break;
    }
    case 'getPoolWeights': {
      const poolAddress = this.getNodeParameter('poolAddress', index) as string;
      const votingController = new ethers.Contract(contracts.votingController, VOTING_CONTROLLER_ABI, client.getProvider());
      const totalVotes = await votingController.getPoolTotalVotes(poolAddress);
      result = { poolAddress, totalVotes: ethers.formatUnits(totalVotes, 18) };
      break;
    }
    case 'getVotingEpoch': {
      const now = Math.floor(Date.now() / 1000);
      const epochDuration = 604800; // 1 week
      const currentEpoch = Math.floor(now / epochDuration);
      const epochStart = currentEpoch * epochDuration;
      const epochEnd = epochStart + epochDuration;
      result = { currentEpoch, epochStart, epochEnd, timeRemaining: epochEnd - now };
      break;
    }
    default: throw new NodeOperationError(this.getNode(), `Unknown operation: ${operation}`);
  }
  return [{ json: result as object }];
}
