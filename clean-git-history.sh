#!/bin/bash
# Git History Cleanup Script - Remove Exposed Credentials
# Run this ONLY after Edwin has revoked the app passwords!

set -e

echo "🚨 Git History Cleanup for poker-night-app"
echo "=========================================="
echo ""
echo "⚠️  WARNING: This will rewrite git history!"
echo "⚠️  Make sure Edwin has REVOKED the exposed passwords first!"
echo ""
read -p "Have the passwords been revoked? (yes/no): " confirmed

if [ "$confirmed" != "yes" ]; then
    echo "❌ Cleanup aborted. Revoke passwords first!"
    exit 1
fi

echo ""
echo "📦 Creating backup..."
BACKUP_FILE="../poker-night-app-backup-$(date +%Y%m%d-%H%M%S).tar.gz"
cd ..
tar -czf "$BACKUP_FILE" poker-night-app/
echo "✅ Backup created: $BACKUP_FILE"
cd poker-night-app

echo ""
echo "🧹 Removing sensitive files from git history..."

# Delete files containing exposed passwords
bfg --delete-files DEPLOYMENT-SUCCESS-2026-02-01.md
bfg --delete-files EMAIL-FIX-2026-02-01.md
bfg --delete-files test-email.js

# Also clean any other potential leaks
bfg --delete-files "EMAIL-FIX-*.md"
bfg --delete-files "DEPLOYMENT-SUCCESS-*.md"
bfg --delete-files "test-email-*.js"

echo ""
echo "🗑️  Cleaning up git objects..."
git reflog expire --expire=now --all
git gc --prune=now --aggressive

echo ""
echo "📝 Removing sensitive files from working directory..."
rm -f DEPLOYMENT-SUCCESS-2026-02-01.md
rm -f EMAIL-FIX-2026-02-01.md
rm -f test-email.js

echo ""
echo "✅ Git history cleaned!"
echo ""
echo "⚠️  NEXT STEPS:"
echo "1. Review the changes with: git log --oneline -20"
echo "2. Force push to GitHub: git push origin --force --all"
echo "3. Force push tags: git push origin --force --tags"
echo "4. Generate new Gmail app password"
echo "5. Update Railway EMAIL_PASS environment variable"
echo "6. Redeploy backend service"
echo ""
echo "💡 Backup location: $BACKUP_FILE"
