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

export const rewardsOperations: INodeProperties[] = [
  {
    displayName: 'Operation', name: 'operation', type: 'options', noDataExpression: true,
    displayOptions: { show: { resource: ['rewards'] } },
    options: [
      { name: 'Get Claimable Rewards', value: 'getClaimableRewards', description: 'Get all claimable rewards', action: 'Get claimable rewards' },
      { name: 'Get PENDLE Rewards', value: 'getPendleRewards', description: 'Get PENDLE token rewards', action: 'Get PENDLE rewards' },
      { name: 'Get LP Rewards', value: 'getLpRewards', description: 'Get LP position rewards', action: 'Get LP rewards' },
      { name: 'Get Voting Rewards', value: 'getVotingRewards', description: 'Get vePENDLE voting rewards', action: 'Get voting rewards' },
      { name: 'Claim Rewards', value: 'claimRewards', description: 'Claim specific rewards', action: 'Claim rewards' },
      { name: 'Claim All Rewards', value: 'claimAllRewards', description: 'Claim all available rewards', action: 'Claim all rewards' },
      { name: 'Get Reward APR', value: 'getRewardApr', description: 'Get reward APR for position', action: 'Get reward APR' },
      { name: 'Get Boosted APR', value: 'getBoostedApr', description: 'Get vePENDLE boosted APR', action: 'Get boosted APR' },
    ],
    default: 'getClaimableRewards',
  },
];

export const rewardsFields: INodeProperties[] = [
  { displayName: 'Wallet Address', name: 'walletAddress', type: 'string', required: true, default: '', placeholder: '0x...', displayOptions: { show: { resource: ['rewards'] } } },
  { displayName: 'Market Address', name: 'marketAddress', type: 'string', default: '', placeholder: '0x...', displayOptions: { show: { resource: ['rewards'], operation: ['getLpRewards', 'getRewardApr', 'getBoostedApr', 'claimRewards'] } } },
];

function getChainId(credentials: { network?: string; chainId?: number }): number {
  return credentials.network === 'custom' ? (credentials.chainId || 1) : (NETWORKS[credentials.network || 'ethereum']?.chainId || 1);
}

export async function executeRewardsOperation(this: IExecuteFunctions, index: number): Promise<INodeExecutionData[]> {
  const operation = this.getNodeParameter('operation', index) as string;
  const credentials = await this.getCredentials('pendleNetwork');
  const chainId = getChainId(credentials as { network?: string; chainId?: number });
  const client = createPendleClient({ chainId, rpcUrl: credentials.rpcUrl as string, apiEndpoint: credentials.apiEndpoint as string });
  const walletAddress = this.getNodeParameter('walletAddress', index) as string;
  
  let result: unknown;
  switch (operation) {
    case 'getClaimableRewards':
    case 'getPendleRewards':
    case 'getVotingRewards':
    case 'claimAllRewards': {
      result = { walletAddress, operation, note: 'Query rewards through router redeemDueInterestAndRewards' };
      break;
    }
    case 'getLpRewards':
    case 'getRewardApr':
    case 'getBoostedApr':
    case 'claimRewards': {
      const marketAddress = this.getNodeParameter('marketAddress', index, '') as string;
      const marketData = marketAddress ? await client.getMarketByAddress(marketAddress) : null;
      result = { walletAddress, marketAddress, marketName: marketData?.name, operation, note: 'Rewards vary by market and vePENDLE balance' };
      break;
    }
    default: throw new NodeOperationError(this.getNode(), `Unknown operation: ${operation}`);
  }
  return [{ json: result as object }];
}
