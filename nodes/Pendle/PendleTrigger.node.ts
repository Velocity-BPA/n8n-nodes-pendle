/*
 * Copyright (c) Velocity BPA, LLC
 * Licensed under the Business Source License 1.1
 * Commercial use requires a separate commercial license.
 * See LICENSE file for details.
 */

import type {
  IPollFunctions,
  INodeExecutionData,
  INodeType,
  INodeTypeDescription,
} from 'n8n-workflow';
import { createPendleClient } from './transport/pendleClient';
import { createRouterClient } from './transport/routerClient';
import { NETWORKS } from './constants';
import { calculateDaysToMaturity, isExpiringSoon } from './utils';

// Licensing notice
const LICENSING_NOTICE_LOGGED = Symbol.for('n8n-nodes-pendle-trigger.licensingNoticeLogged');
if (!(global as Record<symbol, boolean>)[LICENSING_NOTICE_LOGGED]) {
  console.warn(`
[Velocity BPA Licensing Notice]

This n8n node is licensed under the Business Source License 1.1 (BSL 1.1).

Use of this node by for-profit organizations in production environments requires a commercial license from Velocity BPA.

For licensing information, visit https://velobpa.com/licensing or contact licensing@velobpa.com.
`);
  (global as Record<symbol, boolean>)[LICENSING_NOTICE_LOGGED] = true;
}

export class PendleTrigger implements INodeType {
  description: INodeTypeDescription = {
    displayName: 'Pendle Trigger',
    name: 'pendleTrigger',
    icon: 'file:pendle.svg',
    group: ['trigger'],
    version: 1,
    subtitle: '={{$parameter["triggerType"]}}',
    description: 'Trigger on Pendle protocol events',
    defaults: {
      name: 'Pendle Trigger',
    },
    polling: true,
    inputs: [],
    outputs: ['main'],
    credentials: [
      {
        name: 'pendleNetwork',
        required: true,
      },
    ],
    properties: [
      {
        displayName: 'Trigger Type',
        name: 'triggerType',
        type: 'options',
        options: [
          { name: 'Market Expiring Soon', value: 'marketExpiringSoon', description: 'Trigger when market is expiring soon' },
          { name: 'Market Expired', value: 'marketExpired', description: 'Trigger when market expires' },
          { name: 'APY Changed', value: 'apyChanged', description: 'Trigger on significant APY change' },
          { name: 'High Yield Alert', value: 'highYieldAlert', description: 'Trigger when yield exceeds threshold' },
          { name: 'PT Maturity Alert', value: 'ptMaturityAlert', description: 'Alert before PT maturity' },
          { name: 'New Market Created', value: 'newMarketCreated', description: 'Trigger on new market' },
          { name: 'TVL Changed', value: 'tvlChanged', description: 'Trigger on TVL change' },
          { name: 'Volume Spike', value: 'volumeSpike', description: 'Trigger on volume spike' },
        ],
        default: 'marketExpiringSoon',
        required: true,
      },
      {
        displayName: 'Market Address',
        name: 'marketAddress',
        type: 'string',
        default: '',
        placeholder: '0x... (leave empty for all markets)',
        description: 'Specific market to monitor (optional)',
        displayOptions: {
          show: {
            triggerType: ['apyChanged', 'marketExpiringSoon', 'marketExpired', 'ptMaturityAlert', 'tvlChanged'],
          },
        },
      },
      {
        displayName: 'Days Before Expiry',
        name: 'daysBeforeExpiry',
        type: 'number',
        default: 7,
        description: 'Days before expiry to trigger alert',
        displayOptions: {
          show: {
            triggerType: ['marketExpiringSoon', 'ptMaturityAlert'],
          },
        },
      },
      {
        displayName: 'APY Threshold (%)',
        name: 'apyThreshold',
        type: 'number',
        default: 10,
        description: 'Minimum APY to trigger alert',
        displayOptions: {
          show: {
            triggerType: ['highYieldAlert'],
          },
        },
      },
      {
        displayName: 'APY Change Threshold (%)',
        name: 'apyChangeThreshold',
        type: 'number',
        default: 1,
        description: 'Minimum APY change to trigger',
        displayOptions: {
          show: {
            triggerType: ['apyChanged'],
          },
        },
      },
      {
        displayName: 'TVL Change Threshold (%)',
        name: 'tvlChangeThreshold',
        type: 'number',
        default: 10,
        description: 'Minimum TVL change percentage to trigger',
        displayOptions: {
          show: {
            triggerType: ['tvlChanged'],
          },
        },
      },
      {
        displayName: 'Volume Multiplier',
        name: 'volumeMultiplier',
        type: 'number',
        default: 2,
        description: 'Volume spike multiplier threshold',
        displayOptions: {
          show: {
            triggerType: ['volumeSpike'],
          },
        },
      },
    ],
  };

  async poll(this: IPollFunctions): Promise<INodeExecutionData[][] | null> {
    const triggerType = this.getNodeParameter('triggerType') as string;
    const credentials = await this.getCredentials('pendleNetwork');

    const network = (credentials.network as string) || 'ethereum';
    const chainId = network === 'custom' 
      ? (credentials.chainId as number) || 1 
      : NETWORKS[network]?.chainId || 1;

    const client = createPendleClient({
      chainId,
      rpcUrl: credentials.rpcUrl as string,
      apiEndpoint: credentials.apiEndpoint as string,
    });

    const returnData: INodeExecutionData[] = [];

    try {
      switch (triggerType) {
        case 'marketExpiringSoon':
        case 'ptMaturityAlert': {
          const daysBeforeExpiry = this.getNodeParameter('daysBeforeExpiry') as number;
          const marketAddress = this.getNodeParameter('marketAddress', '') as string;
          
          let markets = await client.getActiveMarkets();
          if (marketAddress) {
            markets = markets.filter(m => m.address.toLowerCase() === marketAddress.toLowerCase());
          }

          for (const market of markets) {
            if (isExpiringSoon(market.expiry, daysBeforeExpiry)) {
              const daysRemaining = calculateDaysToMaturity(market.expiry);
              returnData.push({
                json: {
                  event: triggerType,
                  market: market.address,
                  name: market.name,
                  expiry: market.expiry,
                  daysRemaining: Math.floor(daysRemaining),
                  timestamp: new Date().toISOString(),
                },
              });
            }
          }
          break;
        }

        case 'marketExpired': {
          const marketAddress = this.getNodeParameter('marketAddress', '') as string;
          let markets = await client.getExpiredMarkets();
          
          if (marketAddress) {
            markets = markets.filter(m => m.address.toLowerCase() === marketAddress.toLowerCase());
          }

          // Get last poll time to only return newly expired markets
          const lastPollTime = (await this.getWorkflowStaticData('node')).lastPollTime as number || 0;
          const now = Math.floor(Date.now() / 1000);

          for (const market of markets) {
            if (market.expiry > lastPollTime && market.expiry <= now) {
              returnData.push({
                json: {
                  event: 'marketExpired',
                  market: market.address,
                  name: market.name,
                  expiry: market.expiry,
                  timestamp: new Date().toISOString(),
                },
              });
            }
          }

          (await this.getWorkflowStaticData('node')).lastPollTime = now;
          break;
        }

        case 'highYieldAlert': {
          const apyThreshold = this.getNodeParameter('apyThreshold') as number;
          const markets = await client.getActiveMarkets();

          for (const market of markets) {
            if (market.impliedApy >= apyThreshold) {
              returnData.push({
                json: {
                  event: 'highYieldAlert',
                  market: market.address,
                  name: market.name,
                  impliedApy: market.impliedApy,
                  threshold: apyThreshold,
                  timestamp: new Date().toISOString(),
                },
              });
            }
          }
          break;
        }

        case 'apyChanged': {
          const apyChangeThreshold = this.getNodeParameter('apyChangeThreshold') as number;
          const marketAddress = this.getNodeParameter('marketAddress', '') as string;
          
          let markets = await client.getActiveMarkets();
          if (marketAddress) {
            markets = markets.filter(m => m.address.toLowerCase() === marketAddress.toLowerCase());
          }

          const staticData = await this.getWorkflowStaticData('node');
          const previousApys = (staticData.previousApys as Record<string, number>) || {};

          for (const market of markets) {
            const previousApy = previousApys[market.address];
            if (previousApy !== undefined) {
              const change = Math.abs(market.impliedApy - previousApy);
              if (change >= apyChangeThreshold) {
                returnData.push({
                  json: {
                    event: 'apyChanged',
                    market: market.address,
                    name: market.name,
                    previousApy,
                    currentApy: market.impliedApy,
                    change,
                    timestamp: new Date().toISOString(),
                  },
                });
              }
            }
            previousApys[market.address] = market.impliedApy;
          }

          staticData.previousApys = previousApys;
          break;
        }

        case 'newMarketCreated': {
          const staticData = await this.getWorkflowStaticData('node');
          const knownMarkets = (staticData.knownMarkets as string[]) || [];
          
          const markets = await client.getMarkets();
          const newMarkets = markets.filter(m => !knownMarkets.includes(m.address));

          for (const market of newMarkets) {
            returnData.push({
              json: {
                event: 'newMarketCreated',
                market: market.address,
                name: market.name,
                expiry: market.expiry,
                impliedApy: market.impliedApy,
                timestamp: new Date().toISOString(),
              },
            });
          }

          staticData.knownMarkets = markets.map(m => m.address);
          break;
        }

        case 'tvlChanged': {
          const tvlChangeThreshold = this.getNodeParameter('tvlChangeThreshold') as number;
          const marketAddress = this.getNodeParameter('marketAddress', '') as string;
          
          let markets = await client.getActiveMarkets();
          if (marketAddress) {
            markets = markets.filter(m => m.address.toLowerCase() === marketAddress.toLowerCase());
          }

          const staticData = await this.getWorkflowStaticData('node');
          const previousTvls = (staticData.previousTvls as Record<string, number>) || {};

          for (const market of markets) {
            const previousTvl = previousTvls[market.address];
            if (previousTvl !== undefined && previousTvl > 0) {
              const changePercent = ((market.tvl - previousTvl) / previousTvl) * 100;
              if (Math.abs(changePercent) >= tvlChangeThreshold) {
                returnData.push({
                  json: {
                    event: 'tvlChanged',
                    market: market.address,
                    name: market.name,
                    previousTvl,
                    currentTvl: market.tvl,
                    changePercent,
                    timestamp: new Date().toISOString(),
                  },
                });
              }
            }
            previousTvls[market.address] = market.tvl;
          }

          staticData.previousTvls = previousTvls;
          break;
        }

        case 'volumeSpike': {
          const volumeMultiplier = this.getNodeParameter('volumeMultiplier') as number;
          
          const staticData = await this.getWorkflowStaticData('node');
          const previousVolumes = (staticData.previousVolumes as Record<string, number>) || {};
          
          const markets = await client.getActiveMarkets();

          for (const market of markets) {
            const previousVolume = previousVolumes[market.address];
            if (previousVolume !== undefined && previousVolume > 0) {
              const multiplier = market.volume24h / previousVolume;
              if (multiplier >= volumeMultiplier) {
                returnData.push({
                  json: {
                    event: 'volumeSpike',
                    market: market.address,
                    name: market.name,
                    previousVolume,
                    currentVolume: market.volume24h,
                    multiplier,
                    timestamp: new Date().toISOString(),
                  },
                });
              }
            }
            previousVolumes[market.address] = market.volume24h;
          }

          staticData.previousVolumes = previousVolumes;
          break;
        }
      }
    } catch (error) {
      // Log error but don't fail the trigger
      console.error('Pendle Trigger error:', error);
    }

    if (returnData.length === 0) {
      return null;
    }

    return [returnData];
  }
}
