interface AIAnalysisResult {
  yieldPrediction: number;
  vacancyRisk: 'low' | 'medium' | 'high';
  rentAdjustment: number;
  recommendation: string;
  confidence: number;
}

interface PropertyData {
  propertyId: number;
  currentRent: number;
  occupancyRate: number;
  marketRate: number;
  location: string;
  propertyType: string;
  yieldHistory: number[];
  tenantCount: number;
}

const MOCK_API_KEY = process.env.GROQ_API_KEY || '';
const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';

function buildPrompt(property: PropertyData): string {
  return `You are a real estate AI analyst. Analyze this property and provide insights:

Property ID: ${property.propertyId}
Current Rent: ${property.currentRent} ETH/year
Occupancy Rate: ${(property.occupancyRate * 100).toFixed(0)}%
Market Rate: ${property.marketRate} ETH/year
Location: ${property.location}
Property Type: ${property.propertyType}
Tenant Count: ${property.tenantCount}
Recent Yields: ${property.yieldHistory.join(', ')} ETH

Respond with JSON containing:
- yieldPrediction: predicted annual yield in ETH (number)
- vacancyRisk: "low", "medium", or "high" (string)
- rentAdjustment: suggested rent change percentage (-20 to +20)
- recommendation: 2-3 sentence advice (string)
- confidence: confidence score 0-1 (number)

Format: {"yieldPrediction": 2.5, "vacancyRisk": "low", "rentAdjustment": 5, "recommendation": "...", "confidence": 0.85}`;
}

async function callGroqLLM(property: PropertyData): Promise<AIAnalysisResult> {
  console.log(`[AI] Calling Groq LLM for property ${property.propertyId}...`);
  
  const prompt = buildPrompt(property);
  
  try {
    const response = await fetch(GROQ_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${MOCK_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.5,
        max_tokens: 500,
      }),
    });

    if (!response.ok) {
      throw new Error(`Groq API error: ${response.status}`);
    }

    const data = await response.json() as any;
    const content = data.choices?.[0]?.message?.content || '';
    
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const result = JSON.parse(jsonMatch[0]) as AIAnalysisResult;
      console.log(`[AI] Analysis complete - Confidence: ${(result.confidence * 100).toFixed(0)}%`);
      return result;
    }
    
    throw new Error('No valid JSON in response');
  } catch (error) {
    console.log('[AI] Using mock analysis (API unavailable or error)');
    return getMockAnalysis(property);
  }
}

function getMockAnalysis(property: PropertyData): AIAnalysisResult {
  const yieldPrediction = property.currentRent * 0.08 * (property.occupancyRate / 100);
  const vacancyRisk = property.occupancyRate > 80 ? 'low' : property.occupancyRate > 50 ? 'medium' : 'high';
  const rentDiff = ((property.marketRate - property.currentRent) / property.currentRent) * 100;
  const rentAdjustment = Math.max(-10, Math.min(10, Math.round(rentDiff / 2)));
  
  let recommendation = '';
  if (rentAdjustment > 5) {
    recommendation = `Consider increasing rent by ${rentAdjustment}%. Market rates are ${rentDiff.toFixed(0)}% higher than current. High occupancy suggests strong demand.`;
  } else if (rentAdjustment < -5) {
    recommendation = `Consider reducing rent by ${Math.abs(rentAdjustment)}% to improve occupancy. Market rates have decreased.`;
  } else {
    recommendation = `Rent is appropriately priced. Focus on maintaining current occupancy and optimizing yield distribution.`;
  }

  return {
    yieldPrediction,
    vacancyRisk,
    rentAdjustment,
    recommendation,
    confidence: 0.75 + Math.random() * 0.2,
  };
}

async function analyzePropertyWithAI(property: PropertyData): Promise<AIAnalysisResult> {
  console.log(`[AI] Starting AI analysis for property ${property.propertyId}...`);
  console.log(`[AI] Property: ${property.propertyType} in ${property.location}`);
  console.log(`[AI] Current rent: ${property.currentRent} ETH, Occupancy: ${property.occupancyRate}%`);
  
  const result = await callGroqLLM(property);
  
  console.log(`[AI] Analysis Results:`);
  console.log(`  - Predicted Yield: ${result.yieldPrediction.toFixed(4)} ETH/year`);
  console.log(`  - Vacancy Risk: ${result.vacancyRisk.toUpperCase()}`);
  console.log(`  - Rent Adjustment: ${result.rentAdjustment > 0 ? '+' : ''}${result.rentAdjustment}%`);
  console.log(`  - Recommendation: ${result.recommendation.substring(0, 80)}...`);
  console.log(`  - Confidence: ${(result.confidence * 100).toFixed(0)}%`);
  
  return result;
}

async function batchAnalyzeProperties(properties: PropertyData[]): Promise<Map<number, AIAnalysisResult>> {
  console.log(`[AI] Starting batch analysis for ${properties.length} properties...`);
  
  const results = new Map<number, AIAnalysisResult>();
  
  for (const property of properties) {
    const result = await analyzePropertyWithAI(property);
    results.set(property.propertyId, result);
    
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  console.log(`[AI] Batch analysis complete: ${results.size} properties analyzed`);
  return results;
}

function determineDistributionStrategy(analyses: Map<number, AIAnalysisResult>): {
  highPriority: number[];
  mediumPriority: number[];
  lowPriority: number[];
} {
  const highPriority: number[] = [];
  const mediumPriority: number[] = [];
  const lowPriority: number[] = [];
  
  analyses.forEach((analysis, propertyId) => {
    if (analysis.vacancyRisk === 'high' || analysis.confidence < 0.6) {
      lowPriority.push(propertyId);
    } else if (analysis.vacancyRisk === 'medium' || analysis.yieldPrediction < 2) {
      mediumPriority.push(propertyId);
    } else {
      highPriority.push(propertyId);
    }
  });
  
  return { highPriority, mediumPriority, lowPriority };
}

export { 
  AIAnalysisResult, 
  PropertyData, 
  analyzePropertyWithAI, 
  batchAnalyzeProperties,
  callGroqLLM,
  determineDistributionStrategy,
  getMockAnalysis 
};
