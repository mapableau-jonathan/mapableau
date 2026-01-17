# DevOps & Blockchain Integration for Authentication

This document describes the DevOps and blockchain optimizations implemented for the authentication system.

## Overview

The authentication system now includes:
- **DevOps Automation**: CI/CD pipelines, infrastructure as code, automated deployments
- **Blockchain Integration**: Decentralized identity, immutable audit trails, smart contracts
- **Monitoring & Observability**: Comprehensive metrics, logging, and alerting
- **Security Automation**: Automated security scanning and testing

## DevOps Components

### 1. CI/CD Pipeline (`.github/workflows/auth-ci-cd.yml`)

Automated pipeline that:
- Runs security scans (Snyk, npm audit, ESLint)
- Executes unit and integration tests
- Builds Docker images
- Deploys to staging/production
- Verifies blockchain integration

**Stages:**
1. **Security Scan**: Vulnerability scanning and code analysis
2. **Test**: Unit and integration tests
3. **Build**: Docker image creation
4. **Deploy**: Automated deployment to environments
5. **Blockchain Verify**: Smart contract verification

### 2. Infrastructure as Code (Terraform)

**File**: `terraform/auth-infrastructure.tf`

Infrastructure components:
- **EKS Cluster**: Kubernetes cluster for authentication service
- **Redis**: Caching and rate limiting
- **RDS PostgreSQL**: Token blacklist and audit logs
- **CloudWatch**: Logging and monitoring
- **SNS**: Alert notifications

### 3. Kubernetes Deployment (`k8s/auth-deployment.yaml`)

Production-ready Kubernetes configuration:
- **Deployment**: 3 replicas with rolling updates
- **Service**: LoadBalancer for external access
- **HPA**: Auto-scaling based on CPU/memory
- **Health Checks**: Liveness and readiness probes
- **Security Context**: Non-root, read-only filesystem

### 4. Deployment Scripts

**`scripts/deploy-auth.sh`**: Automated deployment script
- Pre-deployment checks
- Docker build and push
- Kubernetes deployment
- Smoke tests
- Health checks

**`scripts/security-scan.sh`**: Security scanning automation
- npm audit
- Snyk scanning
- ESLint security checks
- JWT security audit
- Blockchain security checks

## Blockchain Integration

### 1. Decentralized Identity (`lib/blockchain/identity-manager.ts`)

**Features:**
- **DID Generation**: Decentralized Identifiers (DID) for users
- **Identity Proof**: Cryptographic proof of identity
- **Event Recording**: Immutable authentication events on blockchain
- **Event Querying**: Query authentication history from blockchain

**Usage:**
```typescript
import { blockchainIdentityManager } from "@/lib/blockchain/identity-manager";

// Create identity
const identity = await blockchainIdentityManager.createIdentity(userId);

// Record event
await blockchainIdentityManager.recordAuthEvent({
  eventType: "TOKEN_ISSUED",
  userId: "user-123",
  did: identity.did,
  tokenId: "token-uuid",
  serviceId: "mapable",
});
```

### 2. Smart Contracts (`lib/blockchain/smart-contracts.ts`)

**Features:**
- **Token Contracts**: Smart contracts for token lifecycle
- **Token Revocation**: On-chain token revocation
- **Status Checking**: Query token status from blockchain
- **Contract Deployment**: Automated contract deployment

**Usage:**
```typescript
import { smartContractManager } from "@/lib/blockchain/smart-contracts";

// Deploy contract
const contract = await smartContractManager.deployTokenContract(
  tokenId,
  userId,
  serviceId,
  expiresAt
);

// Revoke token
await smartContractManager.revokeToken(tokenId);

// Check status
const status = await smartContractManager.checkTokenStatus(tokenId);
```

### 3. Blockchain Audit Trail

All authentication events are recorded on blockchain:
- Token issuance
- Token revocation
- Token refresh
- Identity verification

**Benefits:**
- **Immutability**: Events cannot be tampered with
- **Transparency**: Public audit trail
- **Verification**: Anyone can verify event authenticity
- **Compliance**: Meets regulatory requirements

## Monitoring & Observability

### Metrics Collection (`lib/monitoring/auth-metrics.ts`)

**Metrics Tracked:**
- Token issuance (total, success, failed, latency)
- Token validation (valid, invalid, expired, revoked)
- Token revocation (success, failed)
- Rate limiting (requests, blocked, top IPs)
- Blockchain events (recorded, verified, confirmation time)
- Errors (total, by type)

**Prometheus Export:**
Metrics available at `/api/metrics` in Prometheus format:
```
auth_token_issuance_total 150
auth_token_issuance_success 145
auth_token_issuance_failed 5
auth_token_issuance_latency_seconds 0.125
```

### Monitoring Stack

**Recommended Tools:**
- **Prometheus**: Metrics collection
- **Grafana**: Visualization and dashboards
- **CloudWatch**: AWS-native monitoring
- **Datadog/New Relic**: APM and monitoring

## Deployment Workflow

### 1. Development
```bash
# Make changes
git checkout -b feature/auth-improvement

# Run tests
npm run test:auth

# Run security scans
./scripts/security-scan.sh

# Commit and push
git commit -m "Add feature"
git push origin feature/auth-improvement
```

### 2. CI/CD Pipeline
- Automatic on push to `develop` or `main`
- Security scanning
- Test execution
- Docker image build
- Deployment to staging/production

### 3. Staging Deployment
```bash
# Manual deployment
./scripts/deploy-auth.sh staging v1.2.3

# Or via CI/CD
git push origin develop
```

### 4. Production Deployment
```bash
# Via CI/CD (automatic on merge to main)
git merge develop
git push origin main

# Or manual
./scripts/deploy-auth.sh production v1.2.3
```

## Blockchain Network Configuration

### Environment Variables
```env
# Blockchain Configuration
BLOCKCHAIN_NETWORK=mainnet  # or testnet, local
BLOCKCHAIN_RPC_URL=https://polygon-rpc.com
BLOCKCHAIN_PRIVATE_KEY=your-private-key  # For signing transactions
BLOCKCHAIN_CONTRACT_ADDRESS=0x...  # Token contract address
```

### Supported Networks
- **Mainnet**: Production blockchain (Polygon, Ethereum)
- **Testnet**: Testing environment (Mumbai, Goerli)
- **Local**: Local development (Hardhat, Ganache)

## Security Automation

### Automated Security Checks

1. **npm audit**: Dependency vulnerability scanning
2. **Snyk**: Advanced vulnerability detection
3. **ESLint Security Plugin**: Code security analysis
4. **TypeScript**: Type safety checks
5. **JWT Security Audit**: Token security validation
6. **Blockchain Security**: Smart contract security checks

### Security Scanning in CI/CD

All security scans run automatically:
- On every pull request
- Before deployment
- On schedule (daily)

## Infrastructure Components

### Kubernetes Resources

**Deployment:**
- 3 replicas (minimum)
- Auto-scaling (3-10 replicas)
- Rolling updates
- Health checks

**Resources:**
- CPU: 250m request, 500m limit
- Memory: 512Mi request, 1Gi limit

**Security:**
- Non-root user
- Read-only filesystem
- Dropped capabilities

### Database

**PostgreSQL (RDS):**
- Token blacklist storage
- Audit log storage
- User identity data

**Redis (ElastiCache):**
- Rate limiting
- Token cache
- Session storage

## Monitoring Dashboards

### Key Metrics

1. **Authentication Rate**: Requests per second
2. **Success Rate**: Percentage of successful authentications
3. **Latency**: P50, P95, P99 latencies
4. **Error Rate**: Failed authentication attempts
5. **Blockchain Events**: Events recorded per hour
6. **Rate Limiting**: Blocked requests

### Alerts

- High error rate (>5%)
- High latency (>1s)
- Blockchain sync issues
- Rate limit violations
- Deployment failures

## Best Practices

### Development
1. Run security scans before committing
2. Write tests for all authentication flows
3. Use feature flags for new functionality
4. Monitor metrics during development

### Deployment
1. Deploy to staging first
2. Run smoke tests after deployment
3. Monitor metrics post-deployment
4. Rollback plan ready

### Blockchain
1. Use testnet for development
2. Verify smart contracts before deployment
3. Monitor gas costs
4. Keep private keys secure

### Monitoring
1. Set up alerts for critical metrics
2. Review dashboards regularly
3. Investigate anomalies
4. Document incidents

## Troubleshooting

### Deployment Issues

**Problem**: Deployment fails
```bash
# Check Kubernetes logs
kubectl logs -f deployment/mapable-auth -n production

# Check deployment status
kubectl describe deployment mapable-auth -n production

# Rollback if needed
kubectl rollout undo deployment/mapable-auth -n production
```

### Blockchain Issues

**Problem**: Events not recording
```bash
# Check blockchain connection
curl $BLOCKCHAIN_RPC_URL

# Verify contract address
# Check transaction status
```

### Performance Issues

**Problem**: High latency
```bash
# Check metrics
curl https://api.mapable.com.au/api/metrics

# Check resource usage
kubectl top pods -n production

# Review logs for errors
kubectl logs deployment/mapable-auth -n production | grep ERROR
```

## Future Enhancements

1. **Multi-chain Support**: Support multiple blockchain networks
2. **Zero-Knowledge Proofs**: Privacy-preserving authentication
3. **DAO Governance**: Decentralized governance for authentication rules
4. **Cross-chain Identity**: Identity portability across chains
5. **Automated Incident Response**: AI-powered incident handling
6. **Advanced Analytics**: ML-based anomaly detection

## Support

For issues or questions:
- Review CI/CD logs in GitHub Actions
- Check Kubernetes events: `kubectl get events -n production`
- Review blockchain transactions on block explorer
- Check monitoring dashboards
- Review security scan reports

## Conclusion

The DevOps and blockchain integration provides:
- **Automated Deployments**: Faster, safer deployments
- **Immutable Audit Trail**: Blockchain-based event logging
- **Enhanced Security**: Automated security scanning
- **Better Observability**: Comprehensive metrics and monitoring
- **Scalability**: Auto-scaling infrastructure
- **Reliability**: Health checks and automated recovery

All components are production-ready and can be customized for your specific needs.
