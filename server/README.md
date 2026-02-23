# TENANCY Mock Backend (Express)

A minimal development backend to simulate off-chain rental payment verification and a Chainlink-trigger simulation for the TENANCY protocol.

This is intended for local development and integration testing only (do not use in production).

Features:
- Request verification of lease/payment proofs (simulated asynchronous verification).
- Protected webhook endpoint to simulate bank provider notifications.
- Protected endpoint to simulate triggering a Chainlink job / CRE on-chain call (mocked).
- In-memory store for verifications (ephemeral).

Environment
- Copy `.env.example` to `.env` and set `API_KEY` to a strong secret.
- Defaults:
  - PORT: 4010
  - NODE_ENV: development

Quick start
1. cd server
2. npm install
3. cp .env.example .env && edit .env to set API_KEY
4. npm run dev

Example requests

Request a verification (public):
curl -X POST http://localhost:4010/verify-payment \
  -H "Content-Type: application/json" \
  -d '{"propertyId":"Prop-0x123","amount":2500,"tenantName":"Alice","proofUrl":"ipfs://Qm..."}'

Simulate webhook from bank (protected):
curl -X POST http://localhost:4010/webhook/payment \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{"verificationId":"<id_from_previous>","providerReference":"bank_tx_123","amount":2500}'

Trigger Chainlink job (protected):
curl -X POST http://localhost:4010/trigger-chainlink \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{"verificationId":"<id_from_previous>"}'

Inspect verification (dev):
GET http://localhost:4010/verifications/<id>

Notes
- This backend stores state in memory. Restarting the server clears all verifications.
- The Chainlink trigger and txHash are mocked for frontend/testing flows.
- Secure the API_KEY in any shared environment and restrict network access for real deployments.

License: MIT