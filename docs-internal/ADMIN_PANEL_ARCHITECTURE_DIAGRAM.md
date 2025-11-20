# 🏗️ Admin Panel Architecture Diagram
## Complete System Overview

---

## 📊 High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          ADMIN PANEL (Next.js)                           │
│                                                                           │
│  ┌────────────────────────────────────────────────────────────────────┐ │
│  │                     USER INTERFACE LAYER                           │ │
│  │                                                                    │ │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐           │ │
│  │  │   Overview   │  │  Fragrances  │  │   Reviews    │           │ │
│  │  │     Tab      │  │     Tab      │  │     Tab      │  ... more │ │
│  │  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘           │ │
│  │         │                  │                  │                    │ │
│  └─────────┼──────────────────┼──────────────────┼────────────────────┘ │
│            │                  │                  │                      │
│  ┌─────────┼──────────────────┼──────────────────┼────────────────────┐ │
│  │         │    CLIENT LIBRARY (storefront-appsync.ts)               │ │
│  │         │                  │                  │                    │ │
│  │         ▼                  ▼                  ▼                    │ │
│  │  getFeatureFlag()   listFragrances()   getCommunityCreations()   │ │
│  │  setFeatureFlag()   createFragrance()                             │ │
│  │                     updateFragrance()                             │ │
│  │                     deleteFragrance()                             │ │
│  └─────────┬──────────────────┬──────────────────┬────────────────────┘ │
│            │                  │                  │                      │
│            │ Fetch with       │ Fetch with       │ Fetch with           │
│            │ Bearer Token     │ Bearer Token     │ Bearer Token         │
│            │                  │                  │                      │
└────────────┼──────────────────┼──────────────────┼──────────────────────┘
             │                  │                  │
             │                  │                  │
┌────────────┼──────────────────┼──────────────────┼──────────────────────┐
│            │    API ROUTES (Server-Side)         │                      │
│            │                  │                  │                      │
│  ┌─────────▼────────┐  ┌──────▼──────┐  ┌───────▼───────┐             │
│  │ /api/storefront/ │  │ /api/       │  │ /api/         │             │
│  │   feature-flag   │  │ storefront/ │  │ storefront/   │             │
│  │                  │  │ fragrances  │  │ community-    │             │
│  │  GET, POST       │  │             │  │ creations     │             │
│  │                  │  │ GET, POST,  │  │               │             │
│  │ ✅ Verify Token  │  │ PUT, DELETE │  │ GET           │             │
│  │ ✅ Use Admin     │  │             │  │               │             │
│  │    Secret        │  │ ✅ Verify   │  │ ✅ Verify     │             │
│  │                  │  │    Token    │  │    Token      │             │
│  └─────────┬────────┘  └──────┬──────┘  └───────┬───────┘             │
│            │                   │                  │                     │
│            │ GraphQL           │ GraphQL          │ GraphQL             │
│            │ with API Key      │ with API Key     │ with API Key        │
│            │                   │                  │                     │
└────────────┼───────────────────┼──────────────────┼─────────────────────┘
             │                   │                  │
             │                   │                  │
             ▼                   ▼                  ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                    STOREFRONT APPSYNC API (AWS)                          │
│                                                                           │
│  ┌────────────────────────────────────────────────────────────────────┐ │
│  │                      GRAPHQL RESOLVERS                             │ │
│  │                                                                    │ │
│  │  Query.getFeatureFlag  ───┐                                       │ │
│  │  Mutation.setFeatureFlag   │                                       │ │
│  │                            │                                       │ │
│  │  Query.listFragrances   ───┼───┐                                  │ │
│  │  Query.getFragrance        │   │                                  │ │
│  │  Mutation.createFragrance  │   │                                  │ │
│  │  Mutation.updateFragrance  │   │                                  │ │
│  │  Mutation.deleteFragrance  │   │                                  │ │
│  │                            │   │                                  │ │
│  │  Query.getCommunityCreations ──┼───┐                              │ │
│  │                            │   │   │                              │ │
│  └────────────────────────────┼───┼───┼──────────────────────────────┘ │
│                               │   │   │                                │
│                               ▼   ▼   ▼                                │
│  ┌────────────────────────────────────────────────────────────────────┐ │
│  │                      LAMBDA FUNCTIONS                              │ │
│  │                                                                    │ │
│  │  • getFeatureFlagHandler                                          │ │
│  │  • setFeatureFlagHandler                                          │ │
│  │  • listFragrancesHandler                                          │ │
│  │  • createFragranceHandler                                         │ │
│  │  • updateFragranceHandler                                         │ │
│  │  • deleteFragranceHandler                                         │ │
│  │  • getCommunityCreationsHandler                                   │ │
│  │                                                                    │ │
│  └────────────────────────────┬──┬──┬─────────────────────────────────┘ │
│                               │  │  │                                  │
└───────────────────────────────┼──┼──┼──────────────────────────────────┘
                                │  │  │
                                ▼  ▼  ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                          DYNAMODB (Storage)                              │
│                                                                           │
│  ┌──────────────────────┐  ┌──────────────────────┐  ┌───────────────┐ │
│  │   config TABLE       │  │   fragrances TABLE   │  │ preview-jobs  │ │
│  │                      │  │                      │  │     TABLE     │ │
│  │  • feature flags     │  │  • id (PK)          │  │               │ │
│  │  • magic-request-    │  │  • name             │  │  • jobId (PK) │ │
│  │    enabled: true     │  │  • description      │  │  • html       │ │
│  │                      │  │  • quantityOz       │  │  • candleName │ │
│  │                      │  │  • costPerOz        │  │  • isShared   │ │
│  │                      │  │  • status           │  │  • createdAt  │ │
│  │                      │  │  • createdAt        │  │               │ │
│  │                      │  │  • updatedAt        │  │               │ │
│  └──────────────────────┘  └──────────────────────┘  └───────────────┘ │
│                                                                           │
└───────────────────────────────────────────────────────────────────────────┘
```

---

## 🔄 Data Flow: Create Fragrance

```
1. USER ACTION
   │
   │  Admin clicks "Add Fragrance"
   │  Fills form: { name: "Lavender", quantityOz: 64.5, status: "IN_STOCK" }
   │  Clicks "Create"
   │
   ▼

2. CLIENT-SIDE (fragrances.tsx)
   │
   │  → handleSubmit() called
   │  → Validates form data
   │  → Calls createFragrance(input)
   │
   ▼

3. CLIENT LIBRARY (storefront-appsync.ts)
   │
   │  → Gets Firebase ID token from auth.currentUser.getIdToken()
   │  → Makes fetch to /api/storefront/fragrances
   │  → Headers: { Authorization: "Bearer <token>" }
   │  → Body: { input: {...} }
   │
   ▼

4. API ROUTE (route.ts)
   │
   │  → Extracts token from Authorization header
   │  → Calls verifyIdToken(token) via Firebase Admin SDK
   │  → If valid: continues
   │  → If invalid: returns 401 Unauthorized
   │
   │  → Validates input data
   │  → Checks status enum is valid
   │
   │  → Makes GraphQL mutation to AppSync
   │  → Headers: { x-api-key: APPSYNC_API_KEY }
   │  → Body: { query: CREATE_FRAGRANCE, variables: { input } }
   │
   ▼

5. APPSYNC (AWS)
   │
   │  → Receives GraphQL request
   │  → Validates API key
   │  → Routes to createFragranceHandler Lambda
   │
   ▼

6. LAMBDA HANDLER
   │
   │  → Generates unique ID: `fragrance_${timestamp}_${random}`
   │  → Adds createdAt, updatedAt timestamps
   │  → Calls DynamoDB putItem
   │
   ▼

7. DYNAMODB
   │
   │  → Saves item to fragrances table
   │  → Returns success
   │
   ▼

8. RESPONSE CHAIN
   │
   │  Lambda → AppSync → API Route → Client Library → Component
   │
   │  Each level unwraps and passes data:
   │  - Lambda: { id, name, ... }
   │  - AppSync: { data: { createFragrance: { id, name, ... } } }
   │  - API Route: { success: true, data: { id, name, ... } }
   │  - Client Library: returns Fragrance object
   │  - Component: shows success toast, refreshes list
   │
   ▼

9. UI UPDATE
   │
   │  → Toast notification: "Fragrance Created"
   │  → Dialog closes
   │  → Table refreshes with new fragrance
   │  → Stats cards update (Total: +1, In Stock: +1)
```

---

## 🔒 Security Flow

```
┌─────────────────────────────────────────────────────────────────────────┐
│                      SECURITY ARCHITECTURE                               │
└─────────────────────────────────────────────────────────────────────────┘

1. USER LOGIN
   │
   │  User signs in with Firebase Auth
   │  Receives ID Token (JWT) with:
   │  - uid: user's unique ID
   │  - email: user's email
   │  - exp: expiration timestamp
   │  - Custom claims (optional: admin: true)
   │
   ▼

2. TOKEN STORAGE
   │
   │  Token stored in memory by Firebase SDK
   │  Automatically refreshed when expired
   │  Never stored in localStorage (XSS safe)
   │
   ▼

3. REQUEST AUTHENTICATION
   │
   │  Every API request includes:
   │  Authorization: Bearer <ID_TOKEN>
   │
   │  API Route verifies:
   │  ✅ Token signature valid
   │  ✅ Token not expired
   │  ✅ Issuer is Firebase
   │  ✅ User exists in Firebase
   │
   ▼

4. SERVER-SIDE SECRETS
   │
   │  API Route has access to:
   │  • STOREFRONT_APPSYNC_API_KEY (for AppSync)
   │  • STOREFRONT_ADMIN_SECRET (for privileged operations)
   │
   │  These NEVER sent to browser
   │
   ▼

5. APPSYNC CALL
   │
   │  API Route makes request to AppSync with:
   │  x-api-key: APPSYNC_API_KEY
   │
   │  AppSync validates API key
   │  Executes Lambda if valid
   │
   ▼

6. DYNAMODB ACCESS
   │
   │  Lambda has IAM role with permissions
   │  Can read/write specific tables only
   │  Least privilege principle
   │
   ▼

RESULT: Multi-layer security
  - Client: Firebase Auth (user identity)
  - API: Token verification (authentication)
  - AppSync: API Key (authorization)
  - Lambda: IAM Role (AWS permissions)
  - DynamoDB: Fine-grained access control
```

---

## 🎨 Component Hierarchy

```
<AuthWrapper>                              ← Requires user to be logged in
  │
  ├─ <MagicRequestPage>                    ← Page component
  │    │
  │    ├─ <Tabs>                            ← Tab navigation (Desktop)
  │    ├─ <Dropdown>                        ← Tab navigation (Mobile)
  │    │
  │    └─ {activeTab === 'fragrances'}
  │         │
  │         └─ <MagicRequestFragrances>    ← Fragrances management
  │              │
  │              ├─ <Card> Stats
  │              │   ├─ Total Count
  │              │   ├─ In Stock Count
  │              │   └─ Low Stock Count
  │              │
  │              ├─ <Card> Table
  │              │   └─ <Table>
  │              │        ├─ <TableRow> × N
  │              │        │   ├─ Name
  │              │        │   ├─ Description
  │              │        │   ├─ Quantity
  │              │        │   ├─ Cost
  │              │        │   ├─ <Badge> Status
  │              │        │   └─ Actions
  │              │        │        ├─ <Button> Edit
  │              │        │        └─ <Button> Delete
  │              │        
  │              ├─ <Dialog> Create/Edit Form
  │              │   ├─ <Input> Name
  │              │   ├─ <Textarea> Description
  │              │   ├─ <Input> Quantity
  │              │   ├─ <Input> Cost
  │              │   ├─ <Select> Status
  │              │   └─ <Button> Submit
  │              │
  │              └─ <AlertDialog> Delete Confirmation
  │                   ├─ Warning message
  │                   ├─ <Button> Cancel
  │                   └─ <Button> Delete
  │
  └─ {activeTab === 'reviews'}
       │
       └─ <MagicRequestReviews>            ← Manual review queue
            │
            ├─ <Card> Header
            │   ├─ Pending count
            │   └─ <Button> Refresh
            │
            ├─ <Card> × N (Shared Candles)
            │   ├─ Candle name
            │   ├─ Job ID
            │   ├─ Timestamp
            │   ├─ <Badge> Status
            │   └─ Actions
            │        ├─ <Button> Preview
            │        ├─ <Button> Approve
            │        └─ <Button> Reject
            │
            └─ <Dialog> Preview Modal
                 ├─ Metadata (Job ID, timestamp)
                 ├─ HTML render
                 └─ Actions
                      ├─ <Button> Approve
                      └─ <Button> Reject
```

---

## 🔄 State Management

```
┌─────────────────────────────────────────────────────────────────────────┐
│                       STATE FLOW (Fragrances)                            │
└─────────────────────────────────────────────────────────────────────────┘

COMPONENT STATE (fragrances.tsx):

┌──────────────────────────────────────────────────────────────┐
│  const [fragrances, setFragrances] = useState<Fragrance[]>([])│  ← List of fragrances
│  const [loading, setLoading] = useState(true)                 │  ← Loading indicator
│  const [isDialogOpen, setIsDialogOpen] = useState(false)      │  ← Dialog visibility
│  const [editingFragrance, setEditingFragrance] = useState()   │  ← Currently editing
│  const [submitting, setSubmitting] = useState(false)          │  ← Form submission
│  const [formData, setFormData] = useState<FragranceInput>()   │  ← Form values
└──────────────────────────────────────────────────────────────┘

STATE UPDATES:

1. MOUNT (useEffect):
   loading = true → fetch data → fragrances = data → loading = false

2. CREATE:
   User fills form → formData updates → submitting = true → API call
   → success → isDialogOpen = false → loadFragrances() → fragrances updates

3. EDIT:
   User clicks edit → editingFragrance = fragrance → formData = fragrance data
   → isDialogOpen = true → user edits → submitting = true → API call
   → success → isDialogOpen = false → loadFragrances()

4. DELETE:
   User clicks delete → deletingFragrance = fragrance → isDeleteDialogOpen = true
   → user confirms → submitting = true → API call
   → success → isDeleteDialogOpen = false → loadFragrances()

DERIVED STATE:

• Stats (Total, In Stock, Low) calculated from fragrances array
• Empty state shown when fragrances.length === 0
• Table rows mapped from fragrances array
```

---

## 📦 Dependency Graph

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        ADMIN PANEL DEPENDENCIES                          │
└─────────────────────────────────────────────────────────────────────────┘

fragrances.tsx
│
├─ React (hooks: useState, useEffect)
├─ @/components/ui/* (shadcn/ui)
│   ├─ Card
│   ├─ Button
│   ├─ Dialog
│   ├─ AlertDialog
│   ├─ Table
│   ├─ Badge
│   ├─ Input
│   ├─ Textarea
│   ├─ Label
│   └─ Select
│
├─ @/hooks/use-toast
│   └─ Toast notifications
│
├─ @/lib/storefront-appsync
│   ├─ listFragrances()
│   ├─ createFragrance()
│   ├─ updateFragrance()
│   └─ deleteFragrance()
│
└─ lucide-react (icons)
     ├─ Sparkles
     ├─ Plus
     ├─ Pencil
     ├─ Trash2
     └─ Loader2

────────────────────────────────────────────────────────────

storefront-appsync.ts
│
├─ @/lib/firebase
│   └─ auth (for getting ID token)
│
└─ Fetch API (native)
     └─ Calls API routes with Bearer token

────────────────────────────────────────────────────────────

/api/storefront/fragrances/route.ts
│
├─ Next.js (NextRequest, NextResponse)
├─ @/lib/server-auth
│   └─ verifyIdToken() (Firebase Admin SDK)
│
└─ Fetch API (native)
     └─ Calls AppSync GraphQL API
```

---

## 🧩 Integration Points

```
┌─────────────────────────────────────────────────────────────────────────┐
│              ADMIN PANEL ↔ STOREFRONT INTEGRATION                        │
└─────────────────────────────────────────────────────────────────────────┘

SHARED RESOURCES:

1. APPSYNC API
   ├─ Endpoint: k27zfa7alffqzmrgdjnw4pe5oa.appsync-api.us-east-1.amazonaws.com
   ├─ Region: us-east-1
   └─ Used by: BOTH Admin Panel (via proxy) AND Storefront (direct)

2. DYNAMODB TABLES
   ├─ three-girls-and-a-wick-config
   │   └─ Stores feature flags (magic-request-enabled)
   │
   ├─ three-girls-and-a-wick-fragrances
   │   └─ Stores fragrance inventory
   │       ├─ Admin Panel: CRUD operations
   │       └─ Storefront: Read for AI prompt
   │
   └─ three-girls-and-a-wick-preview-jobs
       └─ Stores custom candle jobs
           ├─ Storefront: Creates jobs, marks as shared
           └─ Admin Panel: Queries shared for review

3. FIREBASE AUTH
   ├─ Separate Firebase projects (isolated)
   ├─ Admin Panel: Authenticates admin users
   └─ Storefront: Authenticates customers (separate)

────────────────────────────────────────────────────────────

DATA FLOW:

Admin Panel → Create Fragrance
     ↓
DynamoDB (fragrances table)
     ↓
Storefront AI fetches fragrances
     ↓
Includes in Gemini prompt
     ↓
AI uses fragrance in candle recipe

────────────────────────────────────────────────────────────

Storefront User → Creates custom candle
     ↓
DynamoDB (preview-jobs table)
     ↓
User clicks "Share"
     ↓
isShared = true in DynamoDB
     ↓
Admin Panel queries shared candles
     ↓
Admin approves/rejects
     ↓
Shows in public gallery (future)
```

---

## 🎯 Summary

This architecture provides:

- ✅ **Separation of Concerns:** UI, business logic, API, data storage clearly separated
- ✅ **Security:** Multi-layer authentication and authorization
- ✅ **Scalability:** Serverless architecture can handle growth
- ✅ **Maintainability:** Clear boundaries between components
- ✅ **Type Safety:** TypeScript end-to-end
- ✅ **Testability:** Each layer can be tested independently

All components work together to create a seamless, secure Admin Panel experience! 🎉

---

**Last Updated:** January 2025  
**Version:** 1.0  

