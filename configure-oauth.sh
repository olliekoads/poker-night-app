#!/bin/bash
# Auto-configure OAuth credentials in Railway

set -e

CLIENT_ID="$1"
CLIENT_SECRET="$2"

if [ -z "$CLIENT_ID" ] || [ -z "$CLIENT_SECRET" ]; then
  echo "❌ Usage: $0 <CLIENT_ID> <CLIENT_SECRET>"
  exit 1
fi

echo "🔧 Configuring Google OAuth for Poker Night App..."
echo ""

cd "$(dirname "$0")"

# Switch to backend service
echo "📦 Linking to poker-night-app service..."
railway service poker-night-app

# Set OAuth credentials
echo "🔑 Setting GOOGLE_CLIENT_ID..."
railway variables --set "GOOGLE_CLIENT_ID=$CLIENT_ID"

echo "🔐 Setting GOOGLE_CLIENT_SECRET..."
railway variables --set "GOOGLE_CLIENT_SECRET=$CLIENT_SECRET"

# Also set frontend URL for redirects
echo "🌐 Setting FRONTEND_URL..."
railway variables --set "FRONTEND_URL=https://poker-frontend-production-543f.up.railway.app"

echo ""
echo "✅ OAuth configured successfully!"
echo ""
echo "🚀 Redeploying backend..."
railway up --detach

echo ""
echo "🎉 Done! The backend will redeploy with OAuth enabled."
echo ""
echo "Test it by visiting:"
echo "https://poker-frontend-production-543f.up.railway.app"
echo ""
echo "You should now be able to click 'Login with Google'!"
