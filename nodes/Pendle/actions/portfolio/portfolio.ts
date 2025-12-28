/*
 * Copyright (c) Velocity BPA, LLC
 * Licensed under the Business Source License 1.1
 * Commercial use requires a separate commercial license.
 * See LICENSE file for details.
 */

import type { IExecuteFunctions, INodeExecutionData, INodeProperties } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
import { createPendleClient } from '../transport/pendleClient';
import { createSubgraphClient } from '../transport/subgraphClient';
import { NETWORKS, CONTRACT_ADDRESSES, VE_PENDLE_ABI } from '../constants';
import { ethers } from 'ethers';

export const portfolioOperations: INodeProperties[] = [
  {
    displayName: 'Operation', name: 'operation', type: 'options', noDataExpression: true,
    displayOptions: { show: { resource: ['portfolio'] } },
    options: [
      { name: 'Get Portfolio Overview', value: 'getPortfolioOverview', description: 'Get complete portfolio summary', action: 'Get portfolio overview' },
      { name: 'Get PT Holdings', value: 'getPtHoldings', description: 'Get PT token holdings', action: 'Get PT holdings' },
      { name: 'Get YT Holdings', value: 'getYtHoldings', description: 'Get YT token holdings', action: 'Get YT holdings' },
      { name: 'Get LP Holdings', value: 'getLpHoldings', description: 'Get LP position holdings', action: 'Get LP holdings' },
      { name: 'Get vePENDLE Holdings', value: 'getVePendleHoldings', description: 'Get vePENDLE holdings', action: 'Get vePENDLE holdings' },
      { name: 'Get Total Value', value: 'getTotalValue', description: 'Get total portfolio value', action: 'Get total value' },
      { name: 'Get Claimable Yield', value: 'getClaimableYield', description: 'Get claimable yield across positions', action: 'Get claimable yield' },
      { name: 'Get Position History', value: 'getPositionHistory', description: 'Get historical positions', action: 'Get position history' },
    ],
    default: 'getPortfolioOverview',
  },
];

export const portfolioFields: INodeProperties[] = [
  { displayName: 'Wallet Address', name: 'walletAddress', type: 'string', required: true, default: '', placeholder: '0x...', displayOptions: { show: { resource: ['portfolio'] } } },
];

function getChainId(credentials: { network?: string; chainId?: number }): number {
  return credentials.network === 'custom' ? (credentials.chainId || 1) : (NETWORKS[credentials.network || 'ethereum']?.chainId || 1);
}

export async function executePortfolioOperation(this: IExecuteFunctions, index: number): Promise<INodeExecutionData[]> {
  const operation = this.getNodeParameter('operation', index) as string;
  const credentials = await this.getCredentials('pendleNetwork');
  const chainId = getChainId(credentials as { network?: string; chainId?: number });
  const client = createPendleClient({ chainId, rpcUrl: credentials.rpcUrl as string, apiEndpoint: credentials.apiEndpoint as string });
  const subgraphClient = createSubgraphClient({ chainId });
  const contracts = CONTRACT_ADDRESSES[chainId];
  const walletAddress = this.getNodeParameter('walletAddress', index) as string;
  
  let result: unknown;
  switch (operation) {
    case 'getPortfolioOverview': {
      const positions = await subgraphClient.queryPositions(walletAddress);
      const vePendle = new ethers.Contract(contracts.vePendle, VE_PENDLE_ABI, client.getProvider());
      const vePendleBalance = await vePendle.balanceOf(walletAddress);
      result = { walletAddress, chainId, positions: positions.length, vePendleBalance: ethers.formatUnits(vePendleBalance, 18), positionDetails: positions };
      break;
    }
    case 'getPtHoldings':
    case 'getYtHoldings':
    case 'getLpHoldings': {
      const positions = await subgraphClient.queryPositions(walletAddress);
      result = { walletAddress, positions: positions.map(p => ({ market: p.market.symbol, lpBalance: p.lpBalance, ptBalance: p.ptBalance, ytBalance: p.ytBalance })) };
      break;
    }
    case 'getVePendleHoldings': {
      const vePendle = new ethers.Contract(contracts.vePendle, VE_PENDLE_ABI, client.getProvider());
      const [balance, position] = await Promise.all([vePendle.balanceOf(walletAddress), vePendle.positionData(walletAddress)]);
      result = { walletAddress, vePendleBalance: ethers.formatUnits(balance, 18), lockedPendle: ethers.formatUnits(position.amount, 18), lockExpiry: Number(position.expiry) };
      break;
    }
    case 'getTotalValue':
    case 'getClaimableYield': {
      const positions = await subgraphClient.queryPositions(walletAddress);
      result = { walletAddress, positionCount: positions.length, note: 'Calculate value from position balances and current prices' };
      break;
    }
    case 'getPositionHistory': {
      const transactions = await subgraphClient.queryTransactions(20, 0, walletAddress);
      result = { walletAddress, transactions: transactions.map(t => ({ hash: t.hash, type: t.type, market: t.market.symbol, timestamp: t.timestamp })) };
      break;
    }
    default: throw new NodeOperationError(this.getNode(), `Unknown operation: ${operation}`);
  }
  return [{ json: result as object }];
}
