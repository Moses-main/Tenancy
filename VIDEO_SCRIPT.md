# TENANCY Protocol - Video Script

## Video Overview
- **Duration**: 3-5 minutes
- **Target Audience**: Hackathon judges, DeFi enthusiasts, potential investors
- **Tone**: Professional, technical but accessible
- **Network**: Base Sepolia / Sepolia Testnet

---

## Scene 1: Introduction (30 seconds)

**[0:00 - 0:30]**

*Opening shot: TENANCY Protocol logo with tagline*

**Narrator:**
> "TENANCY Protocol transforms real estate into blockchain tokens. We tokenize rental income rights as ERC-20 tokens, verify payments via Chainlink CRE automation, and distribute yields automatically to investors. Built on Base Sepolia."

*Transition: Fade to demo interface showing Home page*

---

## Scene 2: Connect Wallet & Dashboard (30 seconds)

**[0:30 - 1:00]**

*Screen: Home page - http://localhost:5173*

**Narrator:**
> "Welcome to the TENANCY dashboard. Users connect their wallet using Privy—supporting both email and wallet authentication."

*Action: Show Connect Wallet button*

**Narrator:**
> "The dashboard displays platform statistics: total value tokenized, TEN token balance, and active properties—all powered by real-time blockchain data."

*Show network switch warning if needed*

**Narrator:**
> "Users need to switch to Base Sepolia or Sepolia testnet to interact with the protocol."

---

## Scene 3: Property Tokenization - Issuer (60 seconds)

**[1:00 - 2:00]**

*Screen: Issuer Portal - http://localhost:5173/issuer*

**Narrator:**
> "Step one: Property tokenization. Property owners become Issuers by registering their rental properties on-chain."

*Action: Show property registration form*

**Narrator:**
> "Issuers enter property details—name, monthly rent in USDC, stream duration, and lease proof stored on IPFS."

*Action: Fill form and submit*

**Narrator:**
> "When an Issuer creates a property, the smart contract mints a new ERC-20 token representing fractional ownership of that property's rental income."

*Show transaction confirmation*

**Narrator:**
> "The property now appears in the Issuer's dashboard with metadata—rent amount, total supply, and active status—all verified on-chain."

---

## Scene 4: Invest in Properties - Investor (60 seconds)

**[2:00 - 3:00]**

*Screen: Investor Portal - http://localhost:5173/investor*

**Narrator:**
> "Step two: Investment. Investors browse available properties and purchase tokenized income rights."

*Action: Show property list with APY, value, tokens available*

**Narrator:**
> "Each property shows key metrics—yield percentage, property value, and available tokens. Prices are calculated using Chainlink Price Feeds."

*Action: Click Buy Tokens on a property*

**Narrator:**
> "Investors swap USDC for property tokens, receiving fractional ownership of the rental income stream."

*Show transaction confirmation*

**Narrator:**
> "The investor's TEN balance updates, and they're now eligible to claim yield when payments are verified."

---

## Scene 5: Pay Rent - Tenant (45 seconds)

**[3:00 - 3:45]**

*Screen: Tenant Portal - http://localhost:5173/tenant*

**Narrator:**
> "Step three: Rent payment. Tenants can view their lease details and make payments."

*Action: Show lease information*

**Narrator:**
> "Tenants see their monthly rent amount, due dates, and payment history—all stored on-chain."

*Action: Show MoonPay integration for buying crypto*

**Narrator:**
> "For tenants who need funds, MoonPay integration allows easy crypto purchase directly within the app."

---

## Scene 6: CRE Workflow & AI Agent (60 seconds)

**[3:45 - 4:45]**

*Screen: Agent Portal - http://localhost:5173/agent*

**Narrator:**
> "This is the Chainlink CRE workflow and AI Agent in action. Every 24 hours, it autonomously manages rental properties."

*Action: Show Agent dashboard*

**Narrator:**
> "The AI Agent analyzes property performance and makes decisions: distribute yield, pause yield, adjust rent, or flag defaults."

*Action: Click "Trigger Agent Now"*

**Narrator:**
> "Users can manually trigger the agent to see real-time AI decision-making with confidence scores."

**Narrator:**
> "The workflow uses Chainlink Price Feeds for ETH/USD pricing, ensuring accurate yield calculations in USD terms."

*Show decision table with AI recommendations*

---

## Scene 7: Claim Yield with World ID (45 seconds)

**[4:45 - 5:30]**

*Screen: Investor Portal - Claim Yield section*

**Narrator:**
> "Finally, investors claim their accumulated yield. World ID verification ensures each claimant is a unique human—preventing sybil attacks."

*Action: Show World ID verification widget*

**Narrator:**
> "After World ID verification, investors click 'Claim All Yields' to receive their rental income."

*Show successful claim notification*

---

## Scene 8: Conclusion (30 seconds)

**[5:30 - 6:00]**

*Screen: Home page with stats*

**Narrator:**
> "TENANCY brings the $50 trillion real estate market on-chain. With Chainlink Price Feeds, CRE automation, AI insights, and World ID identity verification—we're building the next generation of property DeFi."

*Closing: Logo + tagline*

**Narrator:**
> "Deploy on Base Sepolia or Sepolia. Try the CRE workflow simulation. Tokenize your first property today. Thank you for watching."

---

## Technical Stack Shown

| Feature | Technology |
|---------|------------|
| Smart Contracts | Solidity 0.8.19, Foundry |
| Blockchain | Base Sepolia / Sepolia |
| Price Feeds | Chainlink ETH/USD |
| Automation | Chainlink CRE |
| AI Analysis | Groq LLM (simulated locally) |
| Privacy | Confidential HTTP |
| Identity | World ID |
| Frontend | React 19, Vite, TypeScript, Tailwind CSS |
| Auth | Privy (wallet + email) |
| Testing | Tenderly Virtual TestNets |

---

## Recording Tips

1. **Use screen recording** with high quality (1080p)
2. **Record browser** showing the React app at http://localhost:5173
3. **Show wallet** connected with Base Sepolia testnet
4. **Highlight** Chainlink integrations prominently
5. **Keep pace** - 5-6 minutes max
6. **Add subtitles** for technical terms
7. **Show transactions** in wallet confirmation dialogs
8. **Demonstrate** the full flow from Issuer → Investor → Tenant → Agent

---

## Application URLs

| Page | Route | Purpose |
|------|-------|---------|
| Home | `/` | Dashboard with stats |
| Issuer | `/issuer` | Create & manage properties |
| Investor | `/investor` | Buy tokens, claim yield |
| Tenant | `/tenant` | Pay rent, view leases |
| Marketplace | `/marketplace` | Browse property listings |
| Agent | `/agent` | AI agent dashboard |
