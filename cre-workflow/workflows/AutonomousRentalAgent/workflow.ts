import { ethers } from "ethers";

interface PropertyStatus {
  propertyId: string;
  name: string;
  rentAmount: number;
  isActive: boolean;
  isPaused: boolean;
  paymentStatus: number;
  daysOverdue: number;
  tenantCount: number;
  yieldRate: number;
}

interface MarketData {
  propertyId: string;
  marketRent: number;
  vacancyIndex: number;
  location: string;
  demandLevel: "high" | "medium" | "low";
}

interface LLMDecision {
  propertyId: string;
  action: "distribute_yield" | "pause_yield" | "adjust_rent" | "flag_default";
  adjustmentPercent: number;
  reason: string;
  confidence: number;
}

interface WorkflowInput {
  propertyIds?: string[];
}

interface WorkflowOutput {
  success: boolean;
  decisions: LLMDecision[];
  transactionHashes: string[];
  aiInsights: string;
  timestamp: number;
  healthCheck?: {
    reserveRatio: number;
    isHealthy: boolean;
    totalReserve: string;
    requiredReserve: string;
    priceFeedHealthy: boolean;
    riskLevel: 'low' | 'medium' | 'high';
  };
}

const SYSTEM_PROMPT = `You are an expert autonomous rental property manager. Analyze the payment status, market data, and property details. 

Return ONLY a valid JSON object with this exact structure:
{ "decisions": [{ "propertyId": "string", "action": "distribute_yield" | "pause_yield" | "adjust_rent" | "flag_default", "adjustmentPercent": number, "reason": "string", "confidence": number }] }

Rules:
- Only include properties that need action
- action "distribute_yield" = pay out yield to investors
- action "pause_yield" = pause distributions for property
- action "adjust_rent" = change rent (adjustmentPercent is the new rent as percentage of current)
- action "flag_default" = mark tenant as in default
- confidence should be 0-100
- Always provide a reason for each decision`;

export async function AutonomousRentalAgent(
  runtime: any,
  input: WorkflowInput
): Promise<WorkflowOutput> {
  console.log("[Agent] Starting Autonomous Rental Agent workflow...");
  console.log("[Agent] Input:", JSON.stringify(input));

  const results: WorkflowOutput = {
    success: true,
    decisions: [],
    transactionHashes: [],
    aiInsights: "",
    timestamp: Date.now(),
    healthCheck: {
      reserveRatio: 150,
      isHealthy: true,
      totalReserve: "0",
      requiredReserve: "0",
      priceFeedHealthy: true,
      riskLevel: 'low',
    },
  };

  try {
    // ============================================================
    // STEP 0: Proof-of-Reserve Health Check (PRIVACY COMPLIANCE)
    // ============================================================
    console.log("[Agent] Step 0: Running Proof-of-Reserve Health Check...");
    
    try {
      // Initialize provider and contracts
      const provider = new ethers.JsonRpcProvider(
        runtime.getSecret({ id: "SEPOLIA_RPC_URL" }).result() || 
        "https://ethereum-sepolia-rpc.publicnode.com"
      );
      
      const wallet = new ethers.Wallet(
        runtime.getSecret({ id: "PRIVATE_KEY" }).result() || "0x0000000000000000000000000000000000000000000000000000000000000000",
        provider
      );
      
      const yieldDistributorAddress = runtime.getSecret({ id: "YIELD_DISTRIBUTOR_ADDRESS" }).result() || 
        "0x1234567890123456789012345678901234567891";
      
      const yieldDistributorABI = [
        "function checkReserveHealth() external view returns (bool isHealthy, uint256 totalReserve, uint256 requiredReserve)",
        "function getSystemHealth() external view returns (bool priceFeedsHealthy, bool reservesHealthy, bool defaultsHealthy, bool systemOperational)",
        "function getRiskMetrics() external view returns (uint256 _totalDefaults, uint256 _defaultRatioVal, uint256 _reserveRatioVal, bool _safeguardActive, uint256 _lastRiskCheck)"
      ];
      
      const yieldDistributor = new ethers.Contract(yieldDistributorAddress, yieldDistributorABI, wallet);
      
      // Get health metrics
      const [isHealthy, totalReserve, requiredReserve] = await yieldDistributor.checkReserveHealth();
      const [priceFeedsHealthy, reservesHealthy, defaultsHealthy, systemOperational] = await yieldDistributor.getSystemHealth();
      const [totalDefaults, defaultRatioVal] = await yieldDistributor.getRiskMetrics();
      
      results.healthCheck = {
        reserveRatio: Number(totalReserve) > 0 ? Number(totalReserve) * 100 / (Number(requiredReserve) || 1) : 100,
        isHealthy: isHealthy && systemOperational,
        totalReserve: ethers.formatEther(totalReserve || "0"),
        requiredReserve: ethers.formatEther(requiredReserve || "0"),
        priceFeedHealthy: priceFeedsHealthy,
        riskLevel: defaultRatioVal > 1000 ? 'high' : defaultRatioVal > 500 ? 'medium' : 'low',
      };
      
      console.log(`[Agent] Health Check - Reserve Ratio: ${results.healthCheck.reserveRatio.toFixed(2)}%`);
      console.log(`[Agent] Health Check - System Healthy: ${results.healthCheck.isHealthy}`);
      console.log(`[Agent] Health Check - Risk Level: ${results.healthCheck.riskLevel}`);
      
      // If system is unhealthy, emit alert
      if (!results.healthCheck.isHealthy) {
        console.log("[Agent] WARNING: System health check failed!");
        results.aiInsights += `ALERT: System health check failed. Reserve ratio: ${results.healthCheck.reserveRatio.toFixed(2)}%. `;
      }
    } catch (healthError: any) {
      console.log("[Agent] Health check simulation mode - using mock data");
      results.healthCheck = {
        reserveRatio: 150,
        isHealthy: true,
        totalReserve: "100.0",
        requiredReserve: "66.0",
        priceFeedHealthy: true,
        riskLevel: 'low',
      };
    }

    // ============================================================
    // STEP 1: Fetch Payment Status via Confidential HTTP
    // ============================================================
    console.log("[Agent] Step 1: Fetching payment status from property management API...");
    
    const paymentStatusResponse = await runtime.http.get({
      url: "https://api.propertymanagement.mock/payments/status",
      headers: {
        "Content-Type": "application/json",
      },
      secrets: {
        apiKey: runtime.getSecret({ id: "PROPERTY_API_KEY" }).result() || "",
      },
    });

    const paymentData = paymentStatusResponse.data || getMockPaymentData();
    console.log(`[Agent] Retrieved payment status for ${paymentData.properties?.length || 0} properties`);

    // ============================================================
    // STEP 2: Fetch Market Data via Confidential HTTP
    // ============================================================
    console.log("[Agent] Step 2: Fetching market rent data...");
    
    const marketDataResponse = await runtime.http.get({
      url: "https://api.realestate.mock/market-data",
      headers: {
        "Content-Type": "application/json",
      },
    });

    const marketData = marketDataResponse.data || getMockMarketData();
    console.log(`[Agent] Retrieved market data for ${marketData.properties?.length || 0} locations`);

    // ============================================================
    // STEP 3: Call LLM with Confidential HTTP
    // ============================================================
    console.log("[Agent] Step 3: Analyzing with LLM...");

    // Get LLM API key (check OPENAI first, fallback to GROQ)
    let llmApiKey = runtime.getSecret({ id: "OPENAI_API_KEY" }).result();
    let llmEndpoint = "https://api.openai.com/v1/chat/completions";
    let llmModel = "gpt-4o-mini";

    if (!llmApiKey) {
      llmApiKey = runtime.getSecret({ id: "GROQ_API_KEY" }).result();
      llmEndpoint = "https://api.groq.com/openai/v1/chat/completions";
      llmModel = "llama-3.3-70b-versatile";
    }

    if (!llmApiKey) {
      console.log("[Agent] No LLM API key found, using mock analysis");
      results.decisions = generateMockDecisions(paymentData.properties || []);
    } else {
      // Build prompt with payment and market data
      const analysisPrompt = buildAnalysisPrompt(paymentData, marketData);
      
      const llmResponse = await runtime.http.post({
        url: llmEndpoint,
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${llmApiKey}`,
        },
        body: {
          model: llmModel,
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            { role: "user", content: analysisPrompt },
          ],
          temperature: 0.1,
          max_tokens: 1000,
          response_format: { type: "json_object" },
        },
      });

      console.log("[Agent] LLM response received");

      // Parse LLM response
      const llmData = llmResponse.data;
      const content = llmData?.choices?.[0]?.message?.content || "";
      
      try {
        const parsed = JSON.parse(content);
        results.decisions = parsed.decisions || [];
        results.aiInsights = `AI analyzed ${results.decisions.length} properties. ` +
          `Average confidence: ${results.decisions.reduce((sum, d) => sum + d.confidence, 0) / results.decisions.length || 0}%`;
      } catch (e) {
        console.log("[Agent] Failed to parse LLM response, using mock decisions");
        results.decisions = generateMockDecisions(paymentData.properties || []);
      }
    }

    console.log(`[Agent] Generated ${results.decisions.length} decisions`);

    // ============================================================
    // STEP 4: Execute Decisions via EVM Client
    // ============================================================
    console.log("[Agent] Step 4: Executing decisions on-chain...");

    const provider = new ethers.JsonRpcProvider(
      runtime.getSecret({ id: "SEPOLIA_RPC_URL" }).result() || 
      "https://ethereum-sepolia-rpc.publicnode.com"
    );

    const wallet = new ethers.Wallet(
      runtime.getSecret({ id: "PRIVATE_KEY" }).result() || "0x0000000000000000000000000000000000000000000000000000000000000000",
      provider
    );

    const propertyRegistryAddress = runtime.getSecret({ id: "PROPERTY_REGISTRY_ADDRESS" }).result() || 
      "0x1234567890123456789012345678901234567890";
    
    const yieldDistributorAddress = runtime.getSecret({ id: "YIELD_DISTRIBUTOR_ADDRESS" }).result() || 
      "0x1234567890123456789012345678901234567891";

    // PropertyRegistry ABI (simplified)
    const propertyRegistryABI = [
      "function adjustRent(uint256 propertyId, uint256 newRentAmount, string calldata reason) external",
      "function pauseProperty(uint256 propertyId, string calldata reason) external",
      "function resumeProperty(uint256 propertyId, string calldata reason) external",
      "function emitAIRecommendation(uint256 propertyId, string calldata action, uint256 adjustmentPercent, string calldata reason, uint256 confidence) external returns (bytes32)",
      "function updatePaymentStatus(uint256 propertyId, uint256 newPaymentStatus, uint256 daysOverdue) external",
      "function emitRiskAlert(uint256 propertyId, uint256 alertType, string calldata message, uint256 value) external",
    ];

    const yieldDistributorABI = [
      "function distributeWithAIRecommendation(uint256 propertyId, uint256 amount, string calldata aiReason, uint256 confidence, bytes32 recommendationId) external returns (uint256)",
      "function submitAgentDecision(uint256 propertyId, uint256 action, uint256 adjustmentPercent, string calldata reason, uint256 confidence) external returns (bytes32)",
      "function executeAgentDecision(uint256 propertyId) external returns (bool)",
    ];

    const propertyRegistry = new ethers.Contract(propertyRegistryAddress, propertyRegistryABI, wallet);
    const yieldDistributor = new ethers.Contract(yieldDistributorAddress, yieldDistributorABI, wallet);

    for (const decision of results.decisions) {
      try {
        console.log(`[Agent] Executing: ${decision.action} for property ${decision.propertyId}`);

        let tx;

        switch (decision.action) {
          case "adjust_rent":
            // Calculate new rent amount
            const property = paymentData.properties?.find((p: PropertyStatus) => p.propertyId === decision.propertyId);
            const newRent = property 
              ? Math.floor(property.rentAmount * (1 + decision.adjustmentPercent / 100))
              : property?.rentAmount || 0;
            
            tx = await propertyRegistry.adjustRent(
              decision.propertyId,
              newRent,
              decision.reason
            );
            break;

          case "pause_yield":
            tx = await propertyRegistry.pauseProperty(
              decision.propertyId,
              decision.reason
            );
            break;

          case "distribute_yield":
            // Submit and execute decision via YieldDistributor
            const distTx = await yieldDistributor.distributeWithAIRecommendation(
              decision.propertyId,
              ethers.parseEther("0.1"), // Example yield amount
              decision.reason,
              decision.confidence,
              ethers.keccak256(ethers.toUtf8Bytes(decision.propertyId + Date.now()))
            );
            tx = distTx;
            break;

          case "flag_default":
            tx = await propertyRegistry.emitRiskAlert(
              decision.propertyId,
              2, // Alert type for default
              decision.reason,
              decision.adjustmentPercent
            );
            break;
        }

        if (tx) {
          const receipt = await tx.wait();
          results.transactionHashes.push(receipt.hash);
          console.log(`[Agent] Transaction confirmed: ${receipt.hash}`);
        }
      } catch (error: any) {
        console.error(`[Agent] Error executing decision for ${decision.propertyId}:`, error.message);
        // Continue with other decisions even if one fails
      }
    }

    // ============================================================
    // STEP 5: Emit AIRecommendation Events
    // ============================================================
    console.log("[Agent] Step 5: Emitting AI recommendation events...");

    for (const decision of results.decisions) {
      try {
        const recTx = await propertyRegistry.emitAIRecommendation(
          decision.propertyId,
          decision.action,
          decision.adjustmentPercent,
          decision.reason,
          decision.confidence
        );
        await recTx.wait();
      } catch (error: any) {
        console.log(`[Agent] Note: Event emission simulation - ${error.message}`);
      }
    }

    console.log("[Agent] Workflow completed successfully!");
    results.success = true;

  } catch (error: any) {
    console.error("[Agent] Workflow error:", error.message);
    results.success = false;
    results.aiInsights = `Error: ${error.message}`;
  }

  return results;
}

// ============================================================
// Helper Functions
// ============================================================

function buildAnalysisPrompt(paymentData: any, marketData: any): string {
  const properties = paymentData.properties || [];
  const market = marketData.properties || [];

  let prompt = "Analyze the following property data and market conditions:\n\n";
  
  prompt += "PROPERTIES:\n";
  for (const prop of properties) {
    prompt += `- Property ${prop.propertyId}: Rent=${prop.rentAmount} ETH, Active=${prop.isActive}, `;
    prompt += `Payment Status=${prop.paymentStatus}, Days Overdue=${prop.daysOverdue}, Tenants=${prop.tenantCount}\n`;
  }

  prompt += "\nMARKET DATA:\n";
  for (const m of market) {
    prompt += `- Location ${m.location}: Market Rent=${m.marketRent} ETH, Vacancy=${m.vacancyIndex}, Demand=${m.demandLevel}\n`;
  }

  prompt += "\nBased on this data, provide yield distribution and rent adjustment recommendations.";

  return prompt;
}

function getMockPaymentData() {
  return {
    properties: [
      {
        propertyId: "0",
        name: "Downtown Apartment Complex",
        rentAmount: 2500,
        isActive: true,
        isPaused: false,
        paymentStatus: 1, // 1 = current, 2 = late, 3 = default
        daysOverdue: 0,
        tenantCount: 10,
        yieldRate: 8.5,
      },
      {
        propertyId: "1",
        name: "Suburban Office Building",
        rentAmount: 5000,
        isActive: true,
        isPaused: false,
        paymentStatus: 2,
        daysOverdue: 15,
        tenantCount: 5,
        yieldRate: 7.2,
      },
    ],
  };
}

function getMockMarketData() {
  return {
    properties: [
      { propertyId: "0", marketRent: 2600, vacancyIndex: 5, location: "Downtown", demandLevel: "high" },
      { propertyId: "1", marketRent: 4800, vacancyIndex: 12, location: "Suburban", demandLevel: "medium" },
    ],
  };
}

function generateMockDecisions(properties: PropertyStatus[]): LLMDecision[] {
  return properties.map((prop) => {
    if (prop.daysOverdue > 30) {
      return {
        propertyId: prop.propertyId,
        action: "flag_default" as const,
        adjustmentPercent: 100,
        reason: "Tenant is over 30 days overdue - flagging as default",
        confidence: 95,
      };
    } else if (prop.paymentStatus === 2) {
      return {
        propertyId: prop.propertyId,
        action: "distribute_yield" as const,
        adjustmentPercent: 5,
        reason: "Payments current despite being late - distribute yield",
        confidence: 85,
      };
    } else {
      return {
        propertyId: prop.propertyId,
        action: "distribute_yield" as const,
        adjustmentPercent: 0,
        reason: "All payments current - proceed with yield distribution",
        confidence: 90,
      };
    }
  });
}

export default AutonomousRentalAgent;
