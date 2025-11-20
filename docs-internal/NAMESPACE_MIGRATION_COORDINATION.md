# 🚨 **URGENT: Namespace Migration Coordination**

## **What Changed & Why**

### **The Problem:**
Shopify AI reviewed our pricing implementation and identified a critical issue:
- We were using `mr.*` namespace (2 characters) for pricing metafields
- **Shopify requires metafield namespaces to be 3+ characters**
- This means new metafield definitions using `mr.*` would fail
- We already have `magic_request.*` (13 chars) for ingredient metafields

### **The Solution:**
Migrated all **pricing metafields** from `mr.*` to `magic_request.*` namespace for consistency and compliance.

---

## **What Metafields Changed**

### **Before (mr.* namespace):**
```
Product-level:
- mr.sizeOz
- mr.vesselBaseCostCents
- mr.marginPct

Variant-level:
- mr.waxPricePerOzCents
- mr.wickCostCents
```

### **After (magic_request.* namespace):**
```
Product-level:
- magic_request.sizeOz
- magic_request.vesselBaseCostCents
- magic_request.marginPct

Variant-level:
- magic_request.waxPricePerOzCents
- magic_request.wickCostCents
```

### **Unchanged (kept as mr.* for now):**
```
Product-level:
- mr.supplier (legacy, not critical)
- mr.deploymentVersion (legacy, not critical)

Variant-level:
- mr.enabled (legacy, used by deployment logic)
```

---

## **Impact Assessment Needed from Storefront**

### **⚠️ CRITICAL QUESTIONS:**

1. **Does the Storefront read pricing metafields?**
   - Does `/api/magic/resolve-variant` read `mr.waxPricePerOzCents`, `mr.wickCostCents`, etc.?
   - Or does it just get the price from `variant.price` directly?

2. **Does the Storefront use ingredient metafields?**
   - Does it read `magic_request.waxTypes`, `magic_request.wickTypes`, `magic_request.containerType`?
   - These are already using `magic_request.*` namespace (not affected)

3. **Does the Storefront calculate prices?**
   - Or does it just display the price from the resolved variant?

4. **Where does the Storefront get pricing data?**
   - From Shopify variant prices directly?
   - From AppSync/GraphQL?
   - From Shopify metafields?
   - From Lambda/Step Functions?

---

## **Migration Plan (Pending Storefront Response)**

### **Option A: Storefront DOESN'T read pricing metafields**
✅ **Safe to proceed immediately**
- Storefront gets prices from `variant.price` (which we update via Admin Panel)
- No code changes needed in Storefront
- Migration script will populate both namespaces during transition

### **Option B: Storefront DOES read pricing metafields**
🔄 **Coordinated migration needed**
- Storefront must update queries to use `magic_request.*` namespace
- We'll maintain backward compatibility (check both namespaces) during transition
- Migration timeline to coordinate

---

## **What We've Already Implemented (Admin Panel)**

### **✅ Backward Compatibility:**
- All queries check BOTH namespaces during migration:
  ```graphql
  mrSizeOz: metafield(namespace: "magic_request", key: "sizeOz") { value }
  mrSizeOzLegacy: metafield(namespace: "mr", key: "sizeOz") { value }
  ```
- Code uses: `product.mrSizeOz?.value || product.mrSizeOzLegacy?.value`

### **✅ Migration Script:**
- `docs-internal/setup-magic-request-metafields.mjs` migrates existing `mr.*` metafields to `magic_request.*`
- Can run safely (doesn't delete old metafields)

### **✅ New Deployments:**
- Admin Panel now writes to `magic_request.*` namespace only
- Old `mr.*` metafields remain (backward compatible during transition)

---

## **Recommendations**

### **If Storefront doesn't use pricing metafields:**
1. ✅ Run migration script to populate `magic_request.*` namespace
2. ✅ Keep `mr.*` metafields (no need to delete)
3. ✅ Admin Panel continues writing to `magic_request.*` only
4. ✅ No Storefront changes needed

### **If Storefront DOES use pricing metafields:**
1. 🔄 Storefront updates queries to use `magic_request.*` namespace
2. 🔄 Storefront adds fallback to `mr.*` during transition
3. 🔄 Run migration script to populate `magic_request.*` namespace
4. 🔄 Test end-to-end (Storefront → Admin Panel → Shopify)
5. 🔄 After validation, Storefront removes `mr.*` fallback
6. 🔄 Optional: Delete old `mr.*` metafields (cleanup)

---

## **Next Steps**

1. **Storefront Team:** Please answer the critical questions above
2. **Once confirmed:** We'll coordinate the migration timeline
3. **Testing:** Test variant resolution and pricing display after migration
4. **Documentation:** Update any shared docs with new namespace

---

## **Files Changed (Admin Panel)**

- `src/services/magic-request-pricing.ts` - Updated queries and mutations
- `src/services/magic-request-deployment.ts` - Updated to write `magic_request.*`
- `docs-internal/setup-magic-request-metafields.mjs` - Migration script
- All changes include backward compatibility fallbacks

---

## **Questions for Shopify AI**

1. Can we safely write to both `mr.*` and `magic_request.*` namespaces simultaneously?
2. Are there any performance implications of querying both namespaces?
3. Should we delete old `mr.*` metafields after migration, or keep them for historical reference?

---

**Status:** ✅ **BOTH TEAMS COMPLETE - Ready for Migration Execution**

## **Final Migration Status**

### **✅ Admin Panel (COMPLETE):**
- ❌ **ALL `mr.*` references removed**
- ✅ **All metafields now use `magic_request.*` namespace**
- ✅ **No backward compatibility code**
- ✅ **Migration script updated to migrate ALL metafields**
- ✅ **Seed script updated**

### **✅ Storefront (COMPLETE):**
- ❌ **ALL `mr.*` references removed**
- ✅ **All queries use `magic_request.*` namespace only**
- ✅ **Backward compatibility code removed**
- ✅ **Code simplified and clean**

### **🚀 Next Steps:**
1. **Run migration script:** `docs-internal/setup-magic-request-metafields.mjs` ⚠️ **REQUIRED BEFORE STOREFRONT DEPLOYMENT**
2. **Verify metafields in Shopify:** Confirm `magic_request.*` metafields exist
3. **Test Admin Panel:** Verify pricing updates work
4. **Deploy Storefront:** After migration script completes successfully
5. **End-to-end test:** Full flow from Admin Panel → Shopify → Storefront
6. **Monitor:** Watch for errors and verify pricing accuracy

### **📋 Deployment Order:**
1. **Admin Panel Team:** Run migration script → Verify → Test
2. **Storefront Team:** Wait for migration → Deploy → Test
3. **Both Teams:** End-to-end verification → Monitor

See `docs-internal/NAMESPACE_MIGRATION_FINAL_STATUS.md` for complete details.

**Created:** 2025-01-XX  
**Owner:** Admin Panel Team  
**Reviewers:** Storefront Team, Shopify AI

