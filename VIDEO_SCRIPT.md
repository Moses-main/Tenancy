# TENANCY Protocol - Video Script

## Video Overview
- **Duration**: 3-5 minutes
- **Target Audience**: Hackathon judges, DeFi enthusiasts, potential investors
- **Tone**: Professional, technical but accessible

---

## Scene 1: Introduction (30 seconds)

**[0:00 - 0:30]**

*Opening shot: Logo animation with tagline*

**Narrator:**
> "TENANCY transforms real estate into blockchain tokens. We tokenize rental income rights, verify payments via Chainlink CRE, and distribute yields automatically. Welcome to the future of property investing."

*Transition: Fade to demo interface*

---

## Scene 2: Property Tokenization (45 seconds)

**[0:30 - 1:15]**

*Screen: Issuer portal - Register Property*

**Narrator:**
> "Step one: Property tokenization. Issuers register properties on-chain, creating ERC-20 tokens that represent fractional ownership and rental income rights."

*Action: Show property registration form*

**Narrator:**
> "Each property gets its own token with metadata—location, rent amount, tenant count—all stored on IPFS and referenced on-chain."

*Transition: Show property listed*

---

## Scene 3: CRE Workflow + AI Demo (90 seconds)

**[1:15 - 2:45]**

*Screen: Terminal running CRE workflow*

**Narrator:**
> "This is the Chainlink CRE workflow in action. Every 24 hours, it automatically verifies rental payments off-chain."

*Show workflow steps:*

**Narrator:**
> "Step 1: Confidential HTTP fetches payment status—sensitive tenant data never hits the blockchain."

> "Step 2: Payment verification with consensus."

> "Step 3: AI analysis—our Groq LLM predicts optimal yield distribution and forecasts vacancy risk."

*Show AI output*

**Narrator:**
> "The AI recommends yield splits based on property performance. High-performing properties get priority distributions."

> "Step 4: Risk compliance check—Proof-of-Reserve verifies the yield pool has sufficient liquidity."

*Show risk dashboard*

**Narrator:**
> "If defaults exceed the threshold, the safeguard activates automatically, protecting investors."

---

## Scene 4: Risk & Privacy Demo (60 seconds)

**[2:45 - 3:45]**

*Screen: Risk metrics dashboard*

**Narrator:**
> "Real-time risk monitoring tracks defaults and reserve health. All sensitive calculations happen off-chain—only aggregated results go on-chain."

*Show privacy features*

**Narrator:**
> "Our privacy layer encrypts all external API calls. Tenant addresses, payment amounts, and personal data are masked in logs."

---

## Scene 5: Yield Claim with World ID (45 seconds)

**[3:45 - 4:30]**

*Screen: Investor portal - Claim Yield*

**Narrator:**
> "Finally, investors claim their yield. World ID verification ensures each claimant is a unique human—preventing sybil attacks."

*Show World ID verification*

**Narrator:**
> "Connect wallet, verify World ID, claim yield. It's that simple."

*Show successful claim*

---

## Scene 6: Conclusion (30 seconds)

**[4:30 - 5:00]**

*Screen: Summary stats*

**Narrator:**
> "TENANCY brings $50 trillion real estate market on-chain. With Chainlink Price Feeds, CRE automation, AI insights, and privacy protection—we're building the next generation of property DeFi."

*Closing: Logo + tagline*

**Narrator:**
> "Deploy on Base Sepolia. Try the CRE workflow. Tokenize your first property today."

---

## Technical Stack Shown

| Feature | Technology |
|---------|------------|
| Smart Contracts | Solidity, Foundry |
| Price Feeds | Chainlink ETH/USD |
| Automation | Chainlink CRE |
| AI | Groq LLM |
| Privacy | Confidential HTTP |
| Identity | World ID |
| Frontend | Next.js, Privy |
| Testing | Tenderly Virtual TestNets |

---

## Recording Tips

1. **Use screen recording** with high quality (1080p)
2. **Record terminal** with dark theme for CRE workflow
3. **Show wallet** connected with testnet
4. **Highlight** Chainlink integrations prominently
5. **Keep pace** - 5 minutes max
6. **Add subtitles** for technical terms
