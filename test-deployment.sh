#!/bin/bash
set -e

echo "🧪 Testing Poker Night App Deployment"
echo "======================================"
echo ""

# Backend health check
echo "1. Testing Backend Health..."
BACKEND_RESPONSE=$(curl -s https://poker-night-app-production-e6e4.up.railway.app/api/health)
if echo "$BACKEND_RESPONSE" | grep -q "Poker Backend API is running"; then
    echo "   ✅ Backend is responding correctly"
else
    echo "   ❌ Backend health check failed"
    echo "   Response: $BACKEND_RESPONSE"
    exit 1
fi
echo ""

# Frontend check
echo "2. Testing Frontend (pokernight.famylin.com)..."
FRONTEND_RESPONSE=$(curl -s https://pokernight.famylin.com)

if echo "$FRONTEND_RESPONSE" | grep -q "<!DOCTYPE html>"; then
    if echo "$FRONTEND_RESPONSE" | grep -q "Poker Night"; then
        echo "   ✅ Frontend is serving HTML correctly"
    else
        echo "   ⚠️  Frontend serving HTML but title might be wrong"
    fi
elif echo "$FRONTEND_RESPONSE" | grep -q "Poker Night API"; then
    echo "   ❌ CRITICAL: Frontend domain is serving BACKEND code!"
    echo "   Fix: Set poker-frontend service root directory to /poker-player-manager"
    exit 1
else
    echo "   ❌ Frontend response unexpected"
    echo "   First 200 chars: ${FRONTEND_RESPONSE:0:200}"
    exit 1
fi
echo ""

# Direct frontend service check
echo "3. Testing Frontend Service Directly..."
FRONTEND_DIRECT=$(curl -s https://poker-frontend-production-543f.up.railway.app)
if echo "$FRONTEND_DIRECT" | grep -q "<!DOCTYPE html>"; then
    echo "   ✅ Frontend service is serving HTML"
else
    echo "   ❌ Frontend service not serving HTML correctly"
    echo "   First 200 chars: ${FRONTEND_DIRECT:0:200}"
    exit 1
fi
echo ""

# Email config check (backend logs)
echo "4. Checking Email Configuration..."
echo "   (Check Railway backend logs for 'Email service initialized successfully')"
echo ""

echo "======================================"
echo "✅ All deployment tests passed!"
echo ""
echo "Next steps:"
echo "  - Test OAuth login flow"
echo "  - Verify historical data displays"
echo "  - Test creating a new session"
