# n8n-nodes-pendle

> **[Velocity BPA Licensing Notice]**
>
> This n8n node is licensed under the Business Source License 1.1 (BSL 1.1).
>
> Use of this node by for-profit organizations in production environments requires a commercial license from Velocity BPA.
>
> For licensing information, visit https://velobpa.com/licensing or contact licensing@velobpa.com.

A comprehensive n8n community node for the **Pendle yield tokenization protocol**, providing 20 resources and 200+ operations for DeFi yield trading, liquidity provision, and vePENDLE staking.

![n8n](https://img.shields.io/badge/n8n-community--node-green)
![License](https://img.shields.io/badge/license-BSL--1.1-blue)
![TypeScript](https://img.shields.io/badge/TypeScript-5.4-blue)
![Pendle](https://img.shields.io/badge/Pendle-v2-cyan)

## Features

- **20 Resource Categories**: Market, PT, YT, SY, LP, Swap, Mint, Redeem, Yield, Staking, Voting, Rewards, Limit Orders, Router, Oracle, Analytics, Portfolio, Gas, Subgraph, Utility
- **200+ Operations**: Comprehensive coverage of Pendle protocol functionality
- **Multi-Chain Support**: Ethereum, Arbitrum, BNB Chain, Optimism, Mantle
- **Real-Time Triggers**: Market expiry alerts, APY changes, yield notifications, volume spikes
- **Yield Tokenization**: Full PT/YT operations for fixed and variable yield strategies
- **vePENDLE Staking**: Lock PENDLE, vote on pools, earn boosted rewards
- **Portfolio Tracking**: Monitor holdings, claimable yields, and position history
- **Gas Optimization**: Estimate gas costs for different operations

## Installation

### Community Nodes (Recommended)

1. Open n8n
2. Go to **Settings** > **Community Nodes**
3. Click **Install**
4. Enter `n8n-nodes-pendle`
5. Click **Install**

### Manual Installation

```bash
# Navigate to your n8n installation
cd ~/.n8n

# Install the package
npm install n8n-nodes-pendle

# Restart n8n
```

### Development Installation

```bash
# Clone the repository
git clone https://github.com/Velocity-BPA/n8n-nodes-pendle.git
cd n8n-nodes-pendle

# Install dependencies
npm install

# Build the project
npm run build

# Create symlink to n8n custom nodes
mkdir -p ~/.n8n/custom
ln -s $(pwd) ~/.n8n/custom/n8n-nodes-pendle

# Restart n8n
n8n start
```

## Credentials Setup

### Pendle Network Credentials

| Field | Description | Required |
|-------|-------------|----------|
| Network | Blockchain network (Ethereum, Arbitrum, BNB, Optimism, Mantle, Custom) | Yes |
| RPC Endpoint URL | Custom RPC URL (optional, uses defaults) | No |
| Private Key | For signing transactions (write operations) | No |
| Chain ID | Required for custom networks | Conditional |
| Pendle API Endpoint | Override API endpoint | No |

### Pendle API Credentials

| Field | Description | Required |
|-------|-------------|----------|
| API Endpoint | Pendle API URL | No |
| API Key | For authenticated endpoints | No |
| Subgraph URL | Custom subgraph URL | No |

## Resources & Operations

### Market Resource
- Get Markets, Get Market Info, Get Market by Address
- Get Active/Expired Markets, Get Market APY
- Get Implied/Underlying APY, Get Market Liquidity
- Get Market TVL, Get Market Expiry, Get Market Stats
- Search Markets

### PT (Principal Token) Resource
- Get PT Info, Get PT Price, Get PT Balance
- Get PT Yield, Get PT Discount, Buy/Sell PT
- Get PT Markets, Get PT Maturity, Redeem PT
- Get PT APY

### YT (Yield Token) Resource
- Get YT Info, Get YT Price, Get YT Balance
- Get YT Yield, Buy/Sell YT, Get YT Maturity
- Get Accrued Yield, Claim Yield, Get YT Leverage

### SY (Standardized Yield) Resource
- Get SY Info, Get SY Balance, Get Exchange Rate
- Get Supported SY Tokens, Wrap/Unwrap SY
- Get/Claim SY Rewards

### LP (Liquidity Provider) Resource
- Get LP Info/Balance/Value/APY/Composition
- Add/Remove Liquidity (dual and single-sided)
- Get LP Share, Zap In/Out

### Swap Resource
- Swap PT/YT for Token and vice versa
- Get Swap Quote, Get Price Impact
- Get Best Route

### Staking (vePENDLE) Resource
- Get vePENDLE Info, Lock PENDLE
- Extend/Increase Lock, Get Lock Info
- Get vePENDLE Balance, Get Voting Power
- Calculate vePENDLE, Withdraw

### Voting Resource
- Get Active Pools, Get Vote Allocations
- Vote for Pools, Get Pool Weights
- Get Voting Epoch

### And Many More...
- Mint, Redeem, Yield, Rewards, Limit Orders
- Router, Oracle, Analytics, Portfolio, Gas, Subgraph, Utility

## Trigger Node

The **Pendle Trigger** node monitors for real-time events:

- **Market Expiring Soon**: Alert before market maturity
- **Market Expired**: Trigger when markets expire
- **APY Changed**: Monitor significant yield changes
- **High Yield Alert**: Alert when yields exceed threshold
- **New Market Created**: Track new market deployments
- **TVL Changed**: Monitor liquidity changes
- **Volume Spike**: Detect unusual trading activity

## Usage Examples

### Buy PT for Fixed Yield

```json
{
  "resource": "pt",
  "operation": "buyPt",
  "marketAddress": "0x...",
  "tokenIn": "0x...",
  "amount": "1.0",
  "slippage": 0.5
}
```

### Get Portfolio Overview

```json
{
  "resource": "portfolio",
  "operation": "getPortfolioOverview",
  "walletAddress": "0x..."
}
```

### Lock PENDLE for vePENDLE

```json
{
  "resource": "staking",
  "operation": "lockPendle",
  "amount": "1000",
  "lockWeeks": 52
}
```

### Compare Market Yields

```json
{
  "resource": "analytics",
  "operation": "getMarketRankings",
  "sortBy": "apy",
  "limit": 10
}
```

## Pendle Concepts

| Term | Description |
|------|-------------|
| **PT (Principal Token)** | Represents the principal of a yield-bearing asset. Redeemable 1:1 at maturity. |
| **YT (Yield Token)** | Represents the yield of an asset until maturity. Value decays to zero at expiry. |
| **SY (Standardized Yield)** | Wrapper around yield-bearing assets (stETH, rETH, etc.) |
| **Maturity** | The date when PT becomes redeemable 1:1 for underlying |
| **Implied APY** | The market-derived yield rate from PT pricing |
| **Fixed Yield** | Guaranteed return from buying PT at discount |
| **Yield Leverage** | Amplified yield exposure via YT (1/YT_price) |
| **vePENDLE** | Vote-escrowed PENDLE for governance and boosted rewards |

## Networks

| Network | Chain ID | Status |
|---------|----------|--------|
| Ethereum Mainnet | 1 | ✅ Supported |
| Arbitrum One | 42161 | ✅ Supported |
| BNB Chain | 56 | ✅ Supported |
| Optimism | 10 | ✅ Supported |
| Mantle | 5000 | ✅ Supported |
| Custom | Any | ✅ Supported |

## Error Handling

The node includes comprehensive error handling:

- Network connection errors
- Invalid addresses
- Insufficient balances
- Slippage exceeded
- Market expired
- Oracle not ready
- Rate limiting

Use "Continue On Fail" option to handle errors gracefully in workflows.

## Security Best Practices

1. **Never share private keys** - Use environment variables
2. **Validate addresses** - Use the utility operations
3. **Set appropriate slippage** - Protect against MEV
4. **Monitor gas prices** - Use gas estimation operations
5. **Check market expiry** - Avoid trading expired markets
6. **Verify oracle prices** - Use TWAP for accurate pricing

## Development

```bash
# Install dependencies
npm install

# Build
npm run build

# Watch mode
npm run dev

# Lint
npm run lint

# Test
npm test

# Test with coverage
npm run test:coverage
```

## Author

**Velocity BPA**
- Website: [velobpa.com](https://velobpa.com)
- GitHub: [Velocity-BPA](https://github.com/Velocity-BPA)

## Licensing

This n8n community node is licensed under the **Business Source License 1.1**.

### Free Use
Permitted for personal, educational, research, and internal business use.

### Commercial Use
Use of this node within any SaaS, PaaS, hosted platform, managed service,
or paid automation offering requires a commercial license.

For licensing inquiries:
**licensing@velobpa.com**

See [LICENSE](LICENSE), [COMMERCIAL_LICENSE.md](COMMERCIAL_LICENSE.md), and [LICENSING_FAQ.md](LICENSING_FAQ.md) for details.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests and linting
5. Submit a pull request

## Support

- **Documentation**: [Pendle Docs](https://docs.pendle.finance/)
- **Issues**: [GitHub Issues](https://github.com/Velocity-BPA/n8n-nodes-pendle/issues)
- **Discord**: [Pendle Discord](https://discord.gg/pendle)

## Acknowledgments

- [Pendle Finance](https://pendle.finance/) - Yield tokenization protocol
- [n8n](https://n8n.io/) - Workflow automation platform
- [ethers.js](https://docs.ethers.org/) - Ethereum library
