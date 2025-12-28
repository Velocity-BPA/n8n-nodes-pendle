/*
 * Copyright (c) Velocity BPA, LLC
 * Licensed under the Business Source License 1.1
 * Commercial use requires a separate commercial license.
 * See LICENSE file for details.
 */

import { NETWORKS, CONTRACT_ADDRESSES, SUPPORTED_CHAIN_IDS } from '../../nodes/Pendle/constants';

describe('Constants Integration', () => {
  describe('Networks', () => {
    it('should have all required network configurations', () => {
      expect(NETWORKS.ethereum).toBeDefined();
      expect(NETWORKS.arbitrum).toBeDefined();
      expect(NETWORKS.bnb).toBeDefined();
      expect(NETWORKS.optimism).toBeDefined();
      expect(NETWORKS.mantle).toBeDefined();
    });

    it('should have valid chain IDs', () => {
      expect(NETWORKS.ethereum.chainId).toBe(1);
      expect(NETWORKS.arbitrum.chainId).toBe(42161);
      expect(NETWORKS.bnb.chainId).toBe(56);
      expect(NETWORKS.optimism.chainId).toBe(10);
      expect(NETWORKS.mantle.chainId).toBe(5000);
    });

    it('should have RPC URLs for all networks', () => {
      Object.values(NETWORKS).forEach(network => {
        expect(network.rpcUrl).toBeDefined();
        expect(network.rpcUrl.length).toBeGreaterThan(0);
      });
    });

    it('should have explorer URLs for all networks', () => {
      Object.values(NETWORKS).forEach(network => {
        expect(network.explorerUrl).toBeDefined();
        expect(network.explorerUrl.startsWith('https://')).toBe(true);
      });
    });
  });

  describe('Contract Addresses', () => {
    it('should have addresses for Ethereum', () => {
      const ethContracts = CONTRACT_ADDRESSES[1];
      expect(ethContracts).toBeDefined();
      expect(ethContracts.router).toBeDefined();
      expect(ethContracts.vePendle).toBeDefined();
      expect(ethContracts.pendleToken).toBeDefined();
    });

    it('should have addresses for Arbitrum', () => {
      const arbContracts = CONTRACT_ADDRESSES[42161];
      expect(arbContracts).toBeDefined();
      expect(arbContracts.router).toBeDefined();
    });

    it('should have valid address format', () => {
      Object.values(CONTRACT_ADDRESSES).forEach(chainContracts => {
        expect(chainContracts.router).toMatch(/^0x[a-fA-F0-9]{40}$/);
      });
    });
  });

  describe('Supported Chain IDs', () => {
    it('should include all major chains', () => {
      expect(SUPPORTED_CHAIN_IDS).toContain(1);
      expect(SUPPORTED_CHAIN_IDS).toContain(42161);
      expect(SUPPORTED_CHAIN_IDS).toContain(56);
      expect(SUPPORTED_CHAIN_IDS).toContain(10);
      expect(SUPPORTED_CHAIN_IDS).toContain(5000);
    });

    it('should match network configurations', () => {
      const networkChainIds = Object.values(NETWORKS).map(n => n.chainId);
      expect(SUPPORTED_CHAIN_IDS.sort()).toEqual(networkChainIds.sort());
    });
  });
});

describe('Node Structure', () => {
  it('should export Pendle node', async () => {
    const { Pendle } = await import('../../nodes/Pendle/Pendle.node');
    expect(Pendle).toBeDefined();
  });

  it('should export PendleTrigger node', async () => {
    const { PendleTrigger } = await import('../../nodes/Pendle/PendleTrigger.node');
    expect(PendleTrigger).toBeDefined();
  });

  it('should export credentials', async () => {
    const { PendleNetwork } = await import('../../credentials/PendleNetwork.credentials');
    const { PendleApi } = await import('../../credentials/PendleApi.credentials');
    expect(PendleNetwork).toBeDefined();
    expect(PendleApi).toBeDefined();
  });
});
