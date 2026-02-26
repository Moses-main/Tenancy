import { AutonomousRentalAgent } from "./workflow";

// Mock runtime for simulation
const mockRuntime = {
  http: {
    get: async (options: any) => {
      console.log(`[Simulate] HTTP GET: ${options.url}`);
      return { data: null };
    },
    post: async (options: any) => {
      console.log(`[Simulate] HTTP POST: ${options.url}`);
      // Return mock LLM response
      return {
        data: {
          choices: [
            {
              message: {
                content: JSON.stringify({
                  decisions: [
                    {
                      propertyId: "0",
                      action: "distribute_yield",
                      adjustmentPercent: 0,
                      reason: "All payments current - proceed with yield distribution",
                      confidence: 90,
                    },
                    {
                      propertyId: "1",
                      action: "flag_default",
                      adjustmentPercent: 100,
                      reason: "Tenant is over 30 days overdue - flagging as default",
                      confidence: 95,
                    },
                  ],
                }),
              },
            },
          ],
        },
      };
    },
  },
  getSecret: (options: any) => {
    console.log(`[Simulate] Get secret: ${options.id}`);
    return {
      result: () => {
        if (options.id === "OPENAI_API_KEY") return undefined;
        if (options.id === "GROQ_API_KEY") return "mock-groq-key";
        return "mock-value";
      },
    };
  },
};

async function simulate() {
  console.log("=".repeat(60));
  console.log("AUTONOMOUS RENTAL AGENT - SIMULATION");
  console.log("=".repeat(60));
  console.log();

  const input = {
    propertyIds: ["0", "1"],
  };

  console.log("Input:", JSON.stringify(input, null, 2));
  console.log();

  try {
    const result = await AutonomousRentalAgent(mockRuntime as any, input);

    console.log();
    console.log("=".repeat(60));
    console.log("RESULTS");
    console.log("=".repeat(60));
    console.log("Success:", result.success);
    console.log("Decisions:", JSON.stringify(result.decisions, null, 2));
    console.log("Transaction Hashes:", result.transactionHashes);
    console.log("AI Insights:", result.aiInsights);
    console.log("Timestamp:", new Date(result.timestamp).toISOString());
    console.log();

    if (result.success) {
      console.log("✅ Simulation completed successfully!");
    } else {
      console.log("❌ Simulation failed!");
    }
  } catch (error: any) {
    console.error("Simulation error:", error.message);
  }
}

// Run if called directly
simulate().catch(console.error);
