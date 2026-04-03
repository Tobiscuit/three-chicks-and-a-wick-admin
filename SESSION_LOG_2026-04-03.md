# Session Log — Three Chicks & a Wick Admin Panel
**Date:** April 2–3, 2026  
**Time:** ~10:00 PM → 1:07 AM CDT  
**Author:** Juan Ramirez + Antigravity AI  
**Commit:** `14bcb4c` (admin) / `e68a562a` (storefront)

---

## Problem

The Shopify product type was renamed from `"Magic Request"` to `"Candle Request"` at some point, but the admin panel codebase was never updated. This caused:

- **6 GraphQL queries** filtering by `product_type:Magic Request` → returned 0 results
- **Product creation** wrote `productType: 'Magic Request'` → new products invisible to storefront
- **Order detection** checked `product.title.includes("Magic Request")` → always returned "Standard"
- **Storefront PLP** excluded `"Magic Request"` products → custom candle vessels leaked into listings

---

## What Was Fixed (Deployed & Verified)

### Admin Panel — `Tobiscuit/three-chicks-and-a-wick-admin` @ `main`

| File | Change |
|------|--------|
| `src/services/container-size-management.ts` | GraphQL `product_type` filter → `Candle Request` |
| `src/services/magic-request-pricing.ts` | 3 GraphQL `product_type` filters → `Candle Request` |
| `src/services/magic-request-deployment.ts` | `productType` in product creation → `Candle Request`, tags → `candle-request`, diff query fixed |
| `src/components/orders/order-card.tsx` | Order detection → check `customAttributes._recipe_` instead of title string |
| `src/components/orders/order-columns.tsx` | Same order detection fix (data table view) |
| `src/components/orders/order-details-modal.tsx` | Removed 3 dead `magic request` title fallback checks |
| `src/components/layout/app-sidebar.tsx` | Sidebar label → "Custom Candles" |
| `src/components/layout/header.tsx` | Page title → "Custom Candles" |
| `src/components/magic-request/overview.tsx` | Settings title + 4 toast messages |
| `src/components/magic-request/variants.tsx` | 3 user-facing strings |
| `src/components/magic-request/pricing.tsx` | 1 user-facing string |

**Total: 11 files, 41 insertions, 41 deletions**

### Storefront — `Tobiscuit/three-chicks-and-a-wick` @ `main`

| File | Change |
|------|--------|
| `src/app/product-listings/page.tsx` | PLP exclusion filter → `-product_type:"Candle Request"` |

### Verification

- `admin.threechicksandawick.com` → sidebar shows "Custom Candles" ✅
- Ingredients tab pulls real Shopify data: Paraffin-Soy, Soy, Cotton/Hemp/Wood, Mason Jar 16oz / Metal Tin 8oz ✅
- 12 variant combos, 2 containers, 2×3 wax×wick matrix ✅

---

## Architecture Reference

```
┌──────────────────────────────────────────────────────────┐
│  Admin Panel                                              │
│  Repo: three-chicks-and-a-wick-admin                      │
│  Local: ~/Desktop/threechicksandawick-admin-dev           │
│  Branch: main                                             │
│  Deploy: Vercel → admin.threechicksandawick.com           │
│  Stack: Next.js + Firebase Auth + Shopify GraphQL Admin   │
└──────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────┐
│  Storefront                                               │
│  Repo: three-chicks-and-a-wick                            │
│  Local: ~/Desktop/threechicksandawick/three-chicks-...    │
│  Branch: main                                             │
│  Deploy: AWS Amplify → threechicksandawick.com            │
│  Stack: Next.js + Shopify Storefront API + AppSync        │
│  ⚠️  Lambda functions = LAVA FLOW — don't rename          │
└──────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────┐
│  Orphaned / Stale                                         │
│  ~/Desktop/threechicksandawick-admin-panel = dev-demo     │
│  dev-admin.threechicksandawick.com = separate deployment  │
│  DO NOT use these for production work                     │
└──────────────────────────────────────────────────────────┘
```

---

## TODO — Next Session

### 1. File Rename (Clean Code)
Rename all `magic-request` file/directory names to match the new branding:
```
src/services/magic-request-deployment.ts   → candle-request-deployment.ts
src/services/magic-request-pricing.ts      → candle-request-pricing.ts
src/app/magic-request/                     → src/app/custom-candles/
src/components/magic-request/              → src/components/custom-candles/
src/app/api/storefront/magic-request-config/ → candle-request-config/
```
All imports that reference these files need updating. Safe — Vercel only, no Lambdas.

### 2. Comment Cleanup (~10 instances)
Remaining "Magic Request" in:
- `storefront-appsync.ts` (section headers, error messages)
- `deploy-actions.ts`, `actions.ts`, `pricing-actions.ts`, `ingredients-actions.ts` (JSDoc)
- `custom-candle-deployment.ts` (refactored note)
- `api/storefront/magic-request-config/route.ts` (log prefixes)

### 3. Orders Page Bug (Pre-existing)
Orders shows 0 — Shopify environment variables may not be injected in Vercel runtime.
Check: Vercel → Project Settings → Environment Variables

### 4. `dev-admin.threechicksandawick.com`
This URL serves stale code with "Image Studio" + "Magic Request" sidebar.
Investigate in Vercel dashboard — either update alias or remove.

### 5. Portfolio Case Study — 3 GIF Demos
1. **Custom Candle Builder** — Customer flow: prompt → AI recipe → variant resolution → checkout
2. **Image Studio** — AI product photography pipeline
3. **Dynamic Pricing Engine** — Admin adjusts costs → live preview → Shopify deploy

---

## Known Constraints
- `magic_request` **metafield namespace** is kept — baked into Shopify metafield definitions, renaming requires API migration
- Storefront **Lambda functions** (AppSync resolvers) = lava flow anti-pattern — do NOT rename
- The `_recipe_` custom attribute on line items is the reliable signal for custom candle orders
- Shopify products use both `custom-candle` tag AND `Candle Request` productType
