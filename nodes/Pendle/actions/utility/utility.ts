/*
 * Copyright (c) Velocity BPA, LLC
 * Licensed under the Business Source License 1.1
 * Commercial use requires a separate commercial license.
 * See LICENSE file for details.
 */

import type { IExecuteFunctions, INodeExecutionData, INodeProperties } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
import { createPendleClient } from '../transport/pendleClient';
import { NETWORKS, CONTRACT_ADDRESSES, SUPPORTED_CHAIN_IDS, getSYTokensForChain } from '../constants';
import { isValidAddress, calculateImpliedAPY, calculateDaysToMaturity } from '../utils';
import { ethers } from 'ethers';

export const utilityOperations: INodeProperties[] = [
  {
    displayName: 'Operation', name: 'operation', type: 'options', noDataExpression: true,
    displayOptions: { show: { resource: ['utility'] } },
    options: [
      { name: 'Get Supported Tokens', value: 'getSupportedTokens', description: 'List supported SY tokens', action: 'Get supported tokens' },
      { name: 'Get Supported Chains', value: 'getSupportedChains', description: 'List supported networks', action: 'Get supported chains' },
      { name: 'Validate Market Address', value: 'validateMarketAddress', description: 'Validate address format', action: 'Validate market address' },
      { name: 'Convert Units', value: 'convertUnits', description: 'Convert between units', action: 'Convert units' },
      { name: 'Calculate APY', value: 'calculateApy', description: 'Calculate APY from inputs', action: 'Calculate APY' },
      { name: 'Calculate Time to Maturity', value: 'calculateTimeToMaturity', description: 'Get time until expiry', action: 'Calculate time to maturity' },
      { name: 'Get Contract Addresses', value: 'getContractAddresses', description: 'Get protocol addresses', action: 'Get contract addresses' },
      { name: 'Estimate Slippage', value: 'estimateSlippage', description: 'Estimate trade slippage', action: 'Estimate slippage' },
      { name: 'Get Network Status', value: 'getNetworkStatus', description: 'Check network status', action: 'Get network status' },
    ],
    default: 'getSupportedChains',
  },
];

export const utilityFields: INodeProperties[] = [
  { displayName: 'Address', name: 'address', type: 'string', default: '', placeholder: '0x...', displayOptions: { show: { resource: ['utility'], operation: ['validateMarketAddress'] } } },
  { displayName: 'Amount', name: 'amount', type: 'string', default: '1', displayOptions: { show: { resource: ['utility'], operation: ['convertUnits'] } } },
  { displayName: 'From Unit', name: 'fromUnit', type: 'options', options: [{ name: 'Wei', value: 'wei' }, { name: 'Gwei', value: 'gwei' }, { name: 'Ether', value: 'ether' }], default: 'ether', displayOptions: { show: { resource: ['utility'], operation: ['convertUnits'] } } },
  { displayName: 'To Unit', name: 'toUnit', type: 'options', options: [{ name: 'Wei', value: 'wei' }, { name: 'Gwei', value: 'gwei' }, { name: 'Ether', value: 'ether' }], default: 'wei', displayOptions: { show: { resource: ['utility'], operation: ['convertUnits'] } } },
  { displayName: 'PT Price', name: 'ptPrice', type: 'number', default: 0.95, description: 'PT price (0-1)', displayOptions: { show: { resource: ['utility'], operation: ['calculateApy'] } } },
  { displayName: 'Days to Maturity', name: 'daysToMaturity', type: 'number', default: 90, displayOptions: { show: { resource: ['utility'], operation: ['calculateApy'] } } },
  { displayName: 'Expiry Timestamp', name: 'expiryTimestamp', type: 'number', default: 0, displayOptions: { show: { resource: ['utility'], operation: ['calculateTimeToMaturity'] } } },
];

function getChainId(credentials: { network?: string; chainId?: number }): number {
  return credentials.network === 'custom' ? (credentials.chainId || 1) : (NETWORKS[credentials.network || 'ethereum']?.chainId || 1);
}

export async function executeUtilityOperation(this: IExecuteFunctions, index: number): Promise<INodeExecutionData[]> {
  const operation = this.getNodeParameter('operation', index) as string;
  const credentials = await this.getCredentials('pendleNetwork');
  const chainId = getChainId(credentials as { network?: string; chainId?: number });
  
  let result: unknown;
  switch (operation) {
    case 'getSupportedTokens': {
      const tokens = getSYTokensForChain(chainId);
      result = { chainId, tokens, count: tokens.length };
      break;
    }
    case 'getSupportedChains': {
      result = { chains: Object.entries(NETWORKS).map(([key, config]) => ({ key, chainId: config.chainId, name: config.displayName })), supportedChainIds: SUPPORTED_CHAIN_IDS };
      break;
    }
    case 'validateMarketAddress': {
      const address = this.getNodeParameter('address', index) as string;
      const isValid = isValidAddress(address);
      result = { address, isValid, checksumAddress: isValid ? ethers.getAddress(address) : null };
      break;
    }
    case 'convertUnits': {
      const amount = this.getNodeParameter('amount', index) as string;
      const fromUnit = this.getNodeParameter('fromUnit', index) as string;
      const toUnit = this.getNodeParameter('toUnit', index) as string;
      const weiValue = ethers.parseUnits(amount, fromUnit);
      const converted = ethers.formatUnits(weiValue, toUnit);
      result = { amount, fromUnit, toUnit, converted, weiValue: weiValue.toString() };
      break;
    }
    case 'calculateApy': {
      const ptPrice = this.getNodeParameter('ptPrice', index) as number;
      const daysToMaturity = this.getNodeParameter('daysToMaturity', index) as number;
      const apy = calculateImpliedAPY(ptPrice, daysToMaturity);
      result = { ptPrice, daysToMaturity, impliedApy: apy, impliedApyFormatted: `${apy.toFixed(2)}%` };
      break;
    }
    case 'calculateTimeToMaturity': {
      const expiryTimestamp = this.getNodeParameter('expiryTimestamp', index) as number;
      const days = calculateDaysToMaturity(expiryTimestamp);
      const isExpired = days <= 0;
      result = { expiryTimestamp, daysToMaturity: Math.max(0, Math.floor(days)), isExpired };
      break;
    }
    case 'getContractAddresses': {
      const contracts = CONTRACT_ADDRESSES[chainId];
      result = { chainId, contracts };
      break;
    }
    case 'estimateSlippage': {
      result = { recommendedSlippage: 0.5, lowSlippage: 0.1, highSlippage: 1.0, note: 'Adjust based on trade size and liquidity' };
      break;
    }
    case 'getNetworkStatus': {
      const client = createPendleClient({ chainId, rpcUrl: credentials.rpcUrl as string, apiEndpoint: credentials.apiEndpoint as string });
      const blockNumber = await client.getProvider().getBlockNumber();
      result = { chainId, network: NETWORKS[Object.keys(NETWORKS).find(k => NETWORKS[k].chainId === chainId) || 'ethereum']?.displayName, blockNumber, status: 'connected' };
      break;
    }
    default: throw new NodeOperationError(this.getNode(), `Unknown operation: ${operation}`);
  }
  return [{ json: result as object }];
}
