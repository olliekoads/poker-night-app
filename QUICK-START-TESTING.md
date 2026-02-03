# 🚀 Quick Start - Testing Your Poker App

## ✅ Good News!

Both frontend and backend are deployed and working! You just need to bypass the Google OAuth login to test the app.

---

## 🎯 Fastest Way to Test (30 seconds)

### Option 1: Use the Test Login Page (Recommended)

1. **Open the test login page:**
   ```bash
   open ~/.openclaw/workspace/poker-night-app/test-login.html
   ```
   (Or double-click it in Finder)

2. **Click "Login as Edwin & Open App"**
   - It will inject your auth token and open the app
   - You'll be logged in as edwinlin1987@gmail.com

3. **Start testing!**
   - View your 344 poker sessions
   - See player statistics
   - Create new sessions
   - Everything works except the "Login with Google" button

---

### Option 2: Manual Token Injection

1. **Open the app:**
   ```
   https://poker-frontend-production-543f.up.railway.app
   ```

2. **Open DevTools Console** (F12 or Cmd+Option+J)

3. **Paste this code:**
   ```javascript
   localStorage.setItem('poker_token', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjEsImVtYWlsIjoiZWR3aW5saW4xOTg3QGdtYWlsLmNvbSIsImlhdCI6MTc3MDA4MjExMSwiZXhwIjoxNzcyNjc0MTExfQ.pQovAUwiOpi2nOv-Qhx5m8WydFT40f1wAbT9fKNFaMA');
   location.reload();
   ```

4. **Page reloads - you're logged in!**

---

## 🔧 What's Working vs. What's Not

### ✅ Working
- All 344 poker sessions from your historical data
- Player statistics and rankings
- Creating/editing sessions
- Buy-in and cash-out tracking
- Session history
- Backend API (fully functional)
- Database (all data loaded)

### ❌ Not Working Yet
- Google OAuth login button
  - **Why:** Needs Google Cloud credentials
  - **Fix:** Follow steps in `GOOGLE_OAUTH_SETUP.md`
  - **Impact:** Can't login normally (but token method works fine)

---

## 📋 Next Steps

### Immediate (Keep Testing with Token)
Your JWT token is valid for 30 days, so you can keep testing without any issues.

### To Fix Google Login (10-15 minutes)

1. **Create Google Cloud Project:**
   - Go to: https://console.cloud.google.com/
   - Create project "Poker Night App"

2. **Enable APIs:**
   - Google+ API (or People API)
   - Google Identity Services API

3. **Configure OAuth Consent Screen:**
   - External user type
   - Add your email as test user

4. **Create OAuth Credentials:**
   - Web application type
   - Redirect URI: `https://poker-night-app-production-e6e4.up.railway.app/api/auth/google/callback`

5. **Update Railway Environment Variables:**
   ```bash
   railway service poker-night-app
   railway variables --set GOOGLE_CLIENT_ID="your-client-id"
   railway variables --set GOOGLE_CLIENT_SECRET="your-client-secret"
   railway up
   ```

**Full detailed guide:** `GOOGLE_OAUTH_SETUP.md`

---

## 🎮 What You Can Test Right Now

With the JWT token, you have full access to test:

1. **View Sessions:**
   - Browse all 344 historical sessions
   - See detailed player stats
   - Filter by date/player

2. **Create New Session:**
   - Schedule poker night
   - Invite players (16 players available)
   - Set buy-in amounts

3. **Manage Players:**
   - View player list
   - See individual player stats
   - Track lifetime wins/losses

4. **Session Management:**
   - Record buy-ins
   - Track cash-outs
   - Calculate profits/losses
   - View session summaries

---

## 📊 Your Data Summary

The database has all your historical poker data:

- **344 sessions** (Oct 2022 - May 2025)
- **16 players** with full stats
- **370 session records** with buy-ins/cash-outs
- **4 user accounts** (including yours)

---

## 💡 Pro Tip

If you want to generate a fresh token anytime:

```bash
cd ~/.openclaw/workspace/poker-night-app/poker-backend
railway service Postgres
DATABASE_URL=$(railway variables --json | grep DATABASE_PUBLIC_URL | cut -d'"' -f4) \
node generate-test-token.js
```

---

## 📞 Questions?

Check these docs:
- Full test report: `TEST-REPORT-2026-02-02.md`
- OAuth setup guide: `GOOGLE_OAUTH_SETUP.md`
- Deployment details: `DEPLOYMENT-SUCCESS-2026-02-02.md`

---

**Ready to test?** → `open ~/.openclaw/workspace/poker-night-app/test-login.html`
