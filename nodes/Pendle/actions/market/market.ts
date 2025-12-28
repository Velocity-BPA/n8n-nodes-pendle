/*
 * Copyright (c) Velocity BPA, LLC
 * Licensed under the Business Source License 1.1
 * Commercial use requires a separate commercial license.
 * See LICENSE file for details.
 */

import type { IExecuteFunctions, INodeExecutionData, INodeProperties } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
import { createPendleClient } from '../transport/pendleClient';
import { createRouterClient } from '../transport/routerClient';
import { NETWORKS } from '../constants';
import { calculateDaysToMaturity, formatExpiryDate, getTimeRemainingFormatted } from '../utils';

export const marketOperations: INodeProperties[] = [
  {
    displayName: 'Operation',
    name: 'operation',
    type: 'options',
    noDataExpression: true,
    displayOptions: {
      show: {
        resource: ['market'],
      },
    },
    options: [
      { name: 'Get Markets', value: 'getMarkets', description: 'Get all markets', action: 'Get all markets' },
      { name: 'Get Market Info', value: 'getMarketInfo', description: 'Get market details', action: 'Get market info' },
      { name: 'Get Market by Address', value: 'getMarketByAddress', description: 'Get market by address', action: 'Get market by address' },
      { name: 'Get Active Markets', value: 'getActiveMarkets', description: 'Get non-expired markets', action: 'Get active markets' },
      { name: 'Get Expired Markets', value: 'getExpiredMarkets', description: 'Get expired markets', action: 'Get expired markets' },
      { name: 'Get Market APY', value: 'getMarketApy', description: 'Get market APY', action: 'Get market APY' },
      { name: 'Get Implied APY', value: 'getImpliedApy', description: 'Get implied APY', action: 'Get implied APY' },
      { name: 'Get Market Liquidity', value: 'getMarketLiquidity', description: 'Get pool reserves', action: 'Get market liquidity' },
      { name: 'Get Market TVL', value: 'getMarketTvl', description: 'Get total value locked', action: 'Get market TVL' },
      { name: 'Get Market Expiry', value: 'getMarketExpiry', description: 'Get expiry info', action: 'Get market expiry' },
      { name: 'Get Market Stats', value: 'getMarketStats', description: 'Get comprehensive stats', action: 'Get market stats' },
      { name: 'Search Markets', value: 'searchMarkets', description: 'Search by asset', action: 'Search markets' },
    ],
    default: 'getMarkets',
  },
];

export const marketFields: INodeProperties[] = [
  {
    displayName: 'Market Address',
    name: 'marketAddress',
    type: 'string',
    required: true,
    default: '',
    placeholder: '0x...',
    description: 'The Pendle market contract address',
    displayOptions: {
      show: {
        resource: ['market'],
        operation: ['getMarketInfo', 'getMarketByAddress', 'getMarketApy', 'getImpliedApy', 'getMarketLiquidity', 'getMarketTvl', 'getMarketExpiry', 'getMarketStats'],
      },
    },
  },
  {
    displayName: 'Search Query',
    name: 'searchQuery',
    type: 'string',
    default: '',
    placeholder: 'wstETH, rETH, etc.',
    description: 'Search query for filtering markets',
    displayOptions: {
      show: {
        resource: ['market'],
        operation: ['searchMarkets'],
      },
    },
  },
  {
    displayName: 'Include Expired',
    name: 'includeExpired',
    type: 'boolean',
    default: false,
    description: 'Whether to include expired markets in results',
    displayOptions: {
      show: {
        resource: ['market'],
        operation: ['getMarkets', 'searchMarkets'],
      },
    },
  },
];

function getChainId(credentials: { network?: string; chainId?: number }): number {
  const network = credentials.network || 'ethereum';
  if (network === 'custom') {
    return credentials.chainId || 1;
  }
  const networkConfig = NETWORKS[network];
  return networkConfig?.chainId || 1;
}

export async function executeMarketOperation(
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
    case 'getMarkets': {
      const includeExpired = this.getNodeParameter('includeExpired', index, false) as boolean;
      const markets = await client.getMarkets();
      result = includeExpired ? markets : markets.filter(m => !m.isExpired);
      break;
    }

    case 'getMarketInfo':
    case 'getMarketByAddress': {
      const marketAddress = this.getNodeParameter('marketAddress', index) as string;
      result = await client.getMarketByAddress(marketAddress);
      break;
    }

    case 'getActiveMarkets': {
      result = await client.getActiveMarkets();
      break;
    }

    case 'getExpiredMarkets': {
      result = await client.getExpiredMarkets();
      break;
    }

    case 'getMarketApy':
    case 'getImpliedApy': {
      const marketAddress = this.getNodeParameter('marketAddress', index) as string;
      const routerClient = createRouterClient({ chainId, provider: client.getProvider() });
      const impliedYield = await routerClient.getImpliedYield(marketAddress);
      result = {
        marketAddress,
        impliedApy: impliedYield,
        impliedApyFormatted: `${impliedYield.toFixed(2)}%`,
      };
      break;
    }

    case 'getMarketLiquidity': {
      const marketAddress = this.getNodeParameter('marketAddress', index) as string;
      const reserves = await client.getMarketReserves(marketAddress);
      result = {
        marketAddress,
        syReserve: reserves.syReserve.toString(),
        ptReserve: reserves.ptReserve.toString(),
      };
      break;
    }

    case 'getMarketTvl': {
      const marketAddress = this.getNodeParameter('marketAddress', index) as string;
      const marketData = await client.getMarketByAddress(marketAddress);
      result = {
        marketAddress,
        tvl: marketData.tvl,
        tvlFormatted: `$${marketData.tvl.toLocaleString()}`,
      };
      break;
    }

    case 'getMarketExpiry': {
      const marketAddress = this.getNodeParameter('marketAddress', index) as string;
      const data = await client.getMarketData(marketAddress);
      const daysToMaturity = calculateDaysToMaturity(data.expiry);
      result = {
        marketAddress,
        expiry: data.expiry,
        expiryDate: formatExpiryDate(data.expiry),
        isExpired: data.isExpired,
        daysToMaturity: Math.max(0, Math.floor(daysToMaturity)),
        timeRemaining: getTimeRemainingFormatted(data.expiry),
      };
      break;
    }

    case 'getMarketStats': {
      const marketAddress = this.getNodeParameter('marketAddress', index) as string;
      const [marketData, reserves, chainData] = await Promise.all([
        client.getMarketByAddress(marketAddress),
        client.getMarketReserves(marketAddress),
        client.getMarketData(marketAddress),
      ]);
      
      const routerClient = createRouterClient({ chainId, provider: client.getProvider() });
      const impliedYield = await routerClient.getImpliedYield(marketAddress);
      const daysToMaturity = calculateDaysToMaturity(chainData.expiry);

      result = {
        marketAddress,
        name: marketData.name,
        symbol: marketData.symbol,
        ptAddress: chainData.ptAddress,
        ytAddress: chainData.ytAddress,
        syAddress: chainData.syAddress,
        expiry: chainData.expiry,
        expiryDate: formatExpiryDate(chainData.expiry),
        isExpired: chainData.isExpired,
        daysToMaturity: Math.max(0, Math.floor(daysToMaturity)),
        timeRemaining: getTimeRemainingFormatted(chainData.expiry),
        impliedApy: impliedYield,
        tvl: marketData.tvl,
        volume24h: marketData.volume24h,
        syReserve: reserves.syReserve.toString(),
        ptReserve: reserves.ptReserve.toString(),
      };
      break;
    }

    case 'searchMarkets': {
      const searchQuery = this.getNodeParameter('searchQuery', index, '') as string;
      const includeExpired = this.getNodeParameter('includeExpired', index, false) as boolean;
      let markets = await client.getMarkets();
      
      if (!includeExpired) {
        markets = markets.filter(m => !m.isExpired);
      }
      
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        markets = markets.filter(m => 
          m.name.toLowerCase().includes(query) ||
          m.symbol.toLowerCase().includes(query) ||
          m.underlyingAsset.toLowerCase().includes(query)
        );
      }
      result = markets;
      break;
    }

    default:
      throw new NodeOperationError(this.getNode(), `Unknown operation: ${operation}`);
  }

  return [{ json: result as object }];
}
