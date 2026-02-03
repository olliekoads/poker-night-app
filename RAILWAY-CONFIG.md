# Railway Configuration

## Critical Setup Requirements

### Service: poker-backend
- **Root Directory:** `/poker-backend`
- **Build Command:** `npm install && npm run build`
- **Start Command:** `npm start`
- **Environment Variables:** DATABASE_URL, GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, EMAIL_HOST, EMAIL_PORT, EMAIL_USER, EMAIL_PASS

### Service: poker-frontend
- **Root Directory:** `/poker-player-manager`
- **Build Command:** `npm install && npm run build`
- **Start Command:** `npm run preview -- --host 0.0.0.0 --port $PORT`
- **Environment Variables:** VITE_API_URL (points to backend)

## ⚠️ Common Mistakes

1. **Wrong Root Directory** - If a service deploys from repo root (`/`), it will build the wrong code
   - Backend service MUST have root directory = `/poker-backend`
   - Frontend service MUST have root directory = `/poker-player-manager`

2. **Domain pointing to wrong service** - pokernight.famylin.com must point to frontend service, not backend

## How to Verify Deployment

### Backend Health Check
```bash
curl https://poker-night-app-production-e6e4.up.railway.app/api/health
# Should return: {"status":"OK","message":"Poker Backend API is running",...}
```

### Frontend Check
```bash
curl https://pokernight.famylin.com
# Should return: HTML with <!DOCTYPE html> and <div id="root"></div>
# Should NOT return: JSON with "Poker Night API"
```

## Setting Root Directory in Railway

1. Go to Railway dashboard
2. Select project: poker-night-app
3. Select service (poker-frontend or poker-backend)
4. Click "Settings" tab
5. Scroll to "Root Directory"
6. Set the correct path
7. Redeploy

## Railway Service Setup Checklist

When creating a new Railway service:
- [ ] Set correct root directory
- [ ] Configure environment variables
- [ ] Set build command if needed
- [ ] Set start command
- [ ] Deploy and wait for completion
- [ ] Run health check to verify correct service is running
- [ ] Check logs for errors

## Custom Domain Setup

pokernight.famylin.com should point to **poker-frontend** service:
1. In Railway dashboard, go to poker-frontend service
2. Settings → Domains
3. Add custom domain: pokernight.famylin.com
4. Update DNS CNAME to Railway's provided target
