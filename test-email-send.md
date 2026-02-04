# Email Sending Test Plan

## Current Setup
- **Email service:** Initialized successfully (seen in logs)
- **SMTP:** smtp.gmail.com:587
- **User:** edwinlin1987@gmail.com
- **Password:** Updated with new app password (czohitttpflbqzec)

## What triggers email sending?

### 1. Creating a new session with players
From `src/routes/sessions.ts` line 275:
```typescript
if (playerIds && playerIds.length > 0) {
  await sendSessionInviteEmails(sessionId, userId);
}
```

### 2. Adding players to existing session
The `sendPlayerAddedEmail` function is called when adding individual players.

## Requirements for emails to be sent

1. **Player must have email address** - checked with:
   ```sql
   SELECT p.id, p.name, p.email
   FROM session_players sp
   JOIN players p ON sp.player_id = p.id
   WHERE sp.session_id = ? AND p.email IS NOT NULL AND p.email != ''
   ```

2. **Email service must be configured** - ✅ Confirmed in logs

3. **FRONTEND_URL must be set** - Defaults to 'https://edwinpokernight.com' if not set

## Potential Issues

1. **Players don't have email addresses set** - Most common issue
2. **FRONTEND_URL not configured** - May generate wrong invite links
3. **Gmail authentication failing** - But we'd see errors in logs
4. **Emails going to spam** - User wouldn't know they were sent

## Next Steps

1. Check if players have email addresses in the database
2. Check if FRONTEND_URL is set correctly
3. Test email sending with a known email address
4. Check spam folder if emails are being sent but not received
