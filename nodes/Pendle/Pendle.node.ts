/*
 * Copyright (c) Velocity BPA, LLC
 * Licensed under the Business Source License 1.1
 * Commercial use requires a separate commercial license.
 * See LICENSE file for details.
 */

import type {
  IExecuteFunctions,
  INodeExecutionData,
  INodeType,
  INodeTypeDescription,
} from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import {
  marketOperations, marketFields, executeMarketOperation,
  ptOperations, ptFields, executePtOperation,
  ytOperations, ytFields, executeYtOperation,
  syOperations, syFields, executeSyOperation,
  lpOperations, lpFields, executeLpOperation,
  swapOperations, swapFields, executeSwapOperation,
  mintOperations, mintFields, executeMintOperation,
  redeemOperations, redeemFields, executeRedeemOperation,
  yieldOperations, yieldFields, executeYieldOperation,
  stakingOperations, stakingFields, executeStakingOperation,
  votingOperations, votingFields, executeVotingOperation,
  rewardsOperations, rewardsFields, executeRewardsOperation,
  limitOrderOperations, limitOrderFields, executeLimitOrderOperation,
  routerOperations, routerFields, executeRouterOperation,
  oracleOperations, oracleFields, executeOracleOperation,
  analyticsOperations, analyticsFields, executeAnalyticsOperation,
  portfolioOperations, portfolioFields, executePortfolioOperation,
  gasOperations, gasFields, executeGasOperation,
  subgraphOperations, subgraphFields, executeSubgraphOperation,
  utilityOperations, utilityFields, executeUtilityOperation,
} from './actions';

// Licensing notice - logged once per node load
const LICENSING_NOTICE_LOGGED = Symbol.for('n8n-nodes-pendle.licensingNoticeLogged');
if (!(global as Record<symbol, boolean>)[LICENSING_NOTICE_LOGGED]) {
  console.warn(`
[Velocity BPA Licensing Notice]

This n8n node is licensed under the Business Source License 1.1 (BSL 1.1).

Use of this node by for-profit organizations in production environments requires a commercial license from Velocity BPA.

For licensing information, visit https://velobpa.com/licensing or contact licensing@velobpa.com.
`);
  (global as Record<symbol, boolean>)[LICENSING_NOTICE_LOGGED] = true;
}

export class Pendle implements INodeType {
  description: INodeTypeDescription = {
    displayName: 'Pendle',
    name: 'pendle',
    icon: 'file:pendle.svg',
    group: ['transform'],
    version: 1,
    subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
    description: 'Interact with the Pendle yield tokenization protocol',
    defaults: {
      name: 'Pendle',
    },
    inputs: ['main'],
    outputs: ['main'],
    credentials: [
      {
        name: 'pendleNetwork',
        required: true,
      },
      {
        name: 'pendleApi',
        required: false,
      },
    ],
    properties: [
      {
        displayName: 'Resource',
        name: 'resource',
        type: 'options',
        noDataExpression: true,
        options: [
          { name: 'Market', value: 'market', description: 'Pendle market operations' },
          { name: 'PT (Principal Token)', value: 'pt', description: 'Principal Token operations' },
          { name: 'YT (Yield Token)', value: 'yt', description: 'Yield Token operations' },
          { name: 'SY (Standardized Yield)', value: 'sy', description: 'SY token operations' },
          { name: 'LP (Liquidity Provider)', value: 'lp', description: 'Liquidity operations' },
          { name: 'Swap', value: 'swap', description: 'Token swap operations' },
          { name: 'Mint', value: 'mint', description: 'Mint PT and YT' },
          { name: 'Redeem', value: 'redeem', description: 'Redeem tokens' },
          { name: 'Yield', value: 'yield', description: 'Yield information' },
          { name: 'Staking (vePENDLE)', value: 'staking', description: 'vePENDLE staking' },
          { name: 'Voting', value: 'voting', description: 'Governance voting' },
          { name: 'Rewards', value: 'rewards', description: 'Reward operations' },
          { name: 'Limit Order', value: 'limitOrder', description: 'Limit order operations' },
          { name: 'Router', value: 'router', description: 'Router operations' },
          { name: 'Oracle', value: 'oracle', description: 'PT Oracle operations' },
          { name: 'Analytics', value: 'analytics', description: 'Protocol analytics' },
          { name: 'Portfolio', value: 'portfolio', description: 'Portfolio tracking' },
          { name: 'Gas', value: 'gas', description: 'Gas estimation' },
          { name: 'Subgraph', value: 'subgraph', description: 'GraphQL queries' },
          { name: 'Utility', value: 'utility', description: 'Utility functions' },
        ],
        default: 'market',
      },
      ...marketOperations,
      ...ptOperations,
      ...ytOperations,
      ...syOperations,
      ...lpOperations,
      ...swapOperations,
      ...mintOperations,
      ...redeemOperations,
      ...yieldOperations,
      ...stakingOperations,
      ...votingOperations,
      ...rewardsOperations,
      ...limitOrderOperations,
      ...routerOperations,
      ...oracleOperations,
      ...analyticsOperations,
      ...portfolioOperations,
      ...gasOperations,
      ...subgraphOperations,
      ...utilityOperations,
      ...marketFields,
      ...ptFields,
      ...ytFields,
      ...syFields,
      ...lpFields,
      ...swapFields,
      ...mintFields,
      ...redeemFields,
      ...yieldFields,
      ...stakingFields,
      ...votingFields,
      ...rewardsFields,
      ...limitOrderFields,
      ...routerFields,
      ...oracleFields,
      ...analyticsFields,
      ...portfolioFields,
      ...gasFields,
      ...subgraphFields,
      ...utilityFields,
    ],
  };

  async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
    const items = this.getInputData();
    const returnData: INodeExecutionData[] = [];

    for (let i = 0; i < items.length; i++) {
      try {
        const resource = this.getNodeParameter('resource', i) as string;
        let result: INodeExecutionData[];

        switch (resource) {
          case 'market':
            result = await executeMarketOperation.call(this, i);
            break;
          case 'pt':
            result = await executePtOperation.call(this, i);
            break;
          case 'yt':
            result = await executeYtOperation.call(this, i);
            break;
          case 'sy':
            result = await executeSyOperation.call(this, i);
            break;
          case 'lp':
            result = await executeLpOperation.call(this, i);
            break;
          case 'swap':
            result = await executeSwapOperation.call(this, i);
            break;
          case 'mint':
            result = await executeMintOperation.call(this, i);
            break;
          case 'redeem':
            result = await executeRedeemOperation.call(this, i);
            break;
          case 'yield':
            result = await executeYieldOperation.call(this, i);
            break;
          case 'staking':
            result = await executeStakingOperation.call(this, i);
            break;
          case 'voting':
            result = await executeVotingOperation.call(this, i);
            break;
          case 'rewards':
            result = await executeRewardsOperation.call(this, i);
            break;
          case 'limitOrder':
            result = await executeLimitOrderOperation.call(this, i);
            break;
          case 'router':
            result = await executeRouterOperation.call(this, i);
            break;
          case 'oracle':
            result = await executeOracleOperation.call(this, i);
            break;
          case 'analytics':
            result = await executeAnalyticsOperation.call(this, i);
            break;
          case 'portfolio':
            result = await executePortfolioOperation.call(this, i);
            break;
          case 'gas':
            result = await executeGasOperation.call(this, i);
            break;
          case 'subgraph':
            result = await executeSubgraphOperation.call(this, i);
            break;
          case 'utility':
            result = await executeUtilityOperation.call(this, i);
            break;
          default:
            throw new NodeOperationError(this.getNode(), `Unknown resource: ${resource}`);
        }

        returnData.push(...result);
      } catch (error) {
        if (this.continueOnFail()) {
          returnData.push({
            json: {
              error: error instanceof Error ? error.message : 'Unknown error',
            },
            pairedItem: { item: i },
          });
          continue;
        }
        throw error;
      }
    }

    return [returnData];
  }
}
