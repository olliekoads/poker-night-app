# Email Issue - Root Cause & Resolution

**Date:** February 3, 2026  
**Status:** ✅ RESOLVED

## Problem

When creating a poker session with players, the HTTP request would hang indefinitely and never return a response. No emails were being sent.

## Root Causes

### 1. SMTP Connection Timeout
Railway couldn't connect to Gmail's SMTP server on port **587** (STARTTLS). The connection was timing out after 30+ seconds.

**Error in logs:**
```
Failed to send session invite email to edwinlin1987@gmail.com: Error: Connection timeout
code: 'ETIMEDOUT',
command: 'CONN'
```

### 2. Blocking Email Sending
The session creation endpoint was **waiting** for all emails to send before responding to the client:

```typescript
// BEFORE (blocking)
await sendSessionInviteEmails(sessionId, userId);
await fetchSessionById(sessionId, res);
```

This caused two problems:
- HTTP requests hung waiting for email timeout
- User interface appeared frozen
- Session was created but UI never updated

## Solutions Applied

### Fix #1: Change SMTP Port (587 → 465)
Changed from STARTTLS (port 587) to SSL/TLS (port 465), which is more reliable on cloud platforms like Railway.

**Railway Environment Variables:**
```bash
EMAIL_PORT=465  # Changed from 587
EMAIL_HOST=smtp.gmail.com
EMAIL_USER=edwinlin1987@gmail.com
EMAIL_PASS=[app password]
```

### Fix #2: Non-Blocking Email Sending
Made email sending asynchronous (fire-and-forget) so it doesn't block HTTP responses:

```typescript
// AFTER (non-blocking)
sendSessionInviteEmails(sessionId, userId).catch(err => {
  console.error('Background email sending failed:', err);
});
await fetchSessionById(sessionId, res);
```

**Benefits:**
- Session creation returns immediately
- UI updates instantly
- Emails send in background
- If email fails, it's logged but doesn't break session creation

## Testing

After deploying fixes:
1. Create a new session with players who have email addresses
2. Request should return immediately (~200-500ms)
3. Emails will send in background within a few seconds
4. Check logs to verify email sending: `railway logs --service poker-night-app`

## Expected Log Output

**Success:**
```
Session invite emails sent for session 37: 1 sent, 0 failed
```

**If still having connection issues:**
```
Background email sending failed: Error: Connection timeout
```

## Next Steps If Issues Persist

If port 465 still times out on Railway:

### Option 1: Use SendGrid or Mailgun
Third-party email services are designed for cloud platforms and more reliable than Gmail SMTP.

### Option 2: Railway Network Allowlist
Contact Railway support to ensure outbound SMTP traffic is allowed.

### Option 3: Email Queue
Implement a job queue (Bull, BullMQ) to retry failed emails.

## Files Modified

- `poker-backend/src/routes/sessions.ts` - Made email sending non-blocking
- Railway environment variable: `EMAIL_PORT=465`

## Commits

- `a99d598` - Fix: Make email sending non-blocking to prevent request timeouts
- `ec089eb` - Security: Mark incident as resolved (earlier today)

---

**Current Status:** Session creation works instantly. Emails send in background. If emails still fail to send (connection timeout), we'll need to switch to a dedicated email service like SendGrid.
