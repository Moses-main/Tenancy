# Chainlink CRE Configuration

## Deployed Contract Addresses

### Base Sepolia (Testnet)
```env
# Core Contracts
PROPERTY_REGISTRY_ADDRESS=0x8f77c2BD2132727327B27164cDec4ccaA2083f7C
YIELD_DISTRIBUTOR_ADDRESS=0xd7c3c5e900Bd95653FA65b660a94625E1ddbBDA1
TEN_TOKEN_ADDRESS=0x539bd9076cB447Da9c88e722052293dD3394b536
PRICE_FEED_CONSUMER_ADDRESS=0xc8C6ecAA0287310bb8B0c9BE71253E758702b541
MARKETPLACE_ADDRESS=0xE07db63A23d6572dB1374B49DB7Cc063BE0aE035

# Chainlink
CHAINLINK_ROUTER=0xf9B8fc078197181C841c296C876945aaa425B278
CHAINLINK_SUBSCRIPTION_ID=6273
ETH_USD_PRICE_FEED=0x4a5816300e0eE47A41DFcDB12A8C8bB6dD18C12
```

### Ethereum Sepolia (Testnet)
```env
# Core Contracts
PROPERTY_REGISTRY_ADDRESS=0x452ba94272f3302E7b48bFFC1F5a57ec7136A6aA
YIELD_DISTRIBUTOR_ADDRESS=0x84bc076C939Aa2B70e0DaEbA708B3aDa3881a179
TEN_TOKEN_ADDRESS=0x9e395acF058c74386b531e4c901C53B1c73E6D5F
PRICE_FEED_CONSUMER_ADDRESS=0xE88A399F85550dDF61f9DD6Cb91e2673817D7f91
MARKETPLACE_ADDRESS=0x0000000000000000000000000000000000000000

# Chainlink
ETH_USD_PRICE_FEED=0x694AA1769357215DE4FAC081bf1f309aDC325306
```

## Environment Variables

Create a `.env` file in the `cre-workflow/` directory:

```bash
# Ethereum Sepolia
SEPOLIA_RPC_URL=https://rpc.sepolia.org
PRIVATE_KEY=0x...

# Base Sepolia
BASE_SEPOLIA_RPC_URL=https://sepolia.base.org

# Contract Addresses (Base Sepolia - deployed)
PROPERTY_REGISTRY_ADDRESS=0x8f77c2BD2132727327B27164cDec4ccaA2083f7C
YIELD_DISTRIBUTOR_ADDRESS=0xd7c3c5e900Bd95653FA65b660a94625E1ddbBDA1

# Chainlink Price Feed (Base Sepolia)
ETH_USD_PRICE_FEED=0x4a5816300e0eE47A41DFcDB12A8C8bB6dD18C12

# Chainlink Functions (Base Sepolia)
CHAINLINK_ROUTER=0xf9B8fc078197181C841c296C876945aaa425B278
CHAINLINK_SUBSCRIPTION_ID=6273

# Chainlink Node Configuration
CHAINLINK_NODE_URL=http://localhost:6688
CHAINLINK_NODE_EMAIL=admin@example.com
CHAINLINK_NODE_PASSWORD=password

# External Adapter API (for payment verification)
EXTERNAL_ADAPTER_URL=http://localhost:8080
EXTERNAL_ADAPTER_API_KEY=your-api-key

# Confidential API (for secure payment data)
CONFIDENTIAL_API_URL=https://api.tenancy.internal
CONFIDENTIAL_API_KEY=your-confidential-api-key
```

## Chainlink Job Specification

Create a job in your Chainlink node with the following TOML:

```toml
type = "directrequest"
schemaVersion = 1
name = "TENANCY Payment Verification"
contractAddress = "0x..."
externalJobID = "uuid-here"
forwardingAllowed = false
maxTaskDuration = "30s"
observationSource = """
    decode_log   [type="ethabidecodelog"
                  abi="OracleRequest(bytes32 requestId, uint256 payment, address callbackAddr, bytes4 callbackFunctionId, uint256 cancelExpiration, uint256 dataVersion, bytes[] data)"
                  topics0="0x4e71d92d"
                  data="<masked>"
                  ]

    fetch_payment [type="http"
                  method="GET"
                  url="https://api.tenancy.internal/payments/${decode_log.data}"
                  requestData="{ \"propertyId\": ${decode_log.data} }"
                  timeout="10s"]

    parse_response [type="jsonparse"
                   path="data,status"
                   data="${fetch_payment.response}"]

    encode_data    [type="ethabiencode"
                   abi="(bytes32 requestId, bool verified)"
                   data="{\"requestId\": \"${decode_log.requestId}\", \"verified\": \"${parse_response}\"}"]

    encode_tx      [type="ethabiencode"
                   abi="fulfill(bytes32 requestId, bytes _data)"
                   data="{\"_data\": \"${encode_data}\"}"]

    submit_tx      [type="ethtx"
                   to="0x..."
                   data="${encode_tx}"
                   gasLimit="200000"]

    decode_log -> fetch_payment -> parse_response -> encode_data -> encode_tx -> submit_tx
"""
```

## External Adapter

The payment verification external adapter should implement:

### Request
```json
{
  "propertyId": "123",
  "tenantAddress": "0x...",
  "expectedAmount": "2500000000000000000"
}
```

### Response
```json
{
  "verified": true,
  "transactionHash": "0x...",
  "paymentDate": "2024-01-15T00:00:00Z",
  "amount": "2500000000000000000"
}
```

## Running the Workflow

### Local Development (Simulation)
```bash
cd cre-workflow
npm install
npm run simulate
```

### Production
```bash
# Set up Chainlink node first, then:
npm run dev
```

## Workflow Flow

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│  Trigger       │────▶│  Fetch Payments  │────▶│  Verify         │
│  (Cron/Event)  │     │  (External       │     │  (Consensus)    │
│                │     │   Adapter)        │     │                 │
└─────────────────┘     └──────────────────┘     └────────┬────────┘
                                                          │
                                                          ▼
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│  On-Chain      │◀────│  Execute         │<────│  Calculate      │
│  Distribution  │     │  (YieldDist.)   │     │  Yield (USD)    │
└─────────────────┘     └──────────────────┘     └─────────────────┘
```

## Contract Methods Used

### YieldDistributor
- `depositYield(uint256 propertyId, uint256 amount)`
- `createDistribution(uint256 propertyId, uint256 totalYield, uint256[] holderBalances, address[] holders)`
- `startDistribution(uint256 distributionId)`
- `pauseDistribution(uint256 distributionId)`
- `getAgentDecision(uint256 propertyId)`
- `getEthUsdPrice()`
- `checkReserveHealth()`

### PropertyRegistry
- `getProperty(uint256 propertyId)`
- `getAllProperties()`
