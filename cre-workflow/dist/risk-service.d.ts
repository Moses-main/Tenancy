interface RiskMetrics {
    totalDefaults: number;
    defaultRatio: number;
    reserveRatio: number;
    safeguardActive: boolean;
    lastRiskCheck: number;
}
interface RiskThresholds {
    minReserveRatio: number;
    defaultThreshold: number;
}
declare const DEFAULT_THRESHOLDS: RiskThresholds;
declare function assessRiskLevel(metrics: RiskMetrics): 'low' | 'medium' | 'high' | 'critical';
declare function getRiskRecommendations(metrics: RiskMetrics): string[];
declare function performRiskCheck(yieldDistributorAddress: string, rpcUrl: string): Promise<RiskMetrics>;
declare function simulateRiskScenario(scenario: 'healthy' | 'low-reserve' | 'high-defaults' | 'safeguard'): Promise<RiskMetrics>;
export { RiskMetrics, RiskThresholds, DEFAULT_THRESHOLDS, assessRiskLevel, getRiskRecommendations, performRiskCheck, simulateRiskScenario, };
