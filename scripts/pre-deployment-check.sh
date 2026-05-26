#!/bin/bash

##############################################################################
# Pre-Deployment Check Script
# Automates verification of critical items before production deployment
##############################################################################

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Counters
PASSED=0
FAILED=0
WARNINGS=0

echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║      CRM Platform - Pre-Deployment Check Script          ║${NC}"
echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo ""

# Function to print test result
pass() {
    echo -e "${GREEN}✅ PASS${NC}: $1"
    ((PASSED++))
}

fail() {
    echo -e "${RED}❌ FAIL${NC}: $1"
    ((FAILED++))
}

warn() {
    echo -e "${YELLOW}⚠️  WARN${NC}: $1"
    ((WARNINGS++))
}

info() {
    echo -e "${BLUE}ℹ️  INFO${NC}: $1"
}

##############################################################################
# 1. Environment Checks
##############################################################################

echo -e "\n${BLUE}═══ 1. Environment Configuration ═══${NC}\n"

# Check Node.js version
if command -v node &> /dev/null; then
    NODE_VERSION=$(node -v)
    if [[ "$NODE_VERSION" =~ ^v(18|20|22|24) ]]; then
        pass "Node.js version: $NODE_VERSION"
    else
        warn "Node.js version $NODE_VERSION (recommended: v18+)"
    fi
else
    fail "Node.js not installed"
fi

# Check npm version
if command -v npm &> /dev/null; then
    NPM_VERSION=$(npm -v)
    pass "npm version: $NPM_VERSION"
else
    fail "npm not installed"
fi

# Check .env files
if [ -f .env ]; then
    pass ".env file exists"
else
    fail ".env file missing"
fi

if [ -f .env.production ]; then
    pass ".env.production file exists"
else
    warn ".env.production file missing (may be needed for production)"
fi

# Check critical environment variables
if [ -f .env ]; then
    source .env

    [ -n "$DATABASE_URL" ] && pass "DATABASE_URL configured" || fail "DATABASE_URL missing"
    [ -n "$JWT_SECRET" ] && pass "JWT_SECRET configured" || fail "JWT_SECRET missing"
    [ -n "$FRONTEND_URL" ] && pass "FRONTEND_URL configured" || fail "FRONTEND_URL missing"
    [ -n "$AWS_REGION" ] && pass "AWS_REGION configured" || warn "AWS_REGION missing"
    [ -n "$AWS_ACCESS_KEY_ID" ] && pass "AWS_ACCESS_KEY_ID configured" || warn "AWS credentials missing"
fi

##############################################################################
# 2. Dependencies Check
##############################################################################

echo -e "\n${BLUE}═══ 2. Dependencies ═══${NC}\n"

# Check if node_modules exists
if [ -d "node_modules" ]; then
    pass "node_modules directory exists"
else
    fail "node_modules missing - run 'npm install'"
fi

# Check for outdated critical packages
info "Checking for critical updates..."
npm outdated lodash multer express 2>/dev/null || pass "Dependencies up to date"

##############################################################################
# 3. Build Check
##############################################################################

echo -e "\n${BLUE}═══ 3. Build Verification ═══${NC}\n"

# Try to build the project
info "Running build..."
if npm run build > /tmp/build.log 2>&1; then
    pass "TypeScript compilation successful"
else
    fail "Build failed - check /tmp/build.log"
    cat /tmp/build.log
fi

# Check if dist directory was created
if [ -d "dist" ]; then
    pass "dist/ directory created"

    # Check for main entry point
    if [ -f "dist/server.js" ]; then
        pass "dist/server.js exists"
    else
        fail "dist/server.js missing"
    fi
else
    fail "dist/ directory not created"
fi

##############################################################################
# 4. Security Scans
##############################################################################

echo -e "\n${BLUE}═══ 4. Security Scans ═══${NC}\n"

# npm audit
info "Running npm audit (production only)..."
if npm audit --production --audit-level=high > /tmp/audit.log 2>&1; then
    pass "npm audit: No high/critical vulnerabilities in production"
else
    VULN_COUNT=$(grep -c "vulnerabilities" /tmp/audit.log || echo "0")
    warn "npm audit found issues - check /tmp/audit.log"
fi

# Check for Semgrep
if command -v semgrep &> /dev/null; then
    info "Running Semgrep scan..."
    if semgrep --config=.semgrep.yml src/ --quiet --error > /tmp/semgrep.log 2>&1; then
        pass "Semgrep: No blocking security issues"
    else
        warn "Semgrep found issues - check /tmp/semgrep.log"
    fi
else
    warn "Semgrep not installed"
fi

# Check for hardcoded secrets
info "Checking for hardcoded secrets..."
if grep -r "sk_live_" src/ 2>/dev/null; then
    fail "Found Stripe live secret keys in code!"
elif grep -r "password.*=.*['\"][^'\"]\\{8,\\}['\"]" src/ 2>/dev/null | grep -v "passwordField" | grep -v "passwordInput"; then
    warn "Found potential hardcoded passwords"
else
    pass "No obvious hardcoded secrets found"
fi

##############################################################################
# 5. Database Checks
##############################################################################

echo -e "\n${BLUE}═══ 5. Database ═══${NC}\n"

# Check Prisma schema
if [ -f "prisma/schema.prisma" ]; then
    pass "Prisma schema exists"

    # Validate schema
    if npx prisma validate > /dev/null 2>&1; then
        pass "Prisma schema is valid"
    else
        fail "Prisma schema validation failed"
    fi
else
    fail "Prisma schema missing"
fi

# Check if Prisma Client is generated
if [ -d "node_modules/.prisma/client" ]; then
    pass "Prisma Client generated"
else
    warn "Prisma Client not generated - run 'npx prisma generate'"
fi

##############################################################################
# 6. Security Guards Check
##############################################################################

echo -e "\n${BLUE}═══ 6. Security Guards ═══${NC}\n"

# Check if security guard files exist
if [ -f "src/middleware/securityGuards.ts" ]; then
    pass "securityGuards.ts exists"
else
    fail "securityGuards.ts missing"
fi

if [ -f "src/middleware/csrfProtection.ts" ]; then
    pass "csrfProtection.ts exists"
else
    fail "csrfProtection.ts missing"
fi

if [ -f "src/middleware/securityHeaders.ts" ]; then
    pass "securityHeaders.ts exists"
else
    fail "securityHeaders.ts missing"
fi

# Check if guards are applied in app.ts
if grep -q "applyAllSecurityGuards" src/app.ts; then
    pass "Security guards applied in app.ts"
else
    fail "Security guards not applied in app.ts"
fi

##############################################################################
# 7. Configuration Files
##############################################################################

echo -e "\n${BLUE}═══ 7. Configuration Files ═══${NC}\n"

# Check important config files
[ -f ".gitignore" ] && pass ".gitignore exists" || fail ".gitignore missing"
[ -f "package.json" ] && pass "package.json exists" || fail "package.json missing"
[ -f "tsconfig.json" ] && pass "tsconfig.json exists" || fail "tsconfig.json missing"
[ -f ".semgrep.yml" ] && pass ".semgrep.yml exists" || warn ".semgrep.yml missing"
[ -f "trivy.yaml" ] && pass "trivy.yaml exists" || warn "trivy.yaml missing"

# Check .gitignore includes sensitive files
if grep -q ".env" .gitignore && grep -q "*.pem" .gitignore; then
    pass ".gitignore includes sensitive files"
else
    fail ".gitignore missing sensitive file patterns"
fi

##############################################################################
# 8. File Structure
##############################################################################

echo -e "\n${BLUE}═══ 8. File Structure ═══${NC}\n"

# Check required directories
[ -d "src" ] && pass "src/ directory exists" || fail "src/ missing"
[ -d "src/routes" ] && pass "src/routes/ exists" || fail "src/routes/ missing"
[ -d "src/middleware" ] && pass "src/middleware/ exists" || fail "src/middleware/ missing"
[ -d "src/services" ] && pass "src/services/ exists" || fail "src/services/ missing"
[ -d "prisma" ] && pass "prisma/ exists" || fail "prisma/ missing"

##############################################################################
# 9. Documentation
##############################################################################

echo -e "\n${BLUE}═══ 9. Documentation ═══${NC}\n"

[ -f "README.md" ] && pass "README.md exists" || warn "README.md missing"
[ -f "PRE_PRODUCTION_CHECKLIST.md" ] && pass "PRE_PRODUCTION_CHECKLIST.md exists" || warn "Checklist missing"
[ -f "FINAL_SECURITY_VERIFICATION_REPORT.md" ] && pass "Security report exists" || warn "Security report missing"

##############################################################################
# Summary
##############################################################################

echo -e "\n${BLUE}═══════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}                    SUMMARY                            ${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}\n"

echo -e "${GREEN}✅ Passed:   $PASSED${NC}"
echo -e "${YELLOW}⚠️  Warnings: $WARNINGS${NC}"
echo -e "${RED}❌ Failed:   $FAILED${NC}"
echo ""

TOTAL=$((PASSED + WARNINGS + FAILED))
SCORE=$((PASSED * 100 / TOTAL))

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}╔════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║  🎉 ALL CRITICAL CHECKS PASSED! Ready for deployment     ║${NC}"
    echo -e "${GREEN}║  Score: $SCORE% ($PASSED/$TOTAL checks passed)                     ║${NC}"
    echo -e "${GREEN}╚════════════════════════════════════════════════════════════╝${NC}"
    exit 0
else
    echo -e "${RED}╔════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${RED}║  ❌ $FAILED CRITICAL CHECKS FAILED!                         ║${NC}"
    echo -e "${RED}║  Please fix issues before deployment                     ║${NC}"
    echo -e "${RED}║  Score: $SCORE% ($PASSED/$TOTAL checks passed)                     ║${NC}"
    echo -e "${RED}╚════════════════════════════════════════════════════════════╝${NC}"
    exit 1
fi
