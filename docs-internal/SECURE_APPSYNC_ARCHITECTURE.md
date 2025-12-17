# Secure AppSync Integration Architecture

**Status**: ✅ Implemented (Secure)

---

## 🔒 Security Issue Resolved

### **Previous Architecture (INSECURE)**
```
Admin Panel Browser
  ├─ Uses NEXT_PUBLIC_ADMIN_SECRET ❌ (exposed in DevTools!)
  └─ Calls AppSync directly with secret visible
```

### **New Architecture (SECURE)**
```
Admin Panel Browser
  ├─ Calls /api/storefront/* (no secrets exposed) ✅
  └─ API Routes verify auth + proxy to AppSync
       ├─ Check Firebase Auth
       ├─ Check email whitelist
       ├─ Add admin secret server-side
       └─ Return result to browser
```

---

## 🏗️ Implementation

### **Server-Side Auth Module**
**File**: `src/lib/server-auth.ts`

```typescript
// Verifies Firebase auth + email whitelist
export async function verifyAdminAuth()

// Gets admin secret (server-side only)
export function getAdminSecret()

// Gets AppSync config (server-side only)
export function getAppSyncConfig()
```

### **API Routes Created**

1. **`/api/storefront/feature-flag`** (GET + POST)
   - GET: Fetch feature flag
   - POST: Set feature flag (requires auth)

2. **`/api/storefront/magic-request-config`** (GET + POST)
   - GET: Fetch Magic Request config
   - POST: Update Magic Request config (requires auth)

### **Client Module Updated**
**File**: `src/lib/storefront-appsync.ts`

- ✅ No longer imports AWS Amplify
- ✅ No longer uses `NEXT_PUBLIC_ADMIN_SECRET`
- ✅ Calls Admin Panel API routes instead of AppSync directly
- ✅ Secrets stay server-side only

---

## 🔐 Environment Variables

### **Admin Panel (Server-Side ONLY)**

**Add to `.env.local` or Vercel Environment Variables:**

```bash
# Storefront AppSync Configuration (SERVER-SIDE ONLY - No NEXT_PUBLIC_ prefix!)
STOREFRONT_APPSYNC_URL=https://k27zfa7alffqzmrgdjnw4pe5oa.appsync-api.us-east-1.amazonaws.com/graphql
STOREFRONT_APPSYNC_API_KEY=da2-spzif6mumbeshobov3eoynwq5i
STOREFRONT_ADMIN_SECRET=<your-admin-secret-from-terraform.tfvars>

# Authorization (Already exists, but shown here for completeness)
NEXT_PUBLIC_AUTHORIZED_EMAILS=jramirez203@outlook.com,threechicksandawick@gmail.com
```

### **What's Safe to Be Public?**

✅ **Safe (`NEXT_PUBLIC_` prefix)**:
- `NEXT_PUBLIC_AUTHORIZED_EMAILS` - Just email addresses, not sensitive

❌ **Must Stay Private (No `NEXT_PUBLIC_` prefix)**:
- `STOREFRONT_APPSYNC_URL` - Could be discovered, but not exploitable without secret
- `STOREFRONT_APPSYNC_API_KEY` - Allows read-only operations
- `STOREFRONT_ADMIN_SECRET` - **CRITICAL**: Allows write operations

---

## 🔄 Data Flow

### **Setting a Feature Flag**

```
┌─────────────────────────────────────────┐
│ Admin Panel UI (Browser)                │
│                                          │
│ setFeatureFlag('magicRequest', true)    │
└─────────────┬───────────────────────────┘
              │ fetch('/api/storefront/feature-flag', ...)
              │ Body: { key: 'magicRequest', value: true }
              ↓
┌─────────────────────────────────────────┐
│ API Route: /api/storefront/feature-flag │
│                                          │
│ 1. verifyAdminAuth()                    │
│    ├─ Check Firebase session cookie     │
│    └─ Check email in whitelist          │
│                                          │
│ 2. getAdminSecret() (server-side)       │
│                                          │
│ 3. Call AppSync with secret             │
│    mutation SetFeatureFlag {            │
│      input: { key, value, adminSecret } │
│    }                                     │
└─────────────┬───────────────────────────┘
              │
              ↓
┌─────────────────────────────────────────┐
│ Storefront AppSync API                  │
│                                          │
│ - Validates admin secret                │
│ - Updates DynamoDB                      │
│ - Returns result                        │
└─────────────┬───────────────────────────┘
              │
              ↓
┌─────────────────────────────────────────┐
│ API Route Returns to Browser            │
│                                          │
│ { success: true, data: {...} }          │
└─────────────────────────────────────────┘
```

---

## 🛡️ Security Benefits

### **1. Admin Secret Never Exposed**
- ❌ **Before**: Visible in browser DevTools, Network tab, localStorage
- ✅ **After**: Only exists in server memory, never sent to browser

### **2. Defense in Depth**
- Firebase Authentication (Google OAuth)
- Email Whitelist (Authorization)
- API Route Auth Check (Server-side verification)
- AppSync Admin Secret (Backend validation)

### **3. Audit Trail**
- All API route calls are logged server-side
- Failed auth attempts tracked
- Email + timestamp for all mutations

### **4. Rate Limiting (Future)**
- Can add rate limiting to API routes
- Prevent brute force on auth checks
- Protect against abuse

---

## 📊 What Changed in Code

### **Files Created**
1. `src/lib/server-auth.ts` - Auth utilities
2. `src/app/api/storefront/feature-flag/route.ts` - Feature flag API
3. `src/app/api/storefront/magic-request-config/route.ts` - Config API

### **Files Modified**
1. `src/lib/storefront-appsync.ts` - Now calls API routes instead of AppSync directly

### **Components Updated**
- All Magic Request components automatically use new secure API
- No component changes needed (same function signatures)

---

## ✅ Verification Steps

### **1. Check Environment Variables**
```bash
# In Admin Panel .env.local (should NOT have NEXT_PUBLIC_ prefix)
STOREFRONT_APPSYNC_URL=...
STOREFRONT_APPSYNC_API_KEY=...
STOREFRONT_ADMIN_SECRET=...
```

### **2. Test API Routes**
```bash
# Should return 403 if not authenticated
curl http://localhost:3000/api/storefront/feature-flag

# Should work after login
# (Use browser DevTools Network tab to verify)
```

### **3. Verify Secret Not Exposed**
- Open DevTools → Network tab
- Trigger a feature flag change
- Check request payload: Should NOT contain `adminSecret`
- Check response: Should NOT contain `adminSecret`

---

## 🚀 Deployment Checklist

### **Local Development**
- [x] Add environment variables to `.env.local`
- [x] Restart Next.js dev server
- [x] Test auth flow
- [x] Test feature flag mutations

### **Vercel Deployment**
- [ ] Add environment variables to Vercel (Project Settings → Environment Variables)
- [ ] Deploy new code
- [ ] Test in production
- [ ] Verify secrets not exposed in browser

---

## 📝 Interview Talking Points

### **"How did you secure the cross-app communication?"**

> "Initially, I had the admin secret in a `NEXT_PUBLIC_` environment variable, which exposed it in the browser. I refactored the architecture to use server-side API routes that act as a secure proxy. The browser calls the Admin Panel's API routes, which verify Firebase authentication and email authorization, then add the admin secret server-side before calling the Storefront's AppSync API. This follows the principle of defense in depth—multiple security layers ensure the secret never reaches the browser."

### **"What's the difference between the API key and admin secret?"**

> "The API key allows read-only operations that customers need, like browsing products or checking Magic Request availability. The admin secret authorizes write operations that only admins should perform, like changing pricing or disabling features. The API key can be public because it's scoped to safe operations, but the admin secret must stay server-side to prevent unauthorized configuration changes."

---

**This architecture demonstrates**:
- ✅ Understanding of client vs server security boundaries
- ✅ API design and proxy patterns
- ✅ Authentication and authorization best practices
- ✅ Secure secrets management
- ✅ Defense in depth security model

