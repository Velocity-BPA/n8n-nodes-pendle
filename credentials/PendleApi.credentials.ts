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

export class PendleApi implements ICredentialType {
  name = 'pendleApi';
  displayName = 'Pendle API';
  documentationUrl = 'https://api-v2.pendle.finance/core/docs';
  properties: INodeProperties[] = [
    {
      displayName: 'API Endpoint',
      name: 'apiEndpoint',
      type: 'string',
      default: 'https://api-v2.pendle.finance/core',
      description: 'The Pendle API endpoint URL',
    },
    {
      displayName: 'API Key',
      name: 'apiKey',
      type: 'string',
      typeOptions: {
        password: true,
      },
      default: '',
      description: 'API key for authenticated endpoints (if applicable)',
    },
    {
      displayName: 'Subgraph URL',
      name: 'subgraphUrl',
      type: 'string',
      default: '',
      placeholder: 'https://api.thegraph.com/subgraphs/name/pendle-finance/pendle-v2',
      description:
        'The Pendle subgraph URL for GraphQL queries. Leave empty to use default for the network.',
    },
    {
      displayName: 'Request Timeout (ms)',
      name: 'timeout',
      type: 'number',
      default: 30000,
      description: 'Request timeout in milliseconds',
    },
  ];

  authenticate: IAuthenticateGeneric = {
    type: 'generic',
    properties: {
      headers: {
        Authorization: '={{"Bearer " + $credentials.apiKey}}',
      },
    },
  };

  test: ICredentialTestRequest = {
    request: {
      baseURL: '={{$credentials.apiEndpoint}}',
      url: '/v1/1/markets',
      method: 'GET',
      timeout: '={{$credentials.timeout || 30000}}',
    },
  };
}
