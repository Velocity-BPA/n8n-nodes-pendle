/*
 * Copyright (c) Velocity BPA, LLC
 * Licensed under the Business Source License 1.1
 * Commercial use requires a separate commercial license.
 * See LICENSE file for details.
 */

import type { IExecuteFunctions, INodeExecutionData, INodeProperties } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
import { createPendleClient } from '../transport/pendleClient';
import { NETWORKS, getSYTokensForChain } from '../constants';
import { ethers } from 'ethers';

export const syOperations: INodeProperties[] = [
  {
    displayName: 'Operation',
    name: 'operation',
    type: 'options',
    noDataExpression: true,
    displayOptions: { show: { resource: ['sy'] } },
    options: [
      { name: 'Get SY Info', value: 'getSyInfo', description: 'Get Standardized Yield token info', action: 'Get SY info' },
      { name: 'Get SY Balance', value: 'getSyBalance', description: 'Get SY balance', action: 'Get SY balance' },
      { name: 'Get SY Exchange Rate', value: 'getSyExchangeRate', description: 'Get SY to underlying rate', action: 'Get SY exchange rate' },
      { name: 'Get Supported SY Tokens', value: 'getSupportedSyTokens', description: 'List supported SY tokens', action: 'Get supported SY tokens' },
      { name: 'Wrap to SY', value: 'wrapToSy', description: 'Wrap underlying to SY', action: 'Wrap to SY' },
      { name: 'Unwrap from SY', value: 'unwrapFromSy', description: 'Unwrap SY to underlying', action: 'Unwrap from SY' },
      { name: 'Get SY Rewards', value: 'getSyRewards', description: 'Get claimable rewards', action: 'Get SY rewards' },
      { name: 'Claim SY Rewards', value: 'claimSyRewards', description: 'Claim SY rewards', action: 'Claim SY rewards' },
    ],
    default: 'getSyInfo',
  },
];

export const syFields: INodeProperties[] = [
  {
    displayName: 'SY Address',
    name: 'syAddress',
    type: 'string',
    required: true,
    default: '',
    placeholder: '0x...',
    description: 'Standardized Yield token address',
    displayOptions: {
      show: { resource: ['sy'], operation: ['getSyInfo', 'getSyBalance', 'getSyExchangeRate', 'wrapToSy', 'unwrapFromSy', 'getSyRewards', 'claimSyRewards'] },
    },
  },
  {
    displayName: 'Wallet Address',
    name: 'walletAddress',
    type: 'string',
    required: true,
    default: '',
    placeholder: '0x...',
    description: 'Wallet address',
    displayOptions: {
      show: { resource: ['sy'], operation: ['getSyBalance', 'getSyRewards', 'claimSyRewards'] },
    },
  },
  {
    displayName: 'Amount',
    name: 'amount',
    type: 'string',
    required: true,
    default: '',
    placeholder: '1.0',
    description: 'Amount to wrap/unwrap',
    displayOptions: {
      show: { resource: ['sy'], operation: ['wrapToSy', 'unwrapFromSy'] },
    },
  },
  {
    displayName: 'Token In',
    name: 'tokenIn',
    type: 'string',
    default: '',
    placeholder: '0x...',
    description: 'Token to deposit',
    displayOptions: {
      show: { resource: ['sy'], operation: ['wrapToSy'] },
    },
  },
  {
    displayName: 'Token Out',
    name: 'tokenOut',
    type: 'string',
    default: '',
    placeholder: '0x...',
    description: 'Token to receive',
    displayOptions: {
      show: { resource: ['sy'], operation: ['unwrapFromSy'] },
    },
  },
];

function getChainId(credentials: { network?: string; chainId?: number }): number {
  const network = credentials.network || 'ethereum';
  if (network === 'custom') return credentials.chainId || 1;
  return NETWORKS[network]?.chainId || 1;
}

export async function executeSyOperation(
  this: IExecuteFunctions,
  index: number,
): Promise<INodeExecutionData[]> {
  const operation = this.getNodeParameter('operation', index) as string;
  const credentials = await this.getCredentials('pendleNetwork');
  
  const chainId = getChainId(credentials as { network?: string; chainId?: number });
  const rpcUrl = credentials.rpcUrl as string | undefined;
  const apiEndpoint = credentials.apiEndpoint as string | undefined;

  const client = createPendleClient({ chainId, rpcUrl, apiEndpoint });
  let result: unknown;

  switch (operation) {
    case 'getSyInfo': {
      const syAddress = this.getNodeParameter('syAddress', index) as string;
      result = await client.getSYInfo(syAddress);
      break;
    }

    case 'getSyBalance': {
      const syAddress = this.getNodeParameter('syAddress', index) as string;
      const walletAddress = this.getNodeParameter('walletAddress', index) as string;
      result = await client.getSYBalance(syAddress, walletAddress);
      break;
    }

    case 'getSyExchangeRate': {
      const syAddress = this.getNodeParameter('syAddress', index) as string;
      const exchangeRate = await client.getSYExchangeRate(syAddress);
      result = {
        syAddress,
        exchangeRate: exchangeRate.toString(),
        exchangeRateFormatted: (Number(exchangeRate) / 1e18).toFixed(8),
      };
      break;
    }

    case 'getSupportedSyTokens': {
      const tokens = getSYTokensForChain(chainId);
      result = {
        chainId,
        tokens,
        count: tokens.length,
      };
      break;
    }

    case 'wrapToSy': {
      const syAddress = this.getNodeParameter('syAddress', index) as string;
      const amount = this.getNodeParameter('amount', index) as string;
      const tokenIn = this.getNodeParameter('tokenIn', index, '') as string;
      
      const syInfo = await client.getSYInfo(syAddress);
      const defaultTokenIn = tokenIn || syInfo.tokensIn[0];
      
      result = {
        operation: 'wrapToSy',
        syAddress,
        tokenIn: defaultTokenIn,
        amount,
        availableTokensIn: syInfo.tokensIn,
        note: 'Execute deposit through SY contract',
      };
      break;
    }

    case 'unwrapFromSy': {
      const syAddress = this.getNodeParameter('syAddress', index) as string;
      const amount = this.getNodeParameter('amount', index) as string;
      const tokenOut = this.getNodeParameter('tokenOut', index, '') as string;
      
      const syInfo = await client.getSYInfo(syAddress);
      const defaultTokenOut = tokenOut || syInfo.tokensOut[0];
      
      result = {
        operation: 'unwrapFromSy',
        syAddress,
        tokenOut: defaultTokenOut,
        amount,
        availableTokensOut: syInfo.tokensOut,
        note: 'Execute redeem through SY contract',
      };
      break;
    }

    case 'getSyRewards': {
      const syAddress = this.getNodeParameter('syAddress', index) as string;
      const walletAddress = this.getNodeParameter('walletAddress', index) as string;
      
      result = {
        syAddress,
        walletAddress,
        message: 'Query rewards through SY accruedRewards function',
        note: 'Rewards vary by SY implementation',
      };
      break;
    }

    case 'claimSyRewards': {
      const syAddress = this.getNodeParameter('syAddress', index) as string;
      const walletAddress = this.getNodeParameter('walletAddress', index) as string;
      
      result = {
        operation: 'claimSyRewards',
        syAddress,
        walletAddress,
        note: 'Execute through SY claimRewards function',
      };
      break;
    }

    default:
      throw new NodeOperationError(this.getNode(), `Unknown operation: ${operation}`);
  }

  return [{ json: result as object }];
}
