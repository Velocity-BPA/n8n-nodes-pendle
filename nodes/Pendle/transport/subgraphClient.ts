/*
 * Copyright (c) Velocity BPA, LLC
 * Licensed under the Business Source License 1.1
 * Commercial use requires a separate commercial license.
 * See LICENSE file for details.
 */

/**
 * Subgraph Client - Handles GraphQL queries to Pendle subgraph
 */

import { GraphQLClient, gql } from 'graphql-request';
import { NETWORKS, getNetworkByChainId, SUBGRAPH_LIMITS } from '../constants';

export interface SubgraphConfig {
  chainId: number;
  subgraphUrl?: string;
}

export interface SubgraphMarket {
  id: string;
  name: string;
  symbol: string;
  expiry: string;
  pt: { id: string; symbol: string };
  yt: { id: string; symbol: string };
  sy: { id: string; symbol: string };
  totalLp: string;
  totalPt: string;
  totalSy: string;
  impliedYield: string;
}

export interface SubgraphPosition {
  id: string;
  user: string;
  market: { id: string; symbol: string };
  lpBalance: string;
  ptBalance: string;
  ytBalance: string;
}

export interface SubgraphTransaction {
  id: string;
  hash: string;
  timestamp: string;
  type: string;
  market: { id: string; symbol: string };
  user: string;
  amountIn: string;
  amountOut: string;
}

export interface SubgraphYield {
  id: string;
  market: { id: string };
  timestamp: string;
  impliedYield: string;
  underlyingYield: string;
}

export class SubgraphClient {
  private chainId: number;
  private client: GraphQLClient;
  private subgraphUrl: string;

  constructor(config: SubgraphConfig) {
    this.chainId = config.chainId;

    const network = getNetworkByChainId(config.chainId);
    if (!network) {
      throw new Error(`Unsupported chain ID: ${config.chainId}`);
    }

    this.subgraphUrl = config.subgraphUrl || network.subgraphUrl;
    this.client = new GraphQLClient(this.subgraphUrl, {
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  // ============ Market Queries ============

  /**
   * Query all markets
   */
  async queryMarkets(
    first: number = SUBGRAPH_LIMITS.DEFAULT_FIRST,
    skip: number = SUBGRAPH_LIMITS.DEFAULT_SKIP,
    orderBy: string = 'totalLp',
    orderDirection: 'asc' | 'desc' = 'desc',
  ): Promise<SubgraphMarket[]> {
    const query = gql`
      query GetMarkets($first: Int!, $skip: Int!, $orderBy: String!, $orderDirection: String!) {
        markets(
          first: $first
          skip: $skip
          orderBy: $orderBy
          orderDirection: $orderDirection
        ) {
          id
          name
          symbol
          expiry
          pt {
            id
            symbol
          }
          yt {
            id
            symbol
          }
          sy {
            id
            symbol
          }
          totalLp
          totalPt
          totalSy
          impliedYield
        }
      }
    `;

    const data = await this.client.request<{ markets: SubgraphMarket[] }>(query, {
      first: Math.min(first, SUBGRAPH_LIMITS.MAX_FIRST),
      skip,
      orderBy,
      orderDirection,
    });

    return data.markets;
  }

  /**
   * Query active markets (not expired)
   */
  async queryActiveMarkets(
    first: number = SUBGRAPH_LIMITS.DEFAULT_FIRST,
  ): Promise<SubgraphMarket[]> {
    const now = Math.floor(Date.now() / 1000).toString();

    const query = gql`
      query GetActiveMarkets($first: Int!, $now: String!) {
        markets(
          first: $first
          where: { expiry_gt: $now }
          orderBy: totalLp
          orderDirection: desc
        ) {
          id
          name
          symbol
          expiry
          pt {
            id
            symbol
          }
          yt {
            id
            symbol
          }
          sy {
            id
            symbol
          }
          totalLp
          totalPt
          totalSy
          impliedYield
        }
      }
    `;

    const data = await this.client.request<{ markets: SubgraphMarket[] }>(query, {
      first: Math.min(first, SUBGRAPH_LIMITS.MAX_FIRST),
      now,
    });

    return data.markets;
  }

  /**
   * Query market by address
   */
  async queryMarketByAddress(marketAddress: string): Promise<SubgraphMarket | null> {
    const query = gql`
      query GetMarket($id: ID!) {
        market(id: $id) {
          id
          name
          symbol
          expiry
          pt {
            id
            symbol
          }
          yt {
            id
            symbol
          }
          sy {
            id
            symbol
          }
          totalLp
          totalPt
          totalSy
          impliedYield
        }
      }
    `;

    const data = await this.client.request<{ market: SubgraphMarket | null }>(query, {
      id: marketAddress.toLowerCase(),
    });

    return data.market;
  }

  // ============ Position Queries ============

  /**
   * Query user positions
   */
  async queryPositions(
    userAddress: string,
    first: number = SUBGRAPH_LIMITS.DEFAULT_FIRST,
  ): Promise<SubgraphPosition[]> {
    const query = gql`
      query GetPositions($user: String!, $first: Int!) {
        positions(
          first: $first
          where: { user: $user }
          orderBy: lpBalance
          orderDirection: desc
        ) {
          id
          user
          market {
            id
            symbol
          }
          lpBalance
          ptBalance
          ytBalance
        }
      }
    `;

    const data = await this.client.request<{ positions: SubgraphPosition[] }>(query, {
      user: userAddress.toLowerCase(),
      first: Math.min(first, SUBGRAPH_LIMITS.MAX_FIRST),
    });

    return data.positions;
  }

  /**
   * Query position for specific market
   */
  async queryPositionByMarket(
    userAddress: string,
    marketAddress: string,
  ): Promise<SubgraphPosition | null> {
    const query = gql`
      query GetPosition($user: String!, $market: String!) {
        positions(
          first: 1
          where: { user: $user, market: $market }
        ) {
          id
          user
          market {
            id
            symbol
          }
          lpBalance
          ptBalance
          ytBalance
        }
      }
    `;

    const data = await this.client.request<{ positions: SubgraphPosition[] }>(query, {
      user: userAddress.toLowerCase(),
      market: marketAddress.toLowerCase(),
    });

    return data.positions[0] || null;
  }

  // ============ Transaction Queries ============

  /**
   * Query transactions
   */
  async queryTransactions(
    first: number = SUBGRAPH_LIMITS.DEFAULT_FIRST,
    skip: number = SUBGRAPH_LIMITS.DEFAULT_SKIP,
    userAddress?: string,
    marketAddress?: string,
  ): Promise<SubgraphTransaction[]> {
    let whereClause = '';
    const variables: Record<string, unknown> = { first, skip };

    if (userAddress && marketAddress) {
      whereClause = 'where: { user: $user, market: $market }';
      variables.user = userAddress.toLowerCase();
      variables.market = marketAddress.toLowerCase();
    } else if (userAddress) {
      whereClause = 'where: { user: $user }';
      variables.user = userAddress.toLowerCase();
    } else if (marketAddress) {
      whereClause = 'where: { market: $market }';
      variables.market = marketAddress.toLowerCase();
    }

    const query = gql`
      query GetTransactions($first: Int!, $skip: Int!${userAddress ? ', $user: String!' : ''}${marketAddress ? ', $market: String!' : ''}) {
        transactions(
          first: $first
          skip: $skip
          ${whereClause}
          orderBy: timestamp
          orderDirection: desc
        ) {
          id
          hash
          timestamp
          type
          market {
            id
            symbol
          }
          user
          amountIn
          amountOut
        }
      }
    `;

    const data = await this.client.request<{ transactions: SubgraphTransaction[] }>(
      query,
      variables,
    );

    return data.transactions;
  }

  // ============ Yield Queries ============

  /**
   * Query yield history for a market
   */
  async queryYieldHistory(
    marketAddress: string,
    first: number = SUBGRAPH_LIMITS.DEFAULT_FIRST,
  ): Promise<SubgraphYield[]> {
    const query = gql`
      query GetYieldHistory($market: String!, $first: Int!) {
        yields(
          first: $first
          where: { market: $market }
          orderBy: timestamp
          orderDirection: desc
        ) {
          id
          market {
            id
          }
          timestamp
          impliedYield
          underlyingYield
        }
      }
    `;

    const data = await this.client.request<{ yields: SubgraphYield[] }>(query, {
      market: marketAddress.toLowerCase(),
      first: Math.min(first, SUBGRAPH_LIMITS.MAX_FIRST),
    });

    return data.yields;
  }

  // ============ Liquidity Queries ============

  /**
   * Query liquidity providers for a market
   */
  async queryLiquidityProviders(
    marketAddress: string,
    first: number = SUBGRAPH_LIMITS.DEFAULT_FIRST,
  ): Promise<{ user: string; lpBalance: string }[]> {
    const query = gql`
      query GetLPs($market: String!, $first: Int!) {
        positions(
          first: $first
          where: { market: $market, lpBalance_gt: "0" }
          orderBy: lpBalance
          orderDirection: desc
        ) {
          user
          lpBalance
        }
      }
    `;

    const data = await this.client.request<{ positions: { user: string; lpBalance: string }[] }>(
      query,
      {
        market: marketAddress.toLowerCase(),
        first: Math.min(first, SUBGRAPH_LIMITS.MAX_FIRST),
      },
    );

    return data.positions;
  }

  // ============ Custom Query ============

  /**
   * Execute custom GraphQL query
   */
  async customQuery<T>(query: string, variables?: Record<string, unknown>): Promise<T> {
    return this.client.request<T>(gql`${query}`, variables);
  }

  // ============ Health Check ============

  /**
   * Check subgraph status
   */
  async getStatus(): Promise<{ synced: boolean; block: number }> {
    const query = gql`
      query GetStatus {
        _meta {
          block {
            number
          }
          hasIndexingErrors
        }
      }
    `;

    try {
      const data = await this.client.request<{
        _meta: { block: { number: number }; hasIndexingErrors: boolean };
      }>(query);

      return {
        synced: !data._meta.hasIndexingErrors,
        block: data._meta.block.number,
      };
    } catch {
      return { synced: false, block: 0 };
    }
  }

  // ============ Getters ============

  getSubgraphUrl(): string {
    return this.subgraphUrl;
  }

  getChainId(): number {
    return this.chainId;
  }
}

/**
 * Create a new subgraph client instance
 */
export function createSubgraphClient(config: SubgraphConfig): SubgraphClient {
  return new SubgraphClient(config);
}
