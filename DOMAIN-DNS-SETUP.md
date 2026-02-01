# Domain DNS Setup for famylin.com

## Current Status
- Domain: famylin.com (registered via Namecheap)
- Frontend deployed: https://poker-player-manager.vercel.app
- Backend deployed: https://poker-night-app-production-985f.up.railway.app
- Domain added to Vercel project: ✅

## Required DNS Configuration

To make famylin.com point to the Vercel deployment, add these records at Namecheap:

### Option 1: A + CNAME Records (Recommended)
Add these DNS records in your Namecheap dashboard:

```
Type    Host    Value                         TTL
A       @       76.76.21.21                   Automatic
CNAME   www     cname.vercel-dns.com.         Automatic
```

### Option 2: CNAME Only (if subdomain-only is acceptable)
```
Type    Host    Value                         TTL
CNAME   @       cname.vercel-dns.com.         Automatic
CNAME   www     cname.vercel-dns.com.         Automatic
```

## How to Configure at Namecheap

1. Log in to Namecheap
2. Go to Domain List
3. Click "Manage" next to famylin.com
4. Go to "Advanced DNS" tab
5. Add the records listed above under Option 1
6. Wait 5-30 minutes for DNS propagation

## Verification

After DNS propagates, you should be able to access:
- https://famylin.com → Poker Player Manager frontend
- https://www.famylin.com → Same frontend

The SSL certificate will be automatically provisioned by Vercel once DNS is configured.

## Current Nameservers
```
dns1.registrar-servers.com
dns2.registrar-servers.com
```

These are Namecheap's default nameservers, which is correct for this setup.
