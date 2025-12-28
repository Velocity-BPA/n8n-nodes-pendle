/*
 * Copyright (c) Velocity BPA, LLC
 * Licensed under the Business Source License 1.1
 * Commercial use requires a separate commercial license.
 * See LICENSE file for details.
 */

/**
 * Contract addresses for Pendle protocol across different networks
 * These addresses are used for interacting with Pendle smart contracts
 */

export interface ContractAddresses {
  router: string;
  routerStatic: string;
  pendleMarketFactory: string;
  vePendle: string;
  pendleToken: string;
  votingController: string;
  gaugeController: string;
  feeDistributor: string;
  pendleStaking: string;
  limitOrderManager: string;
  ptOracle: string;
}

export const CONTRACT_ADDRESSES: Record<number, ContractAddresses> = {
  // Ethereum Mainnet
  1: {
    router: '0x00000000005BBB0EF59571E58418F9a4357b68A0',
    routerStatic: '0x263833d47eA3fA4a30f269323aba6a107f9eB14C',
    pendleMarketFactory: '0x27b1daeD2dF55F69f5C52bEba9B6dC8f3f4f8cC2',
    vePendle: '0x4f30A9D41B80eC9D4b88b91fE42F8F1B6cF7Ce87',
    pendleToken: '0x808507121B80c02388fAd14726482e061B8da827',
    votingController: '0x44087E105137a5095c008AaB6a6530182821F2F0',
    gaugeController: '0x47D74516B33eD5D70ddE7119A40839f6Fcc24e57',
    feeDistributor: '0x8C237520a8E14D658170A633D96F8e80764433b9',
    pendleStaking: '0x6E799758CEE75DAe3d84e09D40dc416eCf713652',
    limitOrderManager: '0x000000000000c9B3E2C3EC88B1B4c0cD853f4321',
    ptOracle: '0x66a1096C6366b2529274dF4f5D8247827fe4CEA8',
  },
  // Arbitrum One
  42161: {
    router: '0x00000000005BBB0EF59571E58418F9a4357b68A0',
    routerStatic: '0xAdB09F65bd90d19e3148D9ccb693F3161C6DB3E8',
    pendleMarketFactory: '0x2FCb47B58350cD377f94d3821e7373Df60bD9Ced',
    vePendle: '0x3209E9412cca80B18338f2a56ADA59c484c39644',
    pendleToken: '0x0c880f6761F1af8d9Aa9C466984b80DAb9a8c9e8',
    votingController: '0x6A05B80E3363ef182a8C23f1B6E0f21CA8D88aB4',
    gaugeController: '0x1Fb669489Aec7a48d5B1D3E4F1B35eAe3bC02a51',
    feeDistributor: '0x8C237520a8E14D658170A633D96F8e80764433b9',
    pendleStaking: '0x6DB96BBEB081d2a85E0954C252f2c1dC108b3f81',
    limitOrderManager: '0x000000000000c9B3E2C3EC88B1B4c0cD853f4321',
    ptOracle: '0x1Fd95db7B7C0067De8D45C0cb35D59796adfD187',
  },
  // BNB Chain
  56: {
    router: '0x00000000005BBB0EF59571E58418F9a4357b68A0',
    routerStatic: '0x2700ADB035F82a11899ce1D3f1BF8451c296eABb',
    pendleMarketFactory: '0xC40fEbF5A33b8C92B187d9be0fD3fe0ac2E4B07c',
    vePendle: '0x8A09574b0401A856d89d1b583eE22E8cb0C5530e',
    pendleToken: '0xb3Ed0A426155B79B898849803E3B36552f7ED507',
    votingController: '0x000000000000000000000000000000000000dead',
    gaugeController: '0x000000000000000000000000000000000000dead',
    feeDistributor: '0x000000000000000000000000000000000000dead',
    pendleStaking: '0x000000000000000000000000000000000000dead',
    limitOrderManager: '0x000000000000c9B3E2C3EC88B1B4c0cD853f4321',
    ptOracle: '0x000000000000000000000000000000000000dead',
  },
  // Optimism
  10: {
    router: '0x00000000005BBB0EF59571E58418F9a4357b68A0',
    routerStatic: '0x704478Dd72FD7F9B83d1F1e0fc18C14B54F034d0',
    pendleMarketFactory: '0x17F100fB4bE2707675c6439468d38249DD993d58',
    vePendle: '0xd5C47D2383Fddc19596489280C0A33AC42b2bB18',
    pendleToken: '0xBC7B1Ff1c6989f006a1185318eD4E7b5796e66E1',
    votingController: '0x000000000000000000000000000000000000dead',
    gaugeController: '0x000000000000000000000000000000000000dead',
    feeDistributor: '0x000000000000000000000000000000000000dead',
    pendleStaking: '0x000000000000000000000000000000000000dead',
    limitOrderManager: '0x000000000000c9B3E2C3EC88B1B4c0cD853f4321',
    ptOracle: '0x000000000000000000000000000000000000dead',
  },
  // Mantle
  5000: {
    router: '0x00000000005BBB0EF59571E58418F9a4357b68A0',
    routerStatic: '0x1a7FF6c7E99e9D4aD17a5C4D1b5B8b1e0f4A5E8c',
    pendleMarketFactory: '0x4A5a4E0e9d87B8b4c0cD3d2E5F6A1B2C3D4E5F6A',
    vePendle: '0x000000000000000000000000000000000000dead',
    pendleToken: '0x000000000000000000000000000000000000dead',
    votingController: '0x000000000000000000000000000000000000dead',
    gaugeController: '0x000000000000000000000000000000000000dead',
    feeDistributor: '0x000000000000000000000000000000000000dead',
    pendleStaking: '0x000000000000000000000000000000000000dead',
    limitOrderManager: '0x000000000000c9B3E2C3EC88B1B4c0cD853f4321',
    ptOracle: '0x000000000000000000000000000000000000dead',
  },
};

export const getContractAddresses = (chainId: number): ContractAddresses | undefined => {
  return CONTRACT_ADDRESSES[chainId];
};

export const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';
export const DEAD_ADDRESS = '0x000000000000000000000000000000000000dead';

// Common token addresses
export const COMMON_TOKENS: Record<number, Record<string, string>> = {
  1: {
    WETH: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
    USDC: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
    USDT: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
    stETH: '0xae7ab96520DE3A18E5e111B5EaAb095312D7fE84',
    wstETH: '0x7f39C581F595B53c5cb19bD0b3f8dA6c935E2Ca0',
    rETH: '0xae78736Cd615f374D3085123A210448E74Fc6393',
    eETH: '0x35fA164735182de50811E8e2E824cFb9B6118ac2',
    weETH: '0xCd5fE23C85820F7B72D0926FC9b05b43E359b7ee',
    sUSDe: '0x9D39A5DE30e57443BfF2A8307A4256c8797A3497',
    PENDLE: '0x808507121B80c02388fAd14726482e061B8da827',
  },
  42161: {
    WETH: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
    USDC: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
    USDT: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9',
    wstETH: '0x5979D7b546E38E414F7E9822514be443A4800529',
    rETH: '0xEC70Dcb4A1EFa46b8F2D97C310C9c4790ba5ffA8',
    weETH: '0x35751007a407ca6FEFfE80b3cB397736D2cf4dbe',
    PENDLE: '0x0c880f6761F1af8d9Aa9C466984b80DAb9a8c9e8',
  },
};
