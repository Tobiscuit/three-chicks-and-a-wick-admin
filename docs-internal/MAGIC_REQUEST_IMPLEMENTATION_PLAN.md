# Magic Request Implementation Plan
**Project:** Three Chicks and a Wick - Custom Candle AI System  
**Date:** October 6, 2025  
**Status:** Admin Panel UI Complete, Backend Implementation Pending

---

## Executive Summary

Multi-layered AI-powered custom candle ordering system with:
- Dynamic pricing based on material costs (wax/oz × size + modifiers)
- Security validation (Chandler AI → Cybersecurity AI → Human Review)
- Real-time feature toggle (enable/disable via admin panel)
- Centralized configuration management (DynamoDB via AppSync)

---

## Architecture Overview

```
Customer (Storefront)
    ↓ (if feature enabled)
Magic Request Form
    ↓
AppSync GraphQL API
    ↓
Step Functions State Machine
    ↓
├─ State 1: Check Feature Flag
├─ State 2: Validate Input
├─ State 3: Calculate Price (wax/oz × size + wick + jar)
├─ State 4: Chandler AI (Generate Recipe)
├─ State 5: Cybersecurity AI (Validate Output)
├─ State 6: Find Shopify Variant
├─ State 7: Update Variant Price (Bulk Operation)
├─ State 8: Add to Cart
└─ State 9: Save Result to DynamoDB
    ↓
Customer sees toast → redirects to cart → checkout
```

---

## Critical Insight: Pricing Model

### **Formula:**
```
finalPrice = (waxPricePerOz × sizeInOz) + wickPrice + jarPrice
```

### **Why This Matters:**
- Base price is NOT fixed by size alone
- Beeswax costs more per oz than Soy
- A 12oz Beeswax candle has a different base price than a 12oz Soy candle

### **Example:**
```
12oz Beeswax + Wood Wick + Ceramic Jar:
= ($2.50/oz × 12oz) + $2.00 + $8.00
= $30 + $2 + $8
= $40.00

12oz Soy + Wood Wick + Ceramic Jar:
= ($1.50/oz × 12oz) + $2.00 + $8.00
= $18 + $2 + $8
= $28.00
```

**Same size, $12 difference due to wax type!**

---

## Security Architecture

### **Layer 1: Chandler AI**
- **Purpose:** Generate candle recipe from customer's vibe/feeling
- **Input:** User prompt + selections (size, wax, wick, jar)
- **Output:** 
  - Customer-facing recipe (simplified scent profile)
  - Hidden recipe (exact ingredient percentages for business owner)
- **Security:** Structured prompting, JSON schema validation

### **Layer 2: Cybersecurity AI**
- **Purpose:** Validate Chandler AI output for security vulnerabilities
- **Checks:**
  - XSS injection attempts
  - SQL injection patterns
  - Prompt injection/manipulation
  - Hate speech detection
  - Business logic bypass (price manipulation)
- **Output:** APPROVED | SUSPICIOUS | BLOCKED
- **Action:**
  - APPROVED → Auto-process to cart
  - SUSPICIOUS → Human review queue (future)
  - BLOCKED → SNS alert to developer, show in Security Logs

### **Layer 3: Human Review (Future)**
- **Purpose:** Manual validation of edge cases
- **Currently:** Not implemented (auto-approve if APPROVED)
- **Future:** Admin can review SUSPICIOUS orders before processing

---

## Variant Structure

### **Product Organization:**
- **3 Products** (grouped by size to avoid 100-variant limit)
  - Custom Candle - The Spark (8oz)
  - Custom Candle - The Flame (12oz)
  - Custom Candle - The Glow (16oz)

- **Variants per Product:** 3 (wicks) × 4 (jars) × 3 (waxes) = **36 variants**
- **Total Variants:** 36 × 3 = **108 variants**

### **Variant Options (Shopify):**
```
Option 1: Wick Type (Cotton, Hemp, Wood)
Option 2: Jar Type (Standard Tin, Amber Glass, Frosted Glass, Ceramic)
Option 3: Wax Type (Soy, Beeswax, Coconut Soy)
```

### **Variant Matching Logic:**
```typescript
// User selects: 12oz, Wood, Ceramic, Beeswax
// Step Function finds:
Product: custom-candle-flame-12oz
Variant: option1=Wood AND option2=Ceramic AND option3=Beeswax
```

---

## Pricing Update Flow

### **Critical Security Decision: Stored Pricing (Option 2)**

**Why NOT Dynamic Pricing:**
- Customer could manipulate cart quantities to reduce price
- Example: Add 22 items @ $1 each, remove 21, get candle for $1
- Shopify cart shows variant's stored price, not calculated price

**Solution: Update Shopify Variants When Pricing Changes**

### **Bulk Update Process:**

```typescript
// When admin changes Soy price from $1.50/oz to $2.00/oz:

1. Admin Panel saves to DynamoDB config
2. AppSync mutation triggers Lambda: bulkUpdateSoyPricing
3. Lambda:
   a. Queries all 3 custom candle products
   b. Filters variants where option3 = 'Soy' (36 per product)
   c. Recalculates price for each variant
   d. Bulk updates via Shopify GraphQL (3 API calls, one per product)
4. Complete in ~5-10 seconds
5. All Soy variants now show correct prices in Shopify
```

### **API Efficiency:**
- **Not 108 individual calls** ❌
- **3 bulk operations** ✅ (one per product)
- **Uses `productVariantsBulkUpdate` mutation**

---

## Feature Flag System

### **Purpose:**
Enable/disable Magic Request feature without code deployment

### **Flow:**

```
Admin Panel:
  Toggle switch → AppSync mutation → DynamoDB (enableMagicRequest: true/false)

Storefront:
  1. On mount: Check flag via AppSync query
  2. Real-time: Subscribe to flag changes via AppSync subscription
  3. If disabled: Hide "Make Your Own Magic" component
  4. If re-enabled: Show component (no page reload needed)

Backend (Lambda):
  Check flag before processing any Magic Request
  If disabled: Return error 'MAGIC_REQUEST_DISABLED'
```

### **Race Condition Protection:**

**3-Layer Defense:**
1. **Frontend subscription** - Hide form in real-time when disabled
2. **Frontend polling** - Backup check every 30s (optional)
3. **Backend validation** - Authoritative check in Lambda (required)

**Result:** Even if user has form open, backend rejects submission if disabled

---

## Data Models

### **DynamoDB: Config Table**

```javascript
// Feature Flags
{
  "key": "enableMagicRequest",
  "value": true,
  "updatedAt": "2025-10-06T12:00:00Z",
  "updatedBy": "admin@threechicksandawick.com"
}

// Pricing Configuration
{
  "key": "magic_request_pricing",
  "value": {
    "waxPricing": {
      "Soy": { "pricePerOz": 1.50, "enabled": true },
      "Beeswax": { "pricePerOz": 2.50, "enabled": true },
      "Coconut Soy": { "pricePerOz": 2.00, "enabled": true }
    },
    "sizes": [
      { "name": "The Spark", "ounces": 8, "enabled": true, "productHandle": "custom-candle-spark-8oz" },
      { "name": "The Flame", "ounces": 12, "enabled": true, "productHandle": "custom-candle-flame-12oz" },
      { "name": "The Glow", "ounces": 16, "enabled": true, "productHandle": "custom-candle-glow-16oz" }
    ],
    "wickPricing": {
      "Cotton": { "price": 0, "enabled": true },
      "Hemp": { "price": 0.50, "enabled": true },
      "Wood": { "price": 2.00, "enabled": true }
    },
    "jarPricing": {
      "Standard Tin": { "price": 0, "enabled": true },
      "Amber Glass": { "price": 4.00, "enabled": true },
      "Frosted Glass": { "price": 4.00, "enabled": true },
      "Ceramic": { "price": 8.00, "enabled": true }
    }
  },
  "updatedAt": "2025-10-06T12:00:00Z"
}

// Variant Options (Storefront UI)
{
  "key": "magic_request_options",
  "value": {
    "waxTypes": [
      { "name": "Soy", "value": "Soy", "enabled": true, "order": 1 },
      { "name": "Beeswax", "value": "Beeswax", "enabled": true, "order": 2 },
      { "name": "Coconut Soy", "value": "Coconut Soy", "enabled": true, "order": 3 }
    ],
    "candleSizes": [
      { "name": "The Spark", "value": "8oz", "enabled": true, "order": 1 },
      { "name": "The Flame", "value": "12oz", "enabled": true, "order": 2 },
      { "name": "The Glow", "value": "16oz", "enabled": true, "order": 3 }
    ],
    "wickTypes": [
      { "name": "Cotton", "value": "Cotton", "enabled": true, "order": 1 },
      { "name": "Hemp", "value": "Hemp", "enabled": true, "order": 2 },
      { "name": "Wood", "value": "Wood", "enabled": true, "order": 3 }
    ],
    "jarTypes": [
      { "name": "Standard Tin", "value": "Standard Tin", "enabled": true, "order": 1 },
      { "name": "Amber Glass", "value": "Amber Glass", "enabled": true, "order": 2 },
      { "name": "Frosted Glass", "value": "Frosted Glass", "enabled": true, "order": 3 },
      { "name": "Ceramic", "value": "Ceramic", "enabled": true, "order": 4 }
    ]
  },
  "updatedAt": "2025-10-06T12:00:00Z"
}
```

### **DynamoDB: Jobs Table**

```javascript
{
  "jobId": "uuid-here",
  "status": "READY" | "PROCESSING" | "PENDING_REVIEW" | "BLOCKED" | "ERROR",
  "userPrompt": "I want to feel cozy on a rainy day",
  "selections": {
    "size": "12oz",
    "wax": "Soy",
    "wick": "Cotton",
    "jar": "Frosted Glass"
  },
  "calculatedPrice": 26.00,
  "pricingBreakdown": {
    "base": 18.00,
    "baseCalculation": "$1.50/oz × 12oz",
    "wick": 0,
    "jar": 4.00
  },
  "recipe": "<h2>Rainy Day Cozy</h2><p>Scent profile...</p>",
  "hiddenRecipe": {
    "ingredients": [
      { "name": "Vanilla Absolute", "percentage": 40 },
      { "name": "Cedarwood Essential Oil", "percentage": 30 },
      { "name": "Petrichor Accord", "percentage": 20 },
      { "name": "Amber Base", "percentage": 10 }
    ],
    "instructions": "Mix at 185°F, pour at 165°F..."
  },
  "variantId": "gid://shopify/ProductVariant/12345",
  "cartId": "gid://shopify/Cart/abc123",
  "securityFlags": [],
  "risk": "CLEAN",
  "createdAt": 1696608000000,
  "updatedAt": 1696608120000,
  "ttl": 1696694400 // 24hr for READY, 7 days for PENDING_REVIEW
}
```

---

## AppSync Schema (Storefront Backend)

### **Queries:**
```graphql
type Query {
  # Feature flags
  getFeatureFlag(key: String!): FeatureFlag
  getFeatureFlags: [FeatureFlag!]!
  
  # Pricing config
  getMagicRequestPricing: PricingConfig!
  
  # Variant options (for UI)
  getMagicRequestOptions: MagicRequestOptions!
  
  # Existing
  getMagicRequestStatus(jobId: ID!): MagicRequestJob
}
```

### **Mutations:**
```graphql
type Mutation {
  # Feature flags (admin only)
  setFeatureFlag(input: FeatureFlagInput!): FeatureFlag!
  
  # Pricing config (admin only)
  updateMagicRequestPricing(input: PricingConfigInput!): PricingConfig!
  
  # Variant options (admin only)
  updateMagicRequestOptions(input: MagicRequestOptionsInput!): MagicRequestOptions!
  
  # Existing
  startMagicRequest(prompt: String!, selections: SelectionsInput!): MagicRequestJob!
}
```

### **Subscriptions:**
```graphql
type Subscription {
  # Real-time updates for storefront
  onFeatureFlagChanged(key: String!): FeatureFlag
    @aws_subscribe(mutations: ["setFeatureFlag"])
  
  onMagicRequestOptionsChanged: MagicRequestOptions
    @aws_subscribe(mutations: ["updateMagicRequestOptions"])
}
```

---

## Step Functions State Machine

### **States:**

1. **CheckFeatureFlag**
   - Query DynamoDB for `enableMagicRequest`
   - If false → FeatureDisabledState (Fail)
   - If true → ValidateInput

2. **ValidateInput**
   - Check: prompt not empty, selections valid
   - Check: selected options are enabled in config
   - If invalid → FailureState

3. **CalculatePrice**
   - Get pricing config from DynamoDB
   - Calculate: (waxPerOz × size) + wick + jar
   - Return: finalPrice + breakdown

4. **ChandlerAI** (Sequential, not parallel!)
   - Call Gemini with structured prompting
   - Generate customer-facing recipe
   - Generate hidden recipe (ingredients + instructions)
   - Validate JSON schema

5. **CybersecurityAI** (Runs AFTER Chandler)
   - Validate Chandler's output for:
     - XSS patterns
     - Injection attempts
     - Hate speech
     - Prompt manipulation
     - Business logic bypass
   - Return: APPROVED | SUSPICIOUS | BLOCKED

6. **EvaluateSecurityResult** (Choice State)
   - APPROVED → FindShopifyVariant
   - SUSPICIOUS → SavePendingReview (future: human queue)
   - BLOCKED → NotifyDeveloperAndBlock

7. **FindShopifyVariant**
   - Determine product based on size
   - Find variant matching (wick + jar + wax)
   - Return: variantId

8. **UpdateVariantPrice** (Bulk Operation)
   - Update this specific variant's price in Shopify
   - Uses calculated price from State 3
   - Single API call per variant

9. **AddToCart**
   - Create/update customer's cart
   - Add variant with correct price
   - Return: cartId

10. **SaveApprovedJob**
    - Update DynamoDB job status: READY
    - Save: recipe, hiddenRecipe, cartId, variantId, price
    - Customer polls and sees READY

11. **NotifyDeveloperAndBlock** (Parallel)
    - Branch 1: Save to DynamoDB (status: BLOCKED)
    - Branch 2: Publish to SNS (security-alerts topic)
    - Developer gets email with details

---

## Lambda Functions

### **1. checkFeatureFlag**
```javascript
const { data } = await docClient.get({
  TableName: CONFIG_TABLE,
  Key: { key: 'enableMagicRequest' }
});
return { enabled: data.Item?.value || false };
```

### **2. validateInput**
```javascript
// Check prompt
if (!prompt || prompt.length < 10) throw new Error('Invalid prompt');

// Check selections are valid
const options = await getMagicRequestOptions();
if (!options.waxTypes.find(w => w.value === wax && w.enabled)) {
  throw new Error('Invalid wax selection');
}
// ... same for wick, jar, size
```

### **3. calculatePrice**
```javascript
const pricing = await getPricingConfig();
const sizeOz = pricing.sizes.find(s => s.name === size).ounces;
const waxPerOz = pricing.waxPricing[wax].pricePerOz;
const basePrice = waxPerOz * sizeOz;
const wickPrice = pricing.wickPricing[wick].price;
const jarPrice = pricing.jarPricing[jar].price;

return {
  finalPrice: basePrice + wickPrice + jarPrice,
  breakdown: {
    base: basePrice,
    baseCalc: `${waxPerOz}/oz × ${sizeOz}oz`,
    wick: wickPrice,
    jar: jarPrice
  }
};
```

### **4. chandlerAI**
```javascript
const response = await gemini.generateContent({
  model: 'gemini-2.5-flash',
  systemInstruction: CHANDLER_AI_PROMPT,
  generationConfig: {
    responseMimeType: 'application/json',
    responseSchema: CANDLE_RECIPE_SCHEMA
  },
  contents: [{
    role: 'user',
    parts: [{
      text: `User wants: "${prompt}"\nSelections: ${JSON.stringify(selections)}`
    }]
  }]
});

const recipe = JSON.parse(response.text);
return {
  customerRecipe: recipe.customerFacing, // Simplified for customer
  hiddenRecipe: recipe.businessOwner, // Full recipe with percentages
  html: renderRecipeHTML(recipe)
};
```

### **5. cybersecurityAI**
```javascript
const checks = [];

// XSS check
if (/<script|javascript:|onerror=/i.test(chandlerOutput.html)) {
  return { status: 'BLOCKED', reason: 'XSS_DETECTED' };
}

// Hate speech check (using Gemini or external API)
const hateSpeechCheck = await checkForHateSpeech(chandlerOutput.customerRecipe);
if (hateSpeechCheck.detected) {
  return { status: 'BLOCKED', reason: 'HATE_SPEECH' };
}

// Price manipulation check
if (chandlerOutput.suggestedPrice && chandlerOutput.suggestedPrice !== calculatedPrice) {
  checks.push({ type: 'PRICE_MISMATCH', severity: 'MEDIUM' });
  return { status: 'SUSPICIOUS', flags: checks };
}

return { status: 'APPROVED', flags: [] };
```

### **6. findShopifyVariant**
```javascript
const productHandle = {
  'The Spark': 'custom-candle-spark-8oz',
  'The Flame': 'custom-candle-flame-12oz',
  'The Glow': 'custom-candle-glow-16oz'
}[size];

const product = await shopifyAdmin.product.get(productHandle);
const variant = product.variants.find(v =>
  v.option1 === wick &&
  v.option2 === jar &&
  v.option3 === wax
);

return variant;
```

### **7. updateVariantPrice**
```javascript
await shopifyAdmin.productVariant.update(variantId, {
  price: calculatedPrice.toFixed(2)
});
```

### **8. bulkUpdatePricing** (When admin changes pricing)
```javascript
// Triggered when admin updates wax pricing
async function bulkUpdateWaxPricing(waxType, newPricePerOz) {
  const pricing = await getPricingConfig();
  const products = await getCustomCandleProducts();
  
  const bulkUpdates = [];
  
  for (const product of products) {
    const size = getSizeFromProduct(product); // 8, 12, or 16
    const waxVariants = product.variants.filter(v => v.option3 === waxType);
    
    for (const variant of waxVariants) {
      const wick = variant.option1;
      const jar = variant.option2;
      
      const basePrice = newPricePerOz * size;
      const wickPrice = pricing.wickPricing[wick].price;
      const jarPrice = pricing.jarPricing[jar].price;
      const finalPrice = basePrice + wickPrice + jarPrice;
      
      bulkUpdates.push({
        productId: product.id,
        variantId: variant.id,
        price: finalPrice.toFixed(2)
      });
    }
  }
  
  // Group by product and use bulk API
  const groupedByProduct = groupBy(bulkUpdates, 'productId');
  
  await Promise.all(
    Object.entries(groupedByProduct).map(([productId, variants]) =>
      shopifyAdmin.productVariantsBulkUpdate({
        productId,
        variants: variants.map(v => ({ id: v.variantId, price: v.price }))
      })
    )
  );
  
  console.log(`Updated ${bulkUpdates.length} variants in ${Object.keys(groupedByProduct).length} API calls`);
}
```

---

## Admin Panel Components (Completed ✅)

### **1. Magic Request Section** (`/magic-request`)
- **Overview Tab:** Feature toggle, pipeline info, stats
- **Pricing Tab:** Manage wax/oz pricing, sizes, wick/jar pricing
- **Variants Tab:** Manage available options (UI ready, backend pending)
- **Pending Reviews Tab:** Human review queue (placeholder)
- **Security Logs Tab:** Blocked orders audit trail (placeholder)

### **2. AppSync Integration** (`src/lib/storefront-appsync.ts`)
- Apollo Client configured for Storefront's AppSync
- Functions: `setFeatureFlag`, `getMagicRequestConfig`, `updateMagicRequestConfig`
- Admin secret authorization

### **3. User Settings** (`src/services/user-settings.ts`)
- Removed custom candle settings (moved to Magic Request section)
- Only Image Studio settings remain

---

## Storefront Implementation (Pending)

### **Phase 1: AppSync Backend** (Storefront Cursor AI)
1. Add schema extensions for config management
2. Create DynamoDB Config table via Terraform
3. Implement AppSync resolvers:
   - getFeatureFlag / setFeatureFlag
   - getMagicRequestPricing / updateMagicRequestPricing
   - getMagicRequestOptions / updateMagicRequestOptions
4. Add CORS for admin panel domain
5. Set up ADMIN_SECRET environment variable

### **Phase 2: Step Functions** (Storefront Cursor AI)
1. Create state machine definition
2. Implement all Lambda functions (10 total)
3. Set up SNS topics for notifications
4. Deploy via Terraform

### **Phase 3: Frontend Integration** (Storefront Cursor AI)
1. Update MagicRequestForm to fetch options from AppSync
2. Add subscription to feature flag changes
3. Hide/show component based on feature flag
4. Update pricing display to show calculated prices

---

## Environment Variables

### **Admin Panel (.env.local):**
```env
# AppSync (Storefront Backend)
NEXT_PUBLIC_APPSYNC_URL=https://xxx.appsync-api.us-east-1.amazonaws.com/graphql
NEXT_PUBLIC_APPSYNC_API_KEY=da2-xxxxxxxxxxxxx

# Admin Secret (must match storefront)
NEXT_PUBLIC_ADMIN_SECRET=generate-random-32-char-string-here
```

### **Storefront Backend (Terraform):**
```env
# Lambda environment variables
CONFIG_TABLE=three-chicks-and-a-wick-config
PREVIEW_JOBS_TABLE=three-chicks-and-a-wick-preview-jobs
ADMIN_SECRET=same-32-char-string-as-admin-panel

# Existing
GEMINI_API_KEY=...
SHOPIFY_STORE_DOMAIN=...
SHOPIFY_ADMIN_API_TOKEN=...
```

---

## Security Considerations

### **Admin Secret Authorization:**
```typescript
// Every admin mutation includes secret
mutation SetFeatureFlag($input: FeatureFlagInput!) {
  setFeatureFlag(input: {
    key: "enableMagicRequest",
    value: false,
    adminSecret: "your-secret-here" // ← Prevents unauthorized changes
  })
}

// AppSync resolver validates
if (ctx.arguments.input.adminSecret !== ctx.env.ADMIN_SECRET) {
  util.error('Unauthorized', 'Unauthorized');
}
```

### **CORS Configuration:**
```javascript
// AppSync API settings
{
  "cors": {
    "allowOrigins": [
      "https://dev-admin.threechicksandawick.com",
      "https://admin.threechicksandawick.com",
      "https://dev.threechicksandawick.com",
      "https://threechicksandawick.com"
    ]
  }
}
```

### **Rate Limiting:**
- AppSync: 1000 requests/second default
- DynamoDB: On-demand pricing (auto-scales)
- Step Functions: 1000 concurrent executions

---

## Customer-Facing Recipe Strategy

### **What Customer Sees:**
```html
<h2>Rainy Day Cozy</h2>
<p>A warm embrace of vanilla and cedarwood with hints of fresh rain.</p>
<p><strong>Scent Profile:</strong> Warm, Earthy, Comforting</p>
<p><strong>Burn Time:</strong> ~60 hours</p>
<p><strong>Best For:</strong> Cozy evenings, reading, relaxation</p>
```

### **What Business Owner Sees (Hidden):**
```json
{
  "ingredients": [
    { "name": "Vanilla Absolute", "percentage": 40, "supplier": "Supplier A" },
    { "name": "Cedarwood Essential Oil", "percentage": 30, "supplier": "Supplier B" },
    { "name": "Petrichor Accord", "percentage": 20, "supplier": "Supplier C" },
    { "name": "Amber Base", "percentage": 10, "supplier": "Supplier D" }
  ],
  "mixingInstructions": "Heat wax to 185°F. Add fragrance oils at 165°F. Stir for 2 minutes. Pour at 160°F.",
  "curingTime": "48 hours",
  "wickSize": "Cotton #6",
  "estimatedCost": "$12.50",
  "profitMargin": "54%"
}
```

**Customer gets vibe, owner gets recipe!** ✅

---

## Testing Plan

### **Unit Tests:**
1. Pricing calculation accuracy
2. Variant matching logic
3. Security validation (XSS, injection, hate speech)
4. Admin secret authorization

### **Integration Tests:**
1. End-to-end Magic Request flow
2. Feature flag toggle (disable mid-request)
3. Bulk pricing updates
4. AppSync mutation authorization

### **Security Tests:**
1. XSS injection attempts
2. Prompt injection attacks
3. Price manipulation attempts
4. SQL injection in prompts
5. Admin secret bypass attempts

---

## Deployment Strategy

### **Phase 1: Infrastructure** (Week 1)
- Create DynamoDB Config table
- Deploy Step Functions state machine
- Implement all Lambda functions
- Set up SNS topics

### **Phase 2: Backend Integration** (Week 2)
- AppSync schema updates
- Resolver implementations
- Feature flag management
- Config management APIs

### **Phase 3: Frontend Integration** (Week 3)
- Admin Panel: Complete (already done!)
- Storefront: Update form to fetch config
- Storefront: Add subscriptions for real-time updates
- Testing and bug fixes

### **Phase 4: Security** (Week 4)
- Penetration testing
- Security validation
- Load testing
- Production deployment

---

## Cost Estimate (Monthly, 1000 custom candle orders)

- **Step Functions:** $0.025 × 9 states × 1000 = $0.225
- **Lambda:** ~$0.20 (compute + invocations)
- **DynamoDB:** ~$1.00 (reads/writes)
- **AppSync:** ~$4.00 (queries/mutations)
- **SNS:** $0.00 (first 1000 free)
- **Shopify API:** Free (within limits)

**Total:** ~$5.50/month for 1000 orders

---

## Risk Mitigation

### **Cart Manipulation Prevention:**
- ✅ Store real prices in Shopify variants (not placeholders)
- ✅ Update variant prices via bulk operations when config changes
- ✅ Customer cannot reduce price by changing quantity

### **AI Security:**
- ✅ Chandler AI: Structured prompting prevents most issues
- ✅ Cybersecurity AI: Catches edge cases
- ✅ Human review: Available for SUSPICIOUS orders (future)
- ✅ Audit trail: All decisions logged

### **Business Logic:**
- ✅ Pricing rules in DynamoDB (admin-controlled)
- ✅ Variant matching prevents incorrect pricing
- ✅ Step Functions ensure all steps complete or fail atomically

---

## Future Enhancements

1. **Human Review Queue**
   - UI for SUSPICIOUS orders
   - Approve/reject workflow
   - Edit recipe before approval

2. **Analytics Dashboard**
   - Most popular combinations
   - Revenue by wax type
   - Security event trends

3. **A/B Testing**
   - Test different pricing strategies
   - Optimize conversion rates

4. **Promotional Pricing**
   - Holiday discounts
   - Bulk order pricing
   - Loyalty rewards

---

## Key Decisions Made

### ✅ **Pricing Model:**
- Formula: `(waxPerOz × size) + wick + jar`
- Base price varies by wax type AND size
- Admin can update pricing without code changes

### ✅ **Variant Updates:**
- Use bulk operations (3 API calls, not 108)
- Update Shopify variants when pricing changes
- Prevents cart manipulation

### ✅ **Security Pipeline:**
- Sequential: Chandler AI → Cybersecurity AI
- NOT parallel (Cybersec must check Chandler's output)
- Auto-approve APPROVED, block BLOCKED, queue SUSPICIOUS

### ✅ **Feature Toggle:**
- Real-time via AppSync subscriptions
- Backend validation as safety net
- Hides UI when disabled

### ✅ **Recipe Visibility:**
- Customer sees simplified scent profile
- Business owner sees full recipe with percentages
- Trade secrets protected

---

## Questions to Resolve

1. **Admin Secret Value:** Need to generate and share between projects
2. **AppSync URL/Key:** Need values from Storefront Amplify environment
3. **SNS Email:** What email for security alerts?
4. **SUSPICIOUS Orders:** Auto-approve for now, or implement review queue immediately?

---

## Next Steps

### **Admin Panel (Complete!):**
- ✅ UI for feature toggle
- ✅ UI for pricing configuration
- ✅ UI for variant options management
- ✅ AppSync client configured
- ⏳ Waiting for storefront backend

### **Storefront (Pending):**
- ⏳ Implement AppSync schema extensions
- ⏳ Create DynamoDB Config table
- ⏳ Implement AppSync resolvers
- ⏳ Deploy Step Functions
- ⏳ Update frontend to use config

---

## References

- Step Functions ASL: `CUSTOM_CANDLE_STEP_FUNCTION_ARCHITECTURE.md`
- Admin-Storefront Integration: `ADMIN_STOREFRONT_INTEGRATION.md`
- Security Architecture: `CUSTOM_CANDLE_AI_SECURITY_ARCHITECTURE.md`
- Tag Generation: `tag-generation-flow.md`

---

**End of Implementation Plan**

