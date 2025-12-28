/*
 * Copyright (c) Velocity BPA, LLC
 * Licensed under the Business Source License 1.1
 * Commercial use requires a separate commercial license.
 * See LICENSE file for details.
 */

/**
 * Pendle Protocol ABIs for smart contract interactions
 * These are simplified ABIs containing only the functions we need
 */

export const ERC20_ABI = [
  'function name() view returns (string)',
  'function symbol() view returns (string)',
  'function decimals() view returns (uint8)',
  'function totalSupply() view returns (uint256)',
  'function balanceOf(address account) view returns (uint256)',
  'function allowance(address owner, address spender) view returns (uint256)',
  'function approve(address spender, uint256 amount) returns (bool)',
  'function transfer(address to, uint256 amount) returns (bool)',
  'function transferFrom(address from, address to, uint256 amount) returns (bool)',
  'event Transfer(address indexed from, address indexed to, uint256 value)',
  'event Approval(address indexed owner, address indexed spender, uint256 value)',
];

export const PENDLE_MARKET_ABI = [
  'function PT() view returns (address)',
  'function YT() view returns (address)',
  'function SY() view returns (address)',
  'function expiry() view returns (uint256)',
  'function isExpired() view returns (bool)',
  'function totalActiveSupply() view returns (uint256)',
  'function totalPt() view returns (uint256)',
  'function totalSy() view returns (uint256)',
  'function getReserves() view returns (uint256 syReserve, uint256 ptReserve)',
  'function readState(address router) view returns (tuple(uint256 totalPt, uint256 totalSy, uint256 totalLp, address treasury, int256 scalarRoot, uint256 expiry, uint256 lnFeeRateRoot, uint256 reserveFeePercent, uint256 lastLnImpliedRate))',
  'event Swap(address indexed caller, address indexed receiver, int256 netPtOut, int256 netSyOut, uint256 netSyFee, uint256 netSyToReserve)',
  'event Mint(address indexed receiver, uint256 netLpMinted, uint256 netSyUsed, uint256 netPtUsed)',
  'event Burn(address indexed receiver, address indexed receiverPt, address indexed receiverSy, uint256 netLpBurned, uint256 netSyOut, uint256 netPtOut)',
];

export const PENDLE_ROUTER_ABI = [
  // Swap functions
  'function swapExactTokenForPt(address receiver, address market, uint256 minPtOut, tuple(uint256 guessMin, uint256 guessMax, uint256 guessOffchain, uint256 maxIteration, uint256 eps) guessPtOut, tuple(address tokenIn, uint256 netTokenIn, address tokenMintSy, address pendleSwap, tuple(uint8 swapType, address extRouter, bytes extCalldata, bool needScale) swapData) input, tuple(address limitRouter, uint256 epsSkipMarket, tuple(address order, bytes signature, uint256 makingAmount)[] normalFills, tuple(address order, bytes signature, uint256 makingAmount)[] flashFills, bytes optData) limit) returns (uint256 netPtOut, uint256 netSyFee, uint256 netSyInterm)',
  'function swapExactPtForToken(address receiver, address market, uint256 exactPtIn, tuple(address tokenOut, uint256 minTokenOut, address tokenRedeemSy, address pendleSwap, tuple(uint8 swapType, address extRouter, bytes extCalldata, bool needScale) swapData) output, tuple(address limitRouter, uint256 epsSkipMarket, tuple(address order, bytes signature, uint256 makingAmount)[] normalFills, tuple(address order, bytes signature, uint256 makingAmount)[] flashFills, bytes optData) limit) returns (uint256 netTokenOut, uint256 netSyFee, uint256 netSyInterm)',
  'function swapExactTokenForYt(address receiver, address market, uint256 minYtOut, tuple(uint256 guessMin, uint256 guessMax, uint256 guessOffchain, uint256 maxIteration, uint256 eps) guessYtOut, tuple(address tokenIn, uint256 netTokenIn, address tokenMintSy, address pendleSwap, tuple(uint8 swapType, address extRouter, bytes extCalldata, bool needScale) swapData) input, tuple(address limitRouter, uint256 epsSkipMarket, tuple(address order, bytes signature, uint256 makingAmount)[] normalFills, tuple(address order, bytes signature, uint256 makingAmount)[] flashFills, bytes optData) limit) returns (uint256 netYtOut, uint256 netSyFee, uint256 netSyInterm)',
  'function swapExactYtForToken(address receiver, address market, uint256 exactYtIn, tuple(address tokenOut, uint256 minTokenOut, address tokenRedeemSy, address pendleSwap, tuple(uint8 swapType, address extRouter, bytes extCalldata, bool needScale) swapData) output, tuple(address limitRouter, uint256 epsSkipMarket, tuple(address order, bytes signature, uint256 makingAmount)[] normalFills, tuple(address order, bytes signature, uint256 makingAmount)[] flashFills, bytes optData) limit) returns (uint256 netTokenOut, uint256 netSyFee, uint256 netSyInterm)',
  
  // Liquidity functions
  'function addLiquidityDualTokenAndPt(address receiver, address market, tuple(address tokenIn, uint256 netTokenIn, address tokenMintSy, address pendleSwap, tuple(uint8 swapType, address extRouter, bytes extCalldata, bool needScale) swapData) input, uint256 netPtIn, uint256 minLpOut) returns (uint256 netLpOut, uint256 netSyMinted, uint256 netPtUsed)',
  'function addLiquiditySingleToken(address receiver, address market, uint256 minLpOut, tuple(uint256 guessMin, uint256 guessMax, uint256 guessOffchain, uint256 maxIteration, uint256 eps) guessPtReceivedFromSy, tuple(address tokenIn, uint256 netTokenIn, address tokenMintSy, address pendleSwap, tuple(uint8 swapType, address extRouter, bytes extCalldata, bool needScale) swapData) input, tuple(address limitRouter, uint256 epsSkipMarket, tuple(address order, bytes signature, uint256 makingAmount)[] normalFills, tuple(address order, bytes signature, uint256 makingAmount)[] flashFills, bytes optData) limit) returns (uint256 netLpOut, uint256 netSyFee, uint256 netSyInterm)',
  'function removeLiquidityDualTokenAndPt(address receiver, address market, uint256 netLpIn, tuple(address tokenOut, uint256 minTokenOut, address tokenRedeemSy, address pendleSwap, tuple(uint8 swapType, address extRouter, bytes extCalldata, bool needScale) swapData) output, uint256 minPtOut) returns (uint256 netTokenOut, uint256 netPtOut)',
  'function removeLiquiditySingleToken(address receiver, address market, uint256 netLpIn, tuple(address tokenOut, uint256 minTokenOut, address tokenRedeemSy, address pendleSwap, tuple(uint8 swapType, address extRouter, bytes extCalldata, bool needScale) swapData) output, tuple(address limitRouter, uint256 epsSkipMarket, tuple(address order, bytes signature, uint256 makingAmount)[] normalFills, tuple(address order, bytes signature, uint256 makingAmount)[] flashFills, bytes optData) limit) returns (uint256 netTokenOut, uint256 netSyFee, uint256 netSyInterm)',
  
  // Mint/Redeem functions
  'function mintSyFromToken(address receiver, address SY, uint256 minSyOut, tuple(address tokenIn, uint256 netTokenIn, address tokenMintSy, address pendleSwap, tuple(uint8 swapType, address extRouter, bytes extCalldata, bool needScale) swapData) input) returns (uint256 netSyOut)',
  'function redeemSyToToken(address receiver, address SY, uint256 netSyIn, tuple(address tokenOut, uint256 minTokenOut, address tokenRedeemSy, address pendleSwap, tuple(uint8 swapType, address extRouter, bytes extCalldata, bool needScale) swapData) output) returns (uint256 netTokenOut)',
  'function mintPyFromSy(address receiver, address YT, uint256 netSyIn, uint256 minPyOut) returns (uint256 netPyOut)',
  'function mintPyFromToken(address receiver, address YT, uint256 minPyOut, tuple(address tokenIn, uint256 netTokenIn, address tokenMintSy, address pendleSwap, tuple(uint8 swapType, address extRouter, bytes extCalldata, bool needScale) swapData) input) returns (uint256 netPyOut, uint256 netSyInterm)',
  'function redeemPyToSy(address receiver, address YT, uint256 netPyIn, uint256 minSyOut) returns (uint256 netSyOut)',
  'function redeemPyToToken(address receiver, address YT, uint256 netPyIn, tuple(address tokenOut, uint256 minTokenOut, address tokenRedeemSy, address pendleSwap, tuple(uint8 swapType, address extRouter, bytes extCalldata, bool needScale) swapData) output) returns (uint256 netTokenOut, uint256 netSyInterm)',
  'function redeemDueInterestAndRewards(address user, address[] SYs, address[] YTs, address[] markets) returns (uint256[][] netSyOut, uint256[][] netRewardsOut)',
];

export const PENDLE_ROUTER_STATIC_ABI = [
  'function addLiquiditySingleTokenStatic(address market, address tokenIn, uint256 netTokenIn) view returns (uint256 netLpOut, uint256 netPtFromSwap, uint256 netSyFee, uint256 priceImpact, uint256 exchangeRateAfter, uint256 netSyFromToken, uint256 netSyToSwap)',
  'function removeLiquiditySingleTokenStatic(address market, address tokenOut, uint256 netLpIn) view returns (uint256 netTokenOut, uint256 netSyFromBurn, uint256 netPtFromBurn, uint256 netSyFee, uint256 priceImpact, uint256 exchangeRateAfter)',
  'function swapExactTokenForPtStatic(address market, address tokenIn, uint256 netTokenIn) view returns (uint256 netPtOut, uint256 netSyToSwap, uint256 netSyFee, uint256 priceImpact, uint256 exchangeRateAfter, uint256 netSyFromToken)',
  'function swapExactPtForTokenStatic(address market, uint256 exactPtIn, address tokenOut) view returns (uint256 netTokenOut, uint256 netSyToToken, uint256 netSyFee, uint256 priceImpact, uint256 exchangeRateAfter)',
  'function swapExactTokenForYtStatic(address market, address tokenIn, uint256 netTokenIn) view returns (uint256 netYtOut, uint256 netSyToSwap, uint256 netSyFee, uint256 priceImpact, uint256 exchangeRateAfter, uint256 netSyFromToken)',
  'function swapExactYtForTokenStatic(address market, uint256 exactYtIn, address tokenOut) view returns (uint256 netTokenOut, uint256 netSyToToken, uint256 netSyFee, uint256 priceImpact, uint256 exchangeRateAfter)',
  'function getMarketState(address market) view returns (tuple(uint256 totalPt, uint256 totalSy, uint256 totalLp, address treasury, int256 scalarRoot, uint256 expiry, uint256 lnFeeRateRoot, uint256 reserveFeePercent, uint256 lastLnImpliedRate) state)',
  'function getPtToSyRate(address market) view returns (uint256)',
  'function getSyToAssetRate(address SY) view returns (uint256)',
  'function getImpliedYield(address market) view returns (int256)',
];

export const VE_PENDLE_ABI = [
  'function totalSupply() view returns (uint128)',
  'function balanceOf(address user) view returns (uint128)',
  'function positionData(address user) view returns (uint128 amount, uint128 expiry)',
  'function increaseLockPosition(uint128 additionalAmountToLock, uint128 newExpiry) returns (uint128 newVeBalance)',
  'function withdraw() returns (uint128)',
  'event NewLockPosition(address indexed user, uint128 amount, uint128 expiry)',
  'event Withdraw(address indexed user, uint128 amount)',
];

export const VOTING_CONTROLLER_ABI = [
  'function vote(address[] pools, uint64[] weights)',
  'function getVotedPools(address user) view returns (address[] pools, uint64[] weights)',
  'function getPoolTotalVotes(address pool) view returns (uint128)',
  'function getUserVotingPower(address user) view returns (uint128)',
  'function getWeekData(uint128 timestamp) view returns (bool isEpochFinalized, uint128 totalVotes)',
  'event Vote(address indexed user, address[] pools, uint64[] weights, uint128 timestamp)',
];

export const PT_ORACLE_ABI = [
  'function getPtToAssetRate(address market, uint32 duration) view returns (uint256)',
  'function getOracleState(address market, uint32 duration) view returns (bool increaseCardinalityRequired, uint16 cardinalityRequired, bool oldestObservationSatisfied)',
  'function getCardinality(address market) view returns (uint16)',
  'event SetBlockTimestamp(address indexed market, uint32 blockTimestamp)',
];

export const SY_ABI = [
  ...ERC20_ABI,
  'function yieldToken() view returns (address)',
  'function getTokensIn() view returns (address[] tokensIn)',
  'function getTokensOut() view returns (address[] tokensOut)',
  'function exchangeRate() view returns (uint256)',
  'function deposit(address receiver, address tokenIn, uint256 amountTokenToDeposit, uint256 minSharesOut) returns (uint256 amountSharesOut)',
  'function redeem(address receiver, uint256 amountSharesToRedeem, address tokenOut, uint256 minTokenOut, bool burnFromInternalBalance) returns (uint256 amountTokenOut)',
  'function claimRewards(address user) returns (uint256[] rewardAmounts)',
  'function getRewardTokens() view returns (address[] rewardTokens)',
  'function accruedRewards(address user) view returns (uint256[] rewardAmounts)',
];

export const PT_ABI = [
  ...ERC20_ABI,
  'function SY() view returns (address)',
  'function YT() view returns (address)',
  'function expiry() view returns (uint256)',
  'function isExpired() view returns (bool)',
];

export const YT_ABI = [
  ...ERC20_ABI,
  'function SY() view returns (address)',
  'function PT() view returns (address)',
  'function expiry() view returns (uint256)',
  'function isExpired() view returns (bool)',
  'function pyIndexStored() view returns (uint256)',
  'function pyIndexLastUpdatedBlock() view returns (uint256)',
  'function redeemDueInterestAndRewards(address user, bool redeemInterest, bool redeemRewards) returns (uint256 interestOut, uint256[] rewardsOut)',
  'function userInterest(address user) view returns (uint128 index, uint128 accrued)',
  'function getRewardTokens() view returns (address[] rewardTokens)',
];

export const LIMIT_ORDER_MANAGER_ABI = [
  'function createOrder(tuple(uint256 salt, uint256 expiry, uint256 nonce, uint8 orderType, address token, address YT, address maker, address receiver, uint256 makingAmount, uint256 lnImpliedRate, uint256 failSafeRate, bytes permit) order) returns (bytes32 orderHash)',
  'function cancelOrder(tuple(uint256 salt, uint256 expiry, uint256 nonce, uint8 orderType, address token, address YT, address maker, address receiver, uint256 makingAmount, uint256 lnImpliedRate, uint256 failSafeRate, bytes permit) order)',
  'function cancelBatchOrders(tuple(uint256 salt, uint256 expiry, uint256 nonce, uint8 orderType, address token, address YT, address maker, address receiver, uint256 makingAmount, uint256 lnImpliedRate, uint256 failSafeRate, bytes permit)[] orders)',
  'function orderStatusOf(address maker, bytes32 orderHash) view returns (uint256 remaining)',
  'event OrderCreated(bytes32 indexed orderHash, address indexed maker, uint256 amount)',
  'event OrderCancelled(bytes32 indexed orderHash, address indexed maker, uint256 remaining)',
  'event OrderFilled(bytes32 indexed orderHash, address indexed maker, uint256 filledAmount)',
];
