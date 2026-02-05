#!/bin/bash

# Test Email Allowlist Implementation
# Tests that only authorized emails can access the poker app

set -e

API_URL="https://poker-night-app-production-985f.up.railway.app/api"

echo "🃏 Testing Email Allowlist Implementation"
echo "==========================================="
echo ""

# Test 1: Health check
echo "📋 Test 1: Health Check"
HEALTH_RESPONSE=$(curl -s "$API_URL/health")
echo "Response: $HEALTH_RESPONSE"
if echo "$HEALTH_RESPONSE" | grep -q "OK"; then
    echo "✅ Backend is running"
else
    echo "❌ Backend health check failed"
    exit 1
fi
echo ""

# Test 2: Check auth endpoint without token (should return 401)
echo "📋 Test 2: Auth Status Without Token"
AUTH_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$API_URL/auth/status")
echo "HTTP Status: $AUTH_STATUS"
if [ "$AUTH_STATUS" = "401" ]; then
    echo "✅ Correctly requires authentication"
else
    echo "❌ Should return 401 without token"
    exit 1
fi
echo ""

# Test 3: Verify Google OAuth endpoint exists
echo "📋 Test 3: Google OAuth Endpoint"
OAUTH_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" -L "$API_URL/auth/google")
echo "HTTP Status: $OAUTH_RESPONSE"
if [ "$OAUTH_RESPONSE" = "302" ] || [ "$OAUTH_RESPONSE" = "200" ]; then
    echo "✅ Google OAuth endpoint is accessible"
else
    echo "❌ OAuth endpoint not working properly"
    exit 1
fi
echo ""

# Note: We can't test the actual email allowlist from this script
# because it requires completing the Google OAuth flow in a browser.
# The allowlist validation happens in the OAuth callback.

echo "==========================================="
echo "✅ All backend tests passed!"
echo ""
echo "⚠️  Note: Email allowlist validation occurs during OAuth flow."
echo "To fully test the allowlist:"
echo "1. Open the app in a browser"
echo "2. Try logging in with an allowed email (should succeed)"
echo "3. Try logging in with a non-allowed email (should fail)"
echo ""
echo "Allowed emails:"
echo "  - edwinlin1987@gmail.com"
echo "  - mmyung806@gmail.com"
echo "  - ollie@famylin.com"
echo "  - olliekoads@famylin.com"
