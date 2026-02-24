# TENANCY Protocol Monitoring & Observability

## Overview

This directory contains monitoring configurations for the TENANCY Protocol.

## Components

### Dashboards (Grafana)

The `dashboards/` folder contains pre-configured Grafana dashboards for:
- Protocol Overview (TVL, active properties, yields)
- Smart Contract Metrics
- User Activity
- Chainlink Price Feed Health
- Yield Distribution Analytics

### Alerts (Prometheus/Alertmanager)

The `alerts/` folder contains:
- Smart contract event alerts
- Price feed deviation alerts
- Yield distribution failure alerts
- System health alerts

### Health Checks

The `health/` folder contains:
- Kubernetes liveness/readiness probes
- Docker health check scripts

## Quick Start

### Local Development Monitoring

```bash
# Start local monitoring stack
cd monitoring/docker
docker-compose -f docker-compose.monitoring.yml up -d

# Access Grafana at http://localhost:3000
# Default credentials: admin/admin
```

### Production

1. Deploy Prometheus operator
2. Apply alert rules: `kubectl apply -f alerts/`
3. Import Grafana dashboards: `kubectl apply -f dashboards/`

## Metrics

### Smart Contract Metrics

| Metric | Description | Type |
|--------|-------------|------|
| `tenancy_properties_total` | Total properties registered | Gauge |
| `tenancy_yield_distributed_total` | Total yield distributed | Counter |
| `tenancy_active_investors` | Active investor count | Gauge |
| `tenancy_token_supply` | Total TEN token supply | Gauge |

### Application Metrics

| Metric | Description | Type |
|--------|-------------|------|
| `http_requests_total` | Total HTTP requests | Counter |
| `http_request_duration_seconds` | Request latency | Histogram |
| `transaction_gas_used` | Gas used per transaction | Histogram |

## Alert Rules

### Critical Alerts

- `ContractPaused` - Emergency pause triggered
- `PriceFeedStale` - Chainlink price feed not updated
- `YieldDistributionFailed` - Distribution failed
- `SafeguardActive` - Risk safeguard triggered

### Warning Alerts

- `HighGasPrice` - Gas price above threshold
- `LowLiquidity` - Yield pool low
- `SlippageHigh` - Swap slippage above threshold

## Contact

For monitoring-related issues: #ops-tenancy
