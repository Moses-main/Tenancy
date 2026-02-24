# Chainlink CRE Configuration

## Environment Variables

Create a `.env` file in the `cre-workflow/` directory:

```bash
# Ethereum Sepolia
SEPOLIA_RPC_URL=https://rpc.sepolia.org
PRIVATE_KEY=0x...

# Contract Addresses (after deployment)
PROPERTY_REGISTRY_ADDRESS=0x...
YIELD_DISTRIBUTOR_ADDRESS=0x...

# Chainlink Price Feed (Sepolia)
ETH_USD_PRICE_FEED=0x694AA1769357215DE4FAC081bf1f309aDC325306

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
                  requestData="{ \\"propertyId\\": ${decode_log.data} }"
                  timeout="10s"]

    parse_response [type="jsonparse"
                   path="data,status"
                   data="${fetch_payment.response}"]

    encode_data    [type="ethabiencode"
                   abi="(bytes32 requestId, bool verified)"
                   data="{\\"requestId\\": \\"${decode_log.requestId}\\", \\"verified\\": \\"${parse_response}\\"}"]

    encode_tx      [type="ethabiencode"
                   abi="fulfill(bytes32 requestId, bytes _data)"
                   data="{\\"_data\\": \\"${encode_data}\\"}"]

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
│  On-Chain      │◀────│  Execute         │◀────│  Calculate      │
│  Distribution  │     │  (YieldDist.)   │     │  Yield (USD)    │
└─────────────────┘     └──────────────────┘     └─────────────────┘
```
