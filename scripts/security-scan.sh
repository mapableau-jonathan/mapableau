#!/bin/bash
# Automated Security Scanning Script
# Runs comprehensive security scans for authentication system

set -e

echo "🔒 Running Security Scans for Authentication System"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

print_status() {
    echo -e "${GREEN}✓${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "Installing dependencies..."
    npm install
fi

# 1. npm audit
echo ""
echo "📦 Running npm audit..."
if npm audit --audit-level=high; then
    print_status "npm audit passed"
else
    print_warning "npm audit found vulnerabilities"
fi

# 2. Snyk scan (if available)
if command -v snyk &> /dev/null; then
    echo ""
    echo "🛡️  Running Snyk scan..."
    if snyk test --severity-threshold=high; then
        print_status "Snyk scan passed"
    else
        print_warning "Snyk scan found issues"
    fi
else
    print_warning "Snyk not installed (optional)"
fi

# 3. ESLint security plugin
echo ""
echo "🔍 Running ESLint security checks..."
if npm run lint:security 2>/dev/null; then
    print_status "ESLint security checks passed"
else
    print_warning "ESLint security checks found issues"
fi

# 4. TypeScript security checks
echo ""
echo "📝 Running TypeScript type checks..."
if npm run check; then
    print_status "TypeScript checks passed"
else
    print_error "TypeScript checks failed"
    exit 1
fi

# 5. Dependency vulnerability check
echo ""
echo "🔐 Checking for known vulnerabilities..."
if npm run check:vulnerabilities 2>/dev/null; then
    print_status "Vulnerability check passed"
else
    print_warning "Some vulnerabilities detected"
fi

# 6. JWT security audit
echo ""
echo "🎫 Running JWT security audit..."
if node scripts/audit-jwt.js 2>/dev/null; then
    print_status "JWT security audit passed"
else
    print_warning "JWT security audit found issues"
fi

# 7. Blockchain security check
echo ""
echo "⛓️  Running blockchain security checks..."
if npm run test:blockchain:security 2>/dev/null; then
    print_status "Blockchain security checks passed"
else
    print_warning "Blockchain security checks found issues"
fi

# Summary
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Security scanning completed"
echo ""
echo "For detailed reports:"
echo "  - npm audit report: npm audit"
echo "  - Snyk report: snyk test --json > snyk-report.json"
echo "  - ESLint report: npm run lint:security -- --format json"
