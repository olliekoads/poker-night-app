# Security Incident - Exposed SMTP Credentials

**Date:** February 3, 2026  
**Detected by:** GitGuardian  
**Severity:** HIGH - Gmail app passwords exposed in public repository

## Exposed Credentials

Two Gmail app passwords for edwinlin1987@gmail.com were committed to git history:
1. `aazkjucqmkiorigh` - in DEPLOYMENT-SUCCESS-2026-02-01.md, EMAIL-FIX-2026-02-01.md
2. `hobvjnswittxfbih` - in test-email.js

## Immediate Actions Taken

### 1. Alert sent to Edwin (11:59 PM PST)
- iMessage alert to +14083550487
- Requested immediate revocation of both app passwords
- Opened https://myaccount.google.com/apppasswords

### 2. Remediation Plan

**Step 1: Revoke Compromised Passwords** ✅ (Edwin to complete)
- Delete both app passwords from Google Account settings

**Step 2: Clean Git History**
```bash
# Install BFG Repo Cleaner
brew install bfg

# Create backup
cd /Users/ollie/.openclaw/workspace
tar -czf poker-night-app-backup-$(date +%Y%m%d-%H%M%S).tar.gz poker-night-app/

# Remove sensitive files from all commits
cd poker-night-app
bfg --delete-files DEPLOYMENT-SUCCESS-2026-02-01.md
bfg --delete-files EMAIL-FIX-2026-02-01.md  
bfg --delete-files test-email.js

# Clean up git history
git reflog expire --expire=now --all
git gc --prune=now --aggressive

# Force push (this will rewrite history!)
git push origin --force --all
```

**Step 3: Generate New App Password**
```bash
# Run script to generate new token
cd poker-backend
node generate-gmail-token.js
```

**Step 4: Update Railway Environment**
- Set new EMAIL_PASS in Railway dashboard
- Redeploy backend service

**Step 5: Add Protection**
```bash
# Add to .gitignore
echo "
# Prevent future credential leaks
**/EMAIL-*.md
**/DEPLOYMENT-SUCCESS-*.md
test-email.js
*.credentials
*.secrets
" >> .gitignore
```

## Files Containing Passwords

- `DEPLOYMENT-SUCCESS-2026-02-01.md` (both passwords)
- `EMAIL-FIX-2026-02-01.md` (password 1)
- `test-email.js` (password 2)

## Timeline

- **Feb 2, 2026 ~11:27 PM PST:** Passwords committed to git
- **Feb 2, 2026 ~11:43 PM PST:** Pushed to GitHub (olliekoads/poker-night-app)
- **Feb 3, 2026 ~12:00 AM PST:** GitGuardian detected exposure
- **Feb 3, 2026 12:00 AM PST:** Incident response initiated

## Lessons Learned

1. ⚠️ **NEVER commit credentials** - even in documentation files
2. Use environment variables exclusively for all secrets
3. Add credentials files to .gitignore BEFORE creating them
4. Run `git-secrets` or similar scanner before pushing
5. Documentation should use placeholders like `[REDACTED]` or `xxxx-xxxx-xxxx`

## Prevention Measures

1. Update .gitignore to block common credential file patterns
2. Add pre-commit hook to scan for secrets
3. Use 1Password CLI references instead of hardcoded values
4. Regular security audits of repository

---

## Current Status

✅ **Prepared:**
- Backup created: `/Users/ollie/.openclaw/workspace/poker-night-app-backup-*.tar.gz`
- BFG Repo Cleaner installed
- Cleanup script ready: `clean-git-history.sh`
- Updated .gitignore to prevent future leaks

⏳ **Waiting:**
- Edwin to revoke both app passwords at https://myaccount.google.com/apppasswords

🔜 **Next:**
- Run cleanup script once passwords are revoked
- Generate new app password
- Update Railway
- Force push cleaned history

**Quick Recovery Commands:**
```bash
# 1. After Edwin confirms passwords revoked:
cd /Users/ollie/.openclaw/workspace/poker-night-app
./clean-git-history.sh

# 2. Generate new password:
cd poker-backend
node generate-gmail-token.js

# 3. Update Railway EMAIL_PASS with new password
# 4. Force push: git push origin --force --all
```

---

**Status:** ⏳ WAITING FOR PASSWORD REVOCATION
