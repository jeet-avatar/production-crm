#!/bin/bash

# BrandMonkz CRM - Sandbox API Testing Script
# ============================================

API_URL="http://18.212.225.252:3000"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  BRANDMONKZ CRM - SANDBOX API TESTING                     ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Test 1: Health Check
echo -e "${YELLOW}[1/8] Testing Health Endpoint...${NC}"
HEALTH=$(curl -s "$API_URL/health")
if echo "$HEALTH" | grep -q "ok"; then
    echo -e "${GREEN}✓ Health check passed${NC}"
    echo "$HEALTH" | python3 -m json.tool
else
    echo -e "${RED}✗ Health check failed${NC}"
fi
echo ""

# Test 2: Security Headers
echo -e "${YELLOW}[2/8] Testing Security Headers...${NC}"
HEADERS=$(curl -s -I "$API_URL/health")
if echo "$HEADERS" | grep -q "X-Content-Type-Options"; then
    echo -e "${GREEN}✓ Security headers present${NC}"
    echo "$HEADERS" | grep -E "X-Content-Type-Options|X-Frame-Options|X-XSS-Protection|Strict-Transport-Security"
else
    echo -e "${RED}✗ Security headers missing${NC}"
fi
echo ""

# Test 3: CSRF Token
echo -e "${YELLOW}[3/8] Testing CSRF Protection...${NC}"
CSRF_RESPONSE=$(curl -s "$API_URL/api/csrf-token")
CSRF_TOKEN=$(echo "$CSRF_RESPONSE" | python3 -c "import sys, json; print(json.load(sys.stdin).get('csrfToken', ''))" 2>/dev/null)
if [ -n "$CSRF_TOKEN" ]; then
    echo -e "${GREEN}✓ CSRF token generated${NC}"
    echo "Token: $CSRF_TOKEN"
else
    echo -e "${RED}✗ CSRF token not generated${NC}"
fi
echo ""

# Test 4: Input Validation
echo -e "${YELLOW}[4/8] Testing Input Validation...${NC}"
VALIDATION=$(curl -s -X POST "$API_URL/api/auth/register" \
    -H "Content-Type: application/json" \
    -d '{"email":"invalid-email","password":"123"}')
if echo "$VALIDATION" | grep -q "Validation failed"; then
    echo -e "${GREEN}✓ Input validation working${NC}"
    echo "Response: $VALIDATION" | python3 -m json.tool 2>/dev/null || echo "$VALIDATION"
else
    echo -e "${YELLOW}⚠ Validation response: $VALIDATION${NC}"
fi
echo ""

# Test 5: SQL Injection Prevention
echo -e "${YELLOW}[5/8] Testing SQL Injection Prevention...${NC}"
SQL_TEST=$(curl -s -X POST "$API_URL/api/auth/login" \
    -H "Content-Type: application/json" \
    -d '{"email":"test@test.com OR 1=1--","password":"test"}')
if echo "$SQL_TEST" | grep -q "Invalid"; then
    echo -e "${GREEN}✓ SQL injection blocked${NC}"
else
    echo -e "${YELLOW}⚠ Response: $SQL_TEST${NC}"
fi
echo ""

# Test 6: User Registration (Valid)
echo -e "${YELLOW}[6/8] Testing User Registration...${NC}"
RANDOM_EMAIL="test$(date +%s)@brandmonkz.com"
REGISTER=$(curl -s -X POST "$API_URL/api/auth/register" \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"$RANDOM_EMAIL\",\"password\":\"SecurePass123!\",\"name\":\"Test User\",\"company\":\"BrandMonkz\"}")
echo "Response: $REGISTER" | python3 -m json.tool 2>/dev/null || echo "$REGISTER"
echo ""

# Test 7: User Login
echo -e "${YELLOW}[7/8] Testing User Login...${NC}"
LOGIN=$(curl -s -X POST "$API_URL/api/auth/login" \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"$RANDOM_EMAIL\",\"password\":\"SecurePass123!\"}")
TOKEN=$(echo "$LOGIN" | python3 -c "import sys, json; data=json.load(sys.stdin); print(data.get('token', ''))" 2>/dev/null || echo "")
if [ -n "$TOKEN" ]; then
    echo -e "${GREEN}✓ Login successful${NC}"
    echo "Token: ${TOKEN:0:50}..."
else
    echo -e "${YELLOW}⚠ Login response: $LOGIN${NC}"
fi
echo ""

# Test 8: Authenticated Request
if [ -n "$TOKEN" ]; then
    echo -e "${YELLOW}[8/8] Testing Authenticated Request...${NC}"
    PROFILE=$(curl -s "$API_URL/api/auth/profile" \
        -H "Authorization: Bearer $TOKEN")
    if echo "$PROFILE" | grep -q "email"; then
        echo -e "${GREEN}✓ Authenticated request successful${NC}"
        echo "$PROFILE" | python3 -m json.tool 2>/dev/null || echo "$PROFILE"
    else
        echo -e "${YELLOW}⚠ Response: $PROFILE${NC}"
    fi
else
    echo -e "${YELLOW}[8/8] Skipping authenticated test (no token)${NC}"
fi
echo ""

echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  TESTING COMPLETE                                         ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${GREEN}Sandbox URL:${NC} $API_URL"
echo -e "${GREEN}Documentation:${NC} See SANDBOX_DEPLOYED.md for full API reference"
echo ""
