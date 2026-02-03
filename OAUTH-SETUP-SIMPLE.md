# 🔐 Google OAuth Setup - 5 Minute Guide

I've created the Google Cloud project for you: **Poker Night App** (poker-night-app-486303)

Now you just need to create the OAuth credentials. Here's the exact steps:

---

## Step 1: Open Google Cloud Console

Already done! The browser should be open to your project.

If not, go to: https://console.cloud.google.com/apis/credentials/consent?project=poker-night-app-486303

---

## Step 2: Configure OAuth Consent Screen

1. Click **"CONFIGURE CONSENT SCREEN"** or **"Get started"**

2. **User Type:** Select **External**, then **Create**

3. **App Information:**
   - App name: `Poker Night`
   - User support email: Select `ollie@famylin.com`
   - Click **Save and Continue**

4. **Scopes:**
   - Just click **Save and Continue** (default scopes are fine)

5. **Test users:**
   - Click **"+ ADD USERS"**
   - Add: `edwinlin1987@gmail.com`
   - Click **Add**
   - Click **Save and Continue**

6. **Summary:**
   - Click **Back to Dashboard**

---

## Step 3: Create OAuth Client ID

1. Click **"Credentials"** in the left sidebar

2. Click **"+ CREATE CREDENTIALS"** → **"OAuth client ID"**

3. **Application type:** Select **Web application**

4. **Name:** `Poker Night Web Client`

5. **Authorized redirect URIs:**
   - Click **"+ Add URI"**
   - Paste this EXACTLY:
     ```
     https://poker-night-app-production-e6e4.up.railway.app/api/auth/google/callback
     ```

6. Click **CREATE**

---

## Step 4: Copy Credentials

A popup will show your credentials. Copy both:

1. **Client ID** (looks like: `123456789-xxxxx.apps.googleusercontent.com`)
2. **Client secret** (looks like: `GOCSPX-xxxxx`)

**Paste them in the chat and I'll configure Railway instantly!**

---

## Quick Troubleshooting

- If you get "redirect_uri_mismatch" later, double-check the URI has no trailing slash
- The app will start in "Testing" mode - that's perfect for now
- You can publish it later if you want others to use it

---

**Ready?** Just paste the Client ID and Client Secret when you have them!
