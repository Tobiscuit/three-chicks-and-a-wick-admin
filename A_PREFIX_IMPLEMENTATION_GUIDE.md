# A_ Prefix Implementation Guide for LLM

## ⚠️ CRITICAL WARNING
**DO NOT ROLLBACK TO COMMIT 0cb9066** - This commit is incompatible with current Next.js 15 and Genkit API versions. The rollback will cause 10+ TypeScript errors that require extensive fixes.

## Project Context
This is a Next.js 15 admin panel for Shopify store management with Firebase integration and AI features using Genkit. The goal is to implement A_ prefixed environment variables for a development environment without affecting production.

## Current State (After Rollback Issues)
The project was rolled back to commit `0cb9066` which caused multiple compatibility issues:
- Next.js 15 API route type changes
- Genkit API compatibility issues  
- TypeScript strict null checks
- Missing imports and functions

## Required A_ Prefix Implementation

### 1. Environment Variable Structure
```bash
# Development Environment Variables (A_ prefixed)
USE_A_PREFIX=true

# Shopify Development Store
A_SHOPIFY_STORE_URL=your-dev-store.myshopify.com
A_SHOPIFY_ADMIN_ACCESS_TOKEN=your-dev-admin-token
A_SHOPIFY_WEBHOOK_SECRET=your-dev-webhook-secret

# Firebase Development Project (A_ prefixed)
A_NEXT_PUBLIC_FIREBASE_API_KEY=your-dev-api-key
A_NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-dev-project.firebaseapp.com
A_NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-dev-project-id
A_NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-dev-project.firebasestorage.app
A_NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your-dev-sender-id
A_NEXT_PUBLIC_FIREBASE_APP_ID=your-dev-app-id

# Firebase Server-Side (A_ prefixed)
A_FIREBASE_PROJECT_ID=your-dev-project-id
A_FIREBASE_SERVICE_ACCOUNT={"type":"service_account",...}
A_FIREBASE_STORAGE_BUCKET_ADMIN=your-dev-project.appspot.com

# Google AI Development (A_ prefixed)
A_GEMINI_API_KEY=your-dev-gemini-key

# App URLs (A_ prefixed)
A_NEXT_PUBLIC_APP_ORIGIN=https://dev-admin.yourdomain.com
A_NEXT_PUBLIC_STOREFRONT_URL=https://dev.yourdomain.com
A_AUTHORIZED_EMAILS=["email1@domain.com", "email2@domain.com"]
```

### 1.1 EXACT Environment Variable Names (Copy-Paste Ready)
```bash
# Core A_ prefix flag
USE_A_PREFIX=true

# Shopify Variables
A_SHOPIFY_STORE_URL
A_SHOPIFY_ADMIN_ACCESS_TOKEN
A_SHOPIFY_WEBHOOK_SECRET

# Firebase Client-Side Variables (NEXT_PUBLIC_)
A_NEXT_PUBLIC_FIREBASE_API_KEY
A_NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
A_NEXT_PUBLIC_FIREBASE_PROJECT_ID
A_NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
A_NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
A_NEXT_PUBLIC_FIREBASE_APP_ID

# Firebase Server-Side Variables
A_FIREBASE_PROJECT_ID
A_FIREBASE_SERVICE_ACCOUNT
A_FIREBASE_STORAGE_BUCKET_ADMIN

# Google AI Variables
A_GEMINI_API_KEY

# App URL Variables
A_NEXT_PUBLIC_APP_ORIGIN
A_NEXT_PUBLIC_STOREFRONT_URL
A_AUTHORIZED_EMAILS
```

### 2. Core Implementation Files

#### A. Create `src/lib/env-config.ts`
```typescript
const USE_A_PREFIX = process.env.USE_A_PREFIX === 'true';

function getEnvVar(key: string, fallback?: string): string | undefined {
  if (USE_A_PREFIX) {
    return process.env[`A_${key}`] || fallback;
  }
  return process.env[key] || fallback;
}

function getPublicEnvVar(key: string, fallback?: string): string | undefined {
  if (USE_A_PREFIX) {
    const aPrefixedValue = process.env[`A_NEXT_PUBLIC_${key}`];
    if (aPrefixedValue) {
      process.env[`NEXT_PUBLIC_${key}`] = aPrefixedValue; // Dynamic setting for Next.js
      return aPrefixedValue;
    }
    return fallback;
  }
  return process.env[`NEXT_PUBLIC_${key}`] || fallback;
}

function getRequiredEnvVar(key: string): string {
  const value = getEnvVar(key);
  if (!value) {
    throw new Error(`Required environment variable ${USE_A_PREFIX ? 'A_' : ''}${key} is not set`);
  }
  return value;
}

// Firebase Configuration
export const FIREBASE_CONFIG = {
  API_KEY: getPublicEnvVar('FIREBASE_API_KEY'),
  AUTH_DOMAIN: getPublicEnvVar('FIREBASE_AUTH_DOMAIN'),
  PROJECT_ID: getPublicEnvVar('FIREBASE_PROJECT_ID'),
  STORAGE_BUCKET: getPublicEnvVar('FIREBASE_STORAGE_BUCKET'),
  MESSAGING_SENDER_ID: getPublicEnvVar('FIREBASE_MESSAGING_SENDER_ID'),
  APP_ID: getPublicEnvVar('FIREBASE_APP_ID'),
};

// Firebase Admin Configuration
export const FIREBASE_ADMIN_CONFIG = {
  PROJECT_ID: getRequiredEnvVar('FIREBASE_PROJECT_ID'),
  SERVICE_ACCOUNT: getRequiredEnvVar('FIREBASE_SERVICE_ACCOUNT'),
  STORAGE_BUCKET_ADMIN: getRequiredEnvVar('FIREBASE_STORAGE_BUCKET_ADMIN'),
};

// Shopify Configuration
export const SHOPIFY_CONFIG = {
  STORE_URL: getRequiredEnvVar('SHOPIFY_STORE_URL'),
  ADMIN_ACCESS_TOKEN: getRequiredEnvVar('SHOPIFY_ADMIN_ACCESS_TOKEN'),
  WEBHOOK_SECRET: getRequiredEnvVar('SHOPIFY_WEBHOOK_SECRET'),
};

// Google AI Configuration
export const GOOGLE_AI_CONFIG = {
  API_KEY: getRequiredEnvVar('GEMINI_API_KEY'),
};

// App Configuration
export const APP_CONFIG = {
  ORIGIN: getPublicEnvVar('APP_ORIGIN'),
  STOREFRONT_URL: getPublicEnvVar('STOREFRONT_URL'),
  AUTHORIZED_EMAILS: getRequiredEnvVar('AUTHORIZED_EMAILS'),
};

// Initialize A_ prefixed variables at runtime
function initializeA_PrefixedVars() {
  if (USE_A_PREFIX) {
    const publicVars = [
      'FIREBASE_API_KEY', 'FIREBASE_AUTH_DOMAIN', 'FIREBASE_PROJECT_ID',
      'FIREBASE_STORAGE_BUCKET', 'FIREBASE_MESSAGING_SENDER_ID', 'FIREBASE_APP_ID',
      'APP_ORIGIN', 'STOREFRONT_URL'
    ];
    publicVars.forEach(key => {
      const aPrefixedValue = process.env[`A_NEXT_PUBLIC_${key}`];
      if (aPrefixedValue) {
        process.env[`NEXT_PUBLIC_${key}`] = aPrefixedValue;
      }
    });
  }
}
initializeA_PrefixedVars();
```

#### B. Update All Files to Use env-config
Replace all direct `process.env` usage with the appropriate config object:

```typescript
// OLD: process.env.SHOPIFY_STORE_URL
// NEW: SHOPIFY_CONFIG.STORE_URL

// OLD: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID  
// NEW: FIREBASE_CONFIG.PROJECT_ID
```

### 3. Files That Need Updates
- `src/services/shopify.ts`
- `src/app/actions.ts`
- `src/components/products-table/index.tsx`
- `src/app/api/webhooks/inventory-update/route.ts`
- `src/lib/firebase.ts`
- `src/lib/firebase-admin.ts`
- `src/app/api/diagnostic/route.ts`
- `src/app/settings/page.tsx`

### 4. Create Environment Files

#### A. `.env.development` (for local development)
```bash
USE_A_PREFIX=true
# ... all A_ prefixed variables as shown above
```

#### B. `vercel-env-vars.txt` (for Vercel deployment)
```bash
# Copy this to Vercel environment variables
USE_A_PREFIX=true
A_SHOPIFY_STORE_URL=your-dev-store.myshopify.com
A_SHOPIFY_ADMIN_ACCESS_TOKEN=your-dev-admin-token
# ... etc
```

### 5. Update .gitignore
```bash
# Add these lines
.env.development
vercel-env-vars.txt
```

## ⚠️ CRITICAL ISSUES ENCOUNTERED

### 1. Next.js 15 Compatibility Issues
- **API Routes**: `context.params` is now a Promise
- **Page Components**: `params` is now a Promise  
- **Headers**: `headers()` returns a Promise
- **Fix**: Add `await` and update type definitions

### 2. Genkit API Compatibility Issues
- **Part Types**: `genkit` vs `@google/generative-ai` have different Part structures
- **Response Methods**: `response.text()` vs `response.text` (property vs method)
- **Output Schemas**: `z.custom<Part>()` vs `z.object({ url: string })`
- **Fix**: Use correct imports and return types

### 3. TypeScript Strict Null Checks
- **Optional Chaining**: Add `?.` for safe property access
- **Type Assertions**: Use `as any` for complex type issues
- **Null Checks**: Add proper null/undefined checks

### 4. Missing Functions and Imports
- **resizeAndToDataUrl**: Image processing function
- **composeWithGalleryAction**: Gallery functionality
- **getBusinessSnapshot**: Business data function
- **Fix**: Add missing functions and imports

### 5. Firebase Storage CORS Issues
- **setCors Method**: Not available in Firebase Admin SDK
- **Fix**: Remove invalid CORS calls, configure via Firebase Console

## 🚨 RECOMMENDED APPROACH

### Option 1: Start Fresh (RECOMMENDED)
1. **Don't rollback to 0cb9066** - it's incompatible with current versions
2. **Start from current main branch** 
3. **Implement A_ prefix system incrementally**
4. **Test each change before proceeding**

### Option 2: Fix Current State
1. **Keep all the fixes we made** (they're necessary for compatibility)
2. **Implement A_ prefix system on top of current state**
3. **Test thoroughly before deployment**

## Implementation Steps for LLM

1. **Create `src/lib/env-config.ts`** with the configuration system
2. **Update all files** to use the config objects instead of direct `process.env`
3. **Create environment files** with A_ prefixed variables
4. **Test locally** with `USE_A_PREFIX=true`
5. **Deploy to Vercel** with A_ prefixed environment variables
6. **Verify functionality** in development environment

## Testing Checklist
- [ ] Local development works with A_ prefix
- [ ] Vercel deployment succeeds
- [ ] Shopify integration works with dev store
- [ ] Firebase integration works with dev project
- [ ] AI features work with dev API keys
- [ ] No conflicts with production environment

## Files to Never Touch
- `src/ai/flows/` - AI flow files are complex and working
- `src/ai/genkit.ts` - Genkit configuration
- Core business logic files

## Success Criteria
- Development environment works independently
- Production environment unaffected
- All TypeScript errors resolved
- Vercel build succeeds
- All features functional in dev environment
