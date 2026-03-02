# TENANCY CRE Workflow

Chainlink Runtime Environment (CRE) workflow for rental payment verification and automated yield distribution.

## What is Chainlink CRE?

Chainlink CRE is a decentralized oracle network that enables smart contracts to securely interact with external data. For TENANCY, CRE handles:

1. **Off-Chain Payment Verification** - Verifies tenant rent payments through confidential APIs
2. **Consensus-Based Validation** - Multiple node operators independently verify payment status
3. **Automated Yield Distribution** - Triggers on-chain yield distribution when payments are verified

## Architecture

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   Trigger   │───▶│  Off-Chain  │───▶│  On-Chain   │
│  Cron 00:00 │    │   Verify &  │    │   Yield     │
│   OR Event  │    │  Consensus  │    │ Distribution│
└─────────────┘    └─────────────┘    └─────────────┘
```

## Workflow Steps

### 1. Trigger
- **Cron**: Every 30 minutes (configurable in `config.staging.json`)

### 2. Off-Chain Verification
- Fetches payment status from the payment API
- Verifies transaction exists on-chain
- Validates payment amount matches rental agreement

### 3. Consensus
- Multiple node operators verify payment independently
- Threshold-based consensus
- Privacy-preserving: sensitive data is masked in logs

### 4. On-Chain Distribution
Once verified:
- Calls `YieldDistributor.createDistribution()`
- Calls `YieldDistributor.startDistribution()`

## Prerequisites

1. **Bun** - Install: `curl -fsSL https://bun.sh/install | bash`
2. **CRE CLI** - Install: `curl -sSL https://cre.chain.link/install.sh | bash`
3. **CRE Account** - Sign up at https://cre.chain.link

## Installation

```bash
cd cre-workflow
bun install
```

## Configuration

### config.staging.json
```json
{
  "schedule": "0 */30 * * * *",
  "networks": {
    "baseSepolia": {
      "chainSelector": "10344971243874460880",
      "propertyRegistryAddress": "0x8f77c2BD2132727327B27164cDec4ccaA2083f7C",
      "yieldDistributorAddress": "0xd7c3c5e900Bd95653FA65b660a94625E1ddbBDA1",
      "priceFeedAddress": "0x4a5816300e0eE47A41DFcDB12A8C8bB6dD18C12"
    }
  },
  "secrets": {
    "paymentApiUrl": "https://api.tenancy.internal",
    "paymentApiKey": "",
    "llmProvider": "openai",
    "openaiApiKey": "",
    "groqApiKey": "",
    "ollamaUrl": "http://localhost:11434"
  }
}
```

### LLM Providers

| Provider | Free? | Setup Required |
|----------|-------|----------------|
| **OpenAI** | $5 credit for new accounts | Get API key from platform.openai.com |
| **Groq** | Yes (limited) | Get API key from console.groq.com |
| **Ollama** | Yes (runs locally) | Install at ollama.com, run `ollama serve` |

Set `llmProvider` to `"openai"`, `"groq"`, or `"ollama"` in your config.

## Running

### Simulate Locally
```bash
bun run simulate
```

### Simulate with Onchain Calls
```bash
bun run simulate:broadcast
```

### Deploy to CRE
```bash
bun run deploy
```

## Contract Addresses

### Base Sepolia (Testnet)
| Contract | Address |
|----------|---------|
| PropertyRegistry | `0x8f77c2BD2132727327B27164cDec4ccaA2083f7C` |
| YieldDistributor | `0xd7c3c5e900Bd95653FA65b660a94625E1ddbBDA1` |
| ETH/USD Price Feed | `0x4a5816300e0eE47A41DFcDB12A8C8bB6dD18C12` |

## Files

```
cre-workflow/
├── src/
│   └── main.ts          # CRE workflow entry point
├── config.staging.json  # Staging configuration
├── config.production.json # Production configuration
├── cre-workflow-settings.json # Target settings
├── package.json
└── tsconfig.json
```
