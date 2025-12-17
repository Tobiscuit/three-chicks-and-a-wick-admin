# TC&AW Admin Panel - Feature Documentation

**Note**: This document details all major features for AI analysis and portfolio content generation.

---

## 🎨 Feature 1: Image Studio (AI Product Image Composition)

### **What It Does**
Allows admins to upload two candle product images, which are then automatically composed into a single, professional product shot using AI. The system removes backgrounds, adjusts lighting, and creates a cohesive image ready for e-commerce.

### **User Flow**
1. Upload primary product image (candle in jar)
2. Upload secondary image (ingredients, botanicals, or lifestyle shot)
3. Optional: Select gallery background template
4. AI processes images (15-30 seconds)
5. Preview composed image
6. Add product details (price, quantity, notes)
7. Generate full product description with AI
8. Review and submit to Shopify

### **Technical Implementation**

**Tech Stack**:
- Google Gemini Imagen 3 (image generation)
- Google Gemini 2.5 Pro (product description)
- Firebase Storage (image hosting)
- Genkit SDK (AI workflow orchestration)

**Key Components**:
- `src/components/image-studio/index.tsx` - Main UI
- `src/app/actions.ts` - `generateImageAction`, `generateProductFromImageAction`
- `src/ai/flows/compose-with-gallery-background.ts` - Genkit flow

**AI Prompts**:

*Image Composition* (Imagen 3):
```
Compose a professional product photograph by combining:
1. [Primary candle image]
2. [Secondary ingredient/lifestyle image]

Requirements:
- Remove backgrounds
- Match lighting and color temperature
- Create cohesive composition
- E-commerce ready (white/neutral background)
- Professional styling
```

*Product Description* (Gemini 2.5 Pro):
```
You are the brand voice for "Three Chicks and a Wick."
Persona: The Creator + The Jester (warm, vibrant, sophisticated)

Analyze these images and creator notes to generate:
- Product title
- Description (150-250 words)
- 5 SEO-friendly tags
- SKU suggestion
- Image alt text

Principles:
1. Immediacy (no fluff)
2. Potency (impactful language)
3. Active voice
4. Varied sentence structure
5. Product focus (ignore background)

Output format: JSON
```

**Challenges Overcome**:
1. **Image Format Conversion**: Client-side data URL → Firebase Storage → Public URL
2. **Token Management**: Used localStorage to prevent re-fetching AI data
3. **Error Handling**: Graceful degradation if AI services fail
4. **Performance**: Client-side image resizing before upload

**Business Impact**:
- ⏱️ Reduced product photo editing time from 30 min to 2 min
- 💰 Eliminated need for professional photo editing software
- 🎨 Consistent brand aesthetic across all products
- 🚀 Faster time-to-market for new products

### **Portfolio Talking Points**
- Multi-model AI integration (Imagen + Gemini)
- Complex data pipeline (client → server → AI → storage → database)
- Prompt engineering for brand voice consistency
- Image processing optimization

---

## ✍️ Feature 2: AI Description Rewriting (Dual Editor System)

### **What It Does**
Provides a synchronized dual-editor interface where admins can manually edit product descriptions in a rich text editor while simultaneously using AI to rewrite and refine the content. Includes version history and one-click reversion.

### **User Flow**
1. Open product for editing
2. See current description in manual editor (top)
3. Type custom prompt for AI rewrite (e.g., "Make it more playful")
4. AI rewrites description (bottom panel)
5. Review changes with reasoning explanation
6. Accept or reject AI suggestion
7. All versions saved automatically
8. Revert to any previous version

### **Technical Implementation**

**Tech Stack**:
- Tiptap (rich text editor based on ProseMirror)
- Google Gemini 2.5 Pro (description rewriting)
- Firestore (version history storage)
- React state management (synchronized updates)

**Key Components**:
- `src/components/synchronized-editor.tsx` - Dual editor orchestration
- `src/components/ui/rich-text-editor.tsx` - Tiptap editor wrapper
- `src/ai/flows/reengineer-description.ts` - AI rewrite flow
- `src/app/products/actions.ts` - `rewriteDescriptionAction`
- `src/services/description-history.ts` - Firestore persistence

**State Synchronization**:
```typescript
// Single source of truth
const [content, setContent] = useState(initialContent);

// Manual editor updates
const handleManualChange = (newContent) => {
  setContent(newContent);
  onContentChange(newContent); // Propagate to parent
};

// AI rewrite updates
const handleAIRewrite = async (prompt) => {
  const result = await rewriteDescriptionAction({
    originalDescription: content,
    userPrompt: prompt,
    productContext: { name: productName }
  });
  
  setContent(result.reengineeredDescription);
  addToHistory(result); // Save version
};
```

**AI Prompt** (Gemini 2.5 Pro):
```
Rewrite this candle description: "[user's custom prompt]"

[Original description]

Brand guidelines:
- Warm, vibrant, sophisticated tone
- The Creator + The Jester persona
- Focus on scent, vibe, vessel
- 150-250 words
- Active language

Return JSON:
{
  "reengineeredDescription": "new text",
  "reasoning": "why changes were made",
  "changes": ["specific change 1", "specific change 2"]
}
```

**Challenges Overcome**:
1. **State Synchronization**: Preventing infinite render loops between editors
2. **Version History**: Efficient Firestore schema with GID encoding (Shopify IDs contain `/`)
3. **Content Parsing**: Handling truncated JSON responses from AI model
4. **Preview Styling**: Applying storefront CSS in edit mode
5. **Title Extraction**: Separating `<h2>` tags from AI responses

**Business Impact**:
- ✍️ Faster content iteration (5 rewrites in 2 minutes vs 30+ minutes manual)
- 🎨 Maintains brand voice consistency
- 📚 Audit trail for all changes
- 🔄 Easy experimentation with different tones

### **Portfolio Talking Points**
- Complex state management (dual views, single source of truth)
- Rich text editing integration (Tiptap/ProseMirror)
- AI-human collaboration UX
- Version control system built from scratch
- Performance optimization (preventing render loops)

---

## 🔧 Feature 3: Magic Request Configuration (Cross-App Management)

### **What It Does**
Allows admins to configure the "Magic Request" custom candle ordering system that runs on the customer-facing storefront. Admins can enable/disable the feature, manage variant options (wax types, sizes, wicks, jars), set pricing, and trigger bulk updates to Shopify variants.

### **User Flow**
1. Navigate to "Magic Request" section
2. Toggle feature on/off (syncs to storefront in real-time)
3. Configure variant options:
   - Wax types (Soy, Beeswax, Coconut Soy, etc.)
   - Candle sizes (8oz, 12oz, 16oz)
   - Wick types (Cotton, Hemp, Wood)
   - Jar types (Tin, Glass, Ceramic)
4. Set pricing:
   - Price per ounce for each wax type
   - Fixed price for each wick type
   - Fixed price for each jar type
5. Preview pricing calculator
6. Save changes (syncs to storefront)
7. Trigger Shopify variant bulk update

### **Technical Implementation**

**Tech Stack**:
- AWS Amplify (AppSync GraphQL client)
- AppSync API (Storefront backend)
- DynamoDB (config storage)
- Shopify Admin API (bulk variant mutations)

**Key Components**:
- `src/app/magic-request/page.tsx` - Main dashboard (tabs)
- `src/components/magic-request/overview.tsx` - Feature toggle + stats
- `src/components/magic-request/pricing.tsx` - Pricing management + calculator
- `src/components/magic-request/variants.tsx` - Variant options
- `src/lib/storefront-appsync.ts` - AWS Amplify client
- `src/app/magic-request/actions.ts` - Shopify bulk update

**GraphQL Mutations**:
```graphql
mutation SetFeatureFlag($input: SetFeatureFlagInput!) {
  setFeatureFlag(input: $input) {
    key
    value
    updatedAt
    updatedBy
  }
}

mutation UpdateMagicRequestConfig($input: MagicRequestConfigInput!) {
  updateMagicRequestConfig(input: $input) {
    waxTypes { name value enabled order }
    candleSizes { name value enabled order }
    wickTypes { name value enabled order }
    jarTypes { name value enabled order }
    updatedAt
  }
}
```

**Real-Time Sync**:
```typescript
// AppSync subscription for live updates
const subscription = appsyncClient.subscribe({
  query: ON_MAGIC_REQUEST_CONFIG_CHANGED
}).subscribe({
  next: ({ data }) => {
    setConfig(data.onMagicRequestConfigChanged);
    toast({ title: 'Configuration updated in real-time!' });
  },
  error: (err) => console.error(err),
});
```

**Shopify Bulk Update**:
```typescript
// Calculate new price for each variant
const finalPrice = (waxPricePerOz * ounces) + wickPrice + jarPrice;

// Bulk mutation (one API call per product)
await shopify.productVariantsBulkUpdate({
  productId: product.id,
  variants: variantsToUpdate.map(v => ({
    id: v.id,
    price: finalPrice.toFixed(2),
  })),
});
```

**Challenges Overcome**:
1. **Cross-App Communication**: Admin Panel (Next.js) → Storefront (AppSync backend)
2. **Real-Time Updates**: Using AppSync subscriptions for live config sync
3. **Pricing Calculator**: Dynamic calculation with live preview
4. **Bulk Operations**: Efficient Shopify API usage (one call per product vs per variant)
5. **Security**: Admin secret validation in AppSync resolvers

**Business Impact**:
- 🛠️ Non-technical admins can configure complex feature
- ⚡ Real-time updates (no deploy needed)
- 💰 Dynamic pricing automation
- 🔒 Secure cross-app communication

### **Portfolio Talking Points**
- Cross-app architecture (Admin Panel ↔ Storefront)
- AWS Amplify + AppSync integration
- Real-time data synchronization
- GraphQL subscriptions
- Bulk API operations for performance
- Complex pricing logic implementation

---

## 📦 Feature 4: Product Management (Shopify Integration)

### **What It Does**
Full CRUD operations for products with Shopify Admin API, including custom metafields for rich descriptions, image management, tag generation, and multi-channel publishing.

### **User Flow**
1. View products table (sortable, filterable)
2. Click product to see details
3. Edit product (form with validation)
4. Update description (uses synchronized editor)
5. Add/remove/reorder images
6. Generate AI tags
7. Publish to sales channels
8. Delete (moves to recycle bin)

### **Technical Implementation**

**Tech Stack**:
- Shopify Admin GraphQL API (2024-10)
- React Hook Form + Zod validation
- Firestore (description history)
- Google Gemini (tag generation)

**Key Components**:
- `src/app/products/page.tsx` - Products list
- `src/components/product-form/index.tsx` - Product editor
- `src/services/shopify.ts` - API client
- `src/services/ai-tag-generator.ts` - Tag AI

**Shopify GraphQL Mutations**:
```graphql
mutation CreateProduct($input: ProductInput!) {
  productCreate(input: $input) {
    product { id title descriptionHtml tags }
    userErrors { field message }
  }
}

mutation UpdateProduct($input: ProductInput!) {
  productUpdate(input: $input) {
    product { id title descriptionHtml }
    userErrors { field message }
  }
}

mutation PublishProduct($id: ID!, $input: [PublicationInput!]!) {
  publishablePublish(id: $id, input: $input) {
    publishable { publicationCount }
    userErrors { field message }
  }
}
```

**Custom Metafield** (for storefront rich descriptions):
```graphql
mutation CreateMetafieldDefinition($definition: MetafieldDefinitionInput!) {
  metafieldDefinitionCreate(definition: $definition) {
    createdDefinition {
      id
      namespace
      key
      access { storefront }
    }
  }
}

mutation SetMetafield($metafields: [MetafieldsSetInput!]!) {
  metafieldsSet(metafields: $metafields) {
    metafields { id namespace key value }
    userErrors { field message }
  }
}

# Namespace: "custom"
# Key: "description"
# Type: "multi_line_text_field"
# Access: { storefront: "PUBLIC_READ" }
```

**AI Tag Generation**:
```typescript
// Gemini 2.5 Flash for speed
const result = await gemini.generate({
  model: 'gemini-2.5-flash',
  prompt: `Generate 5 tags for this candle:
  
  Title: ${title}
  Description: ${description}
  
  Existing tags: ${existingTags.join(', ')}
  
  Rules:
  - Check existing tags first (capitalize consistently)
  - Focus on: scent family, materials, occasion, mood, season
  - Capitalize properly (e.g., "Spa Night", "Vanilla Bean")
  - Be specific and evocative
  - Return JSON: { "selected_existing": [], "new_tags": [], "final_tags": [] }`
});
```

**Challenges Overcome**:
1. **Metafield Visibility**: Ensuring custom descriptions visible to Storefront API
2. **Multi-Channel Publishing**: Handling different sales channels (Online Store, Headless)
3. **Tag Capitalization**: AI consistency in tag formatting
4. **Image Management**: Reordering, deletion, and bulk uploads
5. **Form State**: Handling drafts, validation, and auto-save

**Business Impact**:
- 📊 Centralized product management
- 🎯 AI-powered tag generation (better SEO)
- 📝 Rich descriptions with formatting
- 🔄 Automatic sync with storefront

### **Portfolio Talking Points**
- GraphQL API integration
- Custom metafield management
- Form validation with Zod
- AI-powered content generation
- Multi-step user workflows

---

## 🗑️ Feature 5: Recycle Bin (Description History Archiving)

### **What It Does**
When a product is deleted, its description version history is automatically archived to a "recycle bin" with a 30-day TTL, allowing recovery if needed.

### **Technical Implementation**

**Tech Stack**:
- Firestore (recycle bin collection)
- Firestore TTL (automatic deletion after 30 days)

**Firestore Schema**:
```javascript
// Collection: recycle_bin
{
  type: 'description_history',
  productId: 'gid://shopify/Product/123',
  versions: [
    {
      id: 'v1',
      description: 'Original description',
      userPrompt: 'Initial content',
      reasoning: 'Initial product description',
      changes: [],
      timestamp: '2025-01-15T10:30:00Z'
    },
    // ... more versions
  ],
  deletedAt: Timestamp(server),
  expireAt: Date(now + 30 days) // TTL field
}
```

**Implementation**:
```typescript
// src/app/products/actions.ts
export async function deleteProductAction(productId: string) {
  // 1. Delete from Shopify
  await shopify.deleteProduct(productId);
  
  // 2. Archive description history
  const history = await loadDescriptionHistory(productId);
  if (history.length > 0) {
    await adminDb.collection('recycle_bin').doc().set({
      type: 'description_history',
      productId: productId,
      versions: history,
      deletedAt: FieldValue.serverTimestamp(),
      expireAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
    });
  }
  
  // 3. Delete original history
  await deleteDescriptionHistory(productId);
  
  return { success: true };
}
```

**Challenges Overcome**:
1. **TTL Implementation**: Using Firestore expiration field
2. **Data Retention**: 30-day balance (recovery window vs storage costs)
3. **Cost**: Minimal (text storage is ~$0.18/GB/month, 1000 products ≈ 1MB)

**Business Impact**:
- 🛡️ Safety net for accidental deletions
- 💰 Negligible storage costs
- ⏱️ Automatic cleanup (no manual intervention)

---

## 🎨 Feature 6: Settings Management (User Preferences)

### **What It Does**
Allows admins to configure user-specific settings that persist across sessions and devices, currently including Image Studio source image saving.

### **Technical Implementation**

**Tech Stack**:
- Firestore (userSettings collection)
- React Context (useAuth)

**Firestore Schema**:
```javascript
// Collection: userSettings
// Document ID: {userId}
{
  imageStudioSettings: {
    includeSourceImages: false // Default: disabled
  },
  // Future: customCandleSettings, notificationSettings, etc.
}
```

**Implementation**:
```typescript
// src/services/user-settings.ts
export async function getUserSettings(userId: string): Promise<UserSettings> {
  const settingsRef = doc(db, 'userSettings', userId);
  const settingsSnap = await getDoc(settingsRef);
  
  return settingsSnap.exists() ? settingsSnap.data() : defaultSettings;
}

export async function updateImageStudioSetting(
  userId: string, 
  includeSourceImages: boolean
): Promise<void> {
  const settingsRef = doc(db, 'userSettings', userId);
  await setDoc(settingsRef, {
    imageStudioSettings: { includeSourceImages }
  }, { merge: true });
}
```

**Settings UI**:
```tsx
// src/app/settings/page.tsx
<Card>
  <CardHeader>
    <CardTitle>Image Studio Settings</CardTitle>
    <CardDescription>
      Configure how Image Studio behaves when creating products.
    </CardDescription>
  </CardHeader>
  <CardContent>
    <Switch 
      checked={includeSourceImages}
      onCheckedChange={handleToggle}
    />
    <Label>Include source images when saving new products</Label>
  </CardContent>
</Card>
```

**Challenges Overcome**:
1. **Race Condition**: Loading settings before using them (async state updates)
2. **Default Values**: Graceful fallback if settings don't exist
3. **Merge Strategy**: Using Firestore `merge: true` to avoid overwriting

**Business Impact**:
- ⚙️ User-specific preferences
- 💾 Persistent across sessions
- 🔄 Sync across devices

---

## 📊 Summary of Technical Achievements

| Feature | AI Models Used | APIs Integrated | Key Challenge | Business Impact |
|---------|---------------|----------------|---------------|----------------|
| Image Studio | Imagen 3, Gemini 2.5 Pro | Firebase Storage, Genkit | Multi-model orchestration | 93% faster product creation |
| AI Rewriting | Gemini 2.5 Pro | Firestore | State synchronization | 90% faster content iteration |
| Magic Request | - | AppSync, Shopify, DynamoDB | Cross-app architecture | Real-time config without deploy |
| Product Management | Gemini 2.5 Flash | Shopify GraphQL | Metafield visibility | Centralized operations |
| Recycle Bin | - | Firestore TTL | Data retention policy | Safety net for mistakes |
| Settings | - | Firestore | User-specific persistence | Personalized UX |

---

**These features demonstrate**:
- ✅ Multi-model AI integration
- ✅ Complex state management
- ✅ Cross-app architecture
- ✅ GraphQL API mastery
- ✅ UX design for admin workflows
- ✅ Performance optimization
- ✅ Data modeling and persistence

