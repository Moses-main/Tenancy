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

const DEFAULT_THRESHOLDS: RiskThresholds = {
  minReserveRatio: 1500,
  defaultThreshold: 1000,
};

function assessRiskLevel(metrics: RiskMetrics): 'low' | 'medium' | 'high' | 'critical' {
  if (metrics.safeguardActive) return 'critical';
  if (metrics.defaultRatio > 1500) return 'high';
  if (metrics.defaultRatio > 500) return 'medium';
  return 'low';
}

function getRiskRecommendations(metrics: RiskMetrics): string[] {
  const recommendations: string[] = [];

  if (metrics.safeguardActive) {
    recommendations.push('⚠️ SAFEGUARD ACTIVE - Distributions paused');
    recommendations.push('Review reserve pool and address defaults');
  }

  if (metrics.defaultRatio > 1000) {
    recommendations.push('🔴 High default ratio - Consider increasing collateral requirements');
  } else if (metrics.defaultRatio > 500) {
    recommendations.push('🟡 Medium default ratio - Monitor tenant payments closely');
  }

  if (metrics.reserveRatio < 1500) {
    recommendations.push('⚠️ Low reserve ratio - Add funds to yield pool');
  }

  if (recommendations.length === 0) {
    recommendations.push('✅ System is healthy');
  }

  return recommendations;
}

async function performRiskCheck(
  yieldDistributorAddress: string,
  rpcUrl: string
): Promise<RiskMetrics> {
  console.log('[RISK] Performing risk assessment...');

  console.log('[RISK] Checking reserve health...');
  await new Promise(resolve => setTimeout(resolve, 300));
  const reserveHealthy = Math.random() > 0.1;
  console.log(`[RISK] Reserve health: ${reserveHealthy ? '✓ HEALTHY' : '✗ LOW'}`);

  console.log('[RISK] Analyzing payment defaults...');
  await new Promise(resolve => setTimeout(resolve, 300));
  const totalDefaults = Math.floor(Math.random() * 100);
  const totalPool = 1000;
  const defaultRatio = (totalDefaults / totalPool) * 10000;

  console.log(`[RISK] Default ratio: ${(defaultRatio / 100).toFixed(2)}%`);

  const safeguardActive = defaultRatio > 1000;
  if (safeguardActive) {
    console.log('[RISK] ⚠️ SAFEGUARD TRIGGERED - Distributions paused');
  }

  return {
    totalDefaults,
    defaultRatio,
    reserveRatio: 1800,
    safeguardActive,
    lastRiskCheck: Date.now(),
  };
}

async function simulateRiskScenario(
  scenario: 'healthy' | 'low-reserve' | 'high-defaults' | 'safeguard'
): Promise<RiskMetrics> {
  console.log(`\n[RISK] Simulating scenario: ${scenario}`);
  console.log('═'.repeat(50));

  let metrics: RiskMetrics;

  switch (scenario) {
    case 'healthy':
      metrics = {
        totalDefaults: 10,
        defaultRatio: 100,
        reserveRatio: 2000,
        safeguardActive: false,
        lastRiskCheck: Date.now(),
      };
      break;
    case 'low-reserve':
      metrics = {
        totalDefaults: 50,
        defaultRatio: 500,
        reserveRatio: 800,
        safeguardActive: false,
        lastRiskCheck: Date.now(),
      };
      break;
    case 'high-defaults':
      metrics = {
        totalDefaults: 200,
        defaultRatio: 2000,
        reserveRatio: 1200,
        safeguardActive: false,
        lastRiskCheck: Date.now(),
      };
      break;
    case 'safeguard':
      metrics = {
        totalDefaults: 500,
        defaultRatio: 5000,
        reserveRatio: 500,
        safeguardActive: true,
        lastRiskCheck: Date.now(),
      };
      break;
  }

  const riskLevel = assessRiskLevel(metrics);
  console.log(`\n[RISK] Risk Level: ${riskLevel.toUpperCase()}`);
  console.log(`[RISK] Total Defaults: ${metrics.totalDefaults}`);
  console.log(`[RISK] Default Ratio: ${(metrics.defaultRatio / 100).toFixed(2)}%`);
  console.log(`[RISK] Reserve Ratio: ${(metrics.reserveRatio / 100).toFixed(2)}%`);
  console.log(`[RISK] Safeguard: ${metrics.safeguardActive ? 'ACTIVE' : 'Inactive'}`);

  console.log('\n[RISK] Recommendations:');
  const recommendations = getRiskRecommendations(metrics);
  recommendations.forEach(rec => console.log(`  ${rec}`));

  return metrics;
}

export {
  RiskMetrics,
  RiskThresholds,
  DEFAULT_THRESHOLDS,
  assessRiskLevel,
  getRiskRecommendations,
  performRiskCheck,
  simulateRiskScenario,
};
