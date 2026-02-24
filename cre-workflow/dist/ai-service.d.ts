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
declare function callGroqLLM(property: PropertyData): Promise<AIAnalysisResult>;
declare function getMockAnalysis(property: PropertyData): AIAnalysisResult;
declare function analyzePropertyWithAI(property: PropertyData): Promise<AIAnalysisResult>;
declare function batchAnalyzeProperties(properties: PropertyData[]): Promise<Map<number, AIAnalysisResult>>;
declare function determineDistributionStrategy(analyses: Map<number, AIAnalysisResult>): {
    highPriority: number[];
    mediumPriority: number[];
    lowPriority: number[];
};
export { AIAnalysisResult, PropertyData, analyzePropertyWithAI, batchAnalyzeProperties, callGroqLLM, determineDistributionStrategy, getMockAnalysis };
