#!/bin/bash
# Authentication Service Deployment Script
# DevOps automation for deploying authentication system

set -e

ENVIRONMENT=${1:-staging}
VERSION=${2:-latest}

echo "🚀 Deploying Authentication Service"
echo "Environment: $ENVIRONMENT"
echo "Version: $VERSION"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}✓${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

# Pre-deployment checks
echo ""
echo "📋 Pre-deployment checks..."

# Check if kubectl is available
if ! command -v kubectl &> /dev/null; then
    print_error "kubectl not found. Please install kubectl."
    exit 1
fi
print_status "kubectl found"

# Check if docker is available
if ! command -v docker &> /dev/null; then
    print_error "docker not found. Please install docker."
    exit 1
fi
print_status "docker found"

# Check if terraform is available (optional)
if command -v terraform &> /dev/null; then
    print_status "terraform found"
else
    print_warning "terraform not found (optional)"
fi

# Check Kubernetes connection
if ! kubectl cluster-info &> /dev/null; then
    print_error "Cannot connect to Kubernetes cluster"
    exit 1
fi
print_status "Kubernetes cluster connected"

# Run tests
echo ""
echo "🧪 Running tests..."
if npm run test:auth; then
    print_status "Tests passed"
else
    print_error "Tests failed. Aborting deployment."
    exit 1
fi

# Build Docker image
echo ""
echo "🏗️  Building Docker image..."
docker build -t ghcr.io/mapable/mapable:$VERSION -t ghcr.io/mapable/mapable:latest \
    --build-arg NODE_ENV=production \
    --build-arg VERSION=$VERSION \
    .

if [ $? -eq 0 ]; then
    print_status "Docker image built successfully"
else
    print_error "Docker build failed"
    exit 1
fi

# Push to registry
echo ""
echo "📤 Pushing image to registry..."
docker push ghcr.io/mapable/mapable:$VERSION
docker push ghcr.io/mapable/mapable:latest

if [ $? -eq 0 ]; then
    print_status "Image pushed to registry"
else
    print_error "Failed to push image"
    exit 1
fi

# Apply Kubernetes manifests
echo ""
echo "📦 Applying Kubernetes manifests..."
kubectl apply -f k8s/auth-deployment.yaml -n $ENVIRONMENT

if [ $? -eq 0 ]; then
    print_status "Kubernetes manifests applied"
else
    print_error "Failed to apply Kubernetes manifests"
    exit 1
fi

# Wait for deployment
echo ""
echo "⏳ Waiting for deployment to be ready..."
kubectl rollout status deployment/mapable-auth -n $ENVIRONMENT --timeout=5m

if [ $? -eq 0 ]; then
    print_status "Deployment ready"
else
    print_error "Deployment failed or timeout"
    exit 1
fi

# Run smoke tests
echo ""
echo "💨 Running smoke tests..."
if npm run test:smoke:$ENVIRONMENT; then
    print_status "Smoke tests passed"
else
    print_warning "Smoke tests failed, but deployment completed"
fi

# Health check
echo ""
echo "🏥 Performing health check..."
HEALTH_URL="https://$ENVIRONMENT.mapable.com.au/api/health"
if curl -f $HEALTH_URL > /dev/null 2>&1; then
    print_status "Health check passed"
else
    print_warning "Health check failed, but deployment completed"
fi

# Summary
echo ""
echo "✅ Deployment Summary"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Environment: $ENVIRONMENT"
echo "Version: $VERSION"
echo "Status: Deployed successfully"
echo ""
echo "Next steps:"
echo "  - Monitor logs: kubectl logs -f deployment/mapable-auth -n $ENVIRONMENT"
echo "  - Check metrics: https://$ENVIRONMENT.mapable.com.au/api/metrics"
echo "  - View dashboard: https://grafana.$ENVIRONMENT.mapable.com.au"
