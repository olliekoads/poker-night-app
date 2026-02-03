# Fix Frontend Deployment Issue

## Current Problem

The `poker-frontend` Railway service is deploying backend code instead of frontend code because the Root Directory is not set correctly.

**Evidence:**
```bash
curl https://pokernight.famylin.com
# Returns: {"message":"Poker Night API",...}  ❌ WRONG
# Should return: <!DOCTYPE html>... ✅ CORRECT
```

## Root Cause

Railway services deploy from repo root (`/`) by default. In a monorepo, you MUST set the Root Directory explicitly.

## Fix Steps

### Option 1: Update Existing Service (Recommended)

1. Go to https://railway.com/project/452581bb-8d5d-4e2c-a8fb-da5800a3a088
2. Click on `poker-frontend` service
3. Click **Settings** tab
4. Scroll to **Root Directory**
5. Set to: `/poker-player-manager`
6. Click **Save**
7. Go to **Deployments** tab
8. Click **Redeploy** on latest deployment

### Option 2: Delete and Recreate Service

1. Delete `poker-frontend` service
2. Create new service
3. Connect to `olliekoads/poker-night-app` repo
4. Set Root Directory to `/poker-player-manager` during creation
5. Add environment variables:
   - `VITE_API_URL=https://poker-night-app-production-e6e4.up.railway.app/api`
6. Deploy

## Verification

After redeploying, run:

```bash
cd /Users/ollie/.openclaw/workspace/poker-night-app
./test-deployment.sh
```

Should see:
```
✅ Backend is responding correctly
✅ Frontend is serving HTML correctly
✅ Frontend service is serving HTML
✅ All deployment tests passed!
```

## Prevention

See `RAILWAY-CONFIG.md` for:
- Correct configuration for each service
- Common mistakes to avoid
- Deployment checklist

**Key rule:** Never deploy Railway monorepo services without setting Root Directory first.
