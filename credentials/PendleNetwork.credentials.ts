/*
 * Copyright (c) Velocity BPA, LLC
 * Licensed under the Business Source License 1.1
 * Commercial use requires a separate commercial license.
 * See LICENSE file for details.
 */

import type {
  IAuthenticateGeneric,
  ICredentialTestRequest,
  ICredentialType,
  INodeProperties,
} from 'n8n-workflow';

export class PendleNetwork implements ICredentialType {
  name = 'pendleNetwork';
  displayName = 'Pendle Network';
  documentationUrl = 'https://docs.pendle.finance/';
  properties: INodeProperties[] = [
    {
      displayName: 'Network',
      name: 'network',
      type: 'options',
      options: [
        {
          name: 'Ethereum Mainnet',
          value: 'ethereum',
        },
        {
          name: 'Arbitrum One',
          value: 'arbitrum',
        },
        {
          name: 'BNB Chain',
          value: 'bnb',
        },
        {
          name: 'Optimism',
          value: 'optimism',
        },
        {
          name: 'Mantle',
          value: 'mantle',
        },
        {
          name: 'Custom',
          value: 'custom',
        },
      ],
      default: 'ethereum',
      description: 'The network to connect to',
    },
    {
      displayName: 'Chain ID',
      name: 'chainId',
      type: 'number',
      default: 1,
      description: 'The chain ID of the network',
      displayOptions: {
        show: {
          network: ['custom'],
        },
      },
    },
    {
      displayName: 'RPC Endpoint URL',
      name: 'rpcUrl',
      type: 'string',
      default: '',
      placeholder: 'https://eth.llamarpc.com',
      description: 'The RPC endpoint URL for the network. Leave empty to use default.',
    },
    {
      displayName: 'Private Key',
      name: 'privateKey',
      type: 'string',
      typeOptions: {
        password: true,
      },
      default: '',
      description:
        'The private key for signing transactions. Required for write operations. Never share or expose this key.',
    },
    {
      displayName: 'Pendle API Endpoint',
      name: 'apiEndpoint',
      type: 'string',
      default: 'https://api-v2.pendle.finance/core',
      description: 'The Pendle API endpoint URL',
    },
  ];

  authenticate: IAuthenticateGeneric = {
    type: 'generic',
    properties: {},
  };

  test: ICredentialTestRequest = {
    request: {
      baseURL: '={{$credentials.apiEndpoint || "https://api-v2.pendle.finance/core"}}',
      url: '/v1/1/markets',
      method: 'GET',
      timeout: 10000,
    },
  };
}
