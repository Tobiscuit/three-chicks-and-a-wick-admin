# TC&AW Admin Panel - Technical Architecture

**Note**: This document consolidates architecture information from the entire codebase for AI analysis. Some details are gitignored and not public.

---

## 🏗️ System Overview

The **Three Chicks & a Wick Admin Panel** is a Next.js 15 application that provides a secure, AI-powered interface for managing a Shopify-based candle e-commerce business. It integrates with Firebase, Shopify, Google Gemini AI, and a custom headless storefront.

### **Tech Stack**
- **Framework**: Next.js 15 (App Router, Server Actions, React Server Components)
- **Language**: TypeScript (strict mode)
- **Authentication**: Firebase Auth + Google OAuth SSO
- **Authorization**: Email-based RBAC (Role-Based Access Control)
- **Database**: Firestore (user settings, description history, recycle bin)
- **Storage**: Firebase Storage (product images, gallery backgrounds)
- **E-commerce**: Shopify Admin GraphQL API
- **AI**: Google Gemini 2.5 Pro/Flash (via Genkit + direct API)
- **Styling**: Tailwind CSS + shadcn/ui components
- **Cross-App Communication**: AWS Amplify + AppSync GraphQL

---

## 🔐 Authentication & Authorization Architecture

### **Two-Layer Security Model**

#### **Layer 1: Authentication (Google OAuth)**
- Users sign in with Google SSO via Firebase Authentication
- Firebase handles all cryptographic token verification
- Zero password storage in the application
- Automatic 2FA if user has it enabled on Google account

#### **Layer 2: Authorization (Email Whitelist)**
- `NEXT_PUBLIC_AUTHORIZED_EMAILS` environment variable contains comma-separated list
- Client-side checks for UI rendering (`AuthWrapper` component)
- Server-side checks in API routes and Server Actions
- Unauthorized users see "Access Denied" page

**Why This Approach?**
- ✅ Professional and industry-standard (same as GitHub, AWS Console)
- ✅ Delegates security to Google's infrastructure
- ✅ Simple to manage for small teams (2 users)
- ✅ Easy to explain in interviews
- ✅ Scalable with Firebase Custom Claims if needed

---

## 🗂️ Project Structure

```
src/
├── app/                          # Next.js App Router
│   ├── actions.ts               # Main server actions (image AI, product generation)
│   ├── layout.tsx               # Root layout (metadata, auth provider)
│   ├── page.tsx                 # Home page (Image Studio)
│   ├── products/                # Product management
│   │   ├── actions.ts          # Product CRUD, description history
│   │   ├── page.tsx            # Products list
│   │   ├── [id]/               # Product details
│   │   └── new/                # Create product
│   ├── magic-request/           # Cross-app configuration
│   │   ├── actions.ts          # Shopify variant bulk updates
│   │   └── page.tsx            # Magic Request dashboard
│   ├── settings/                # User settings
│   └── api/                     # API routes
│       └── sse/inventory/      # Server-Sent Events for real-time updates
│
├── components/
│   ├── auth/                    # Authentication components
│   │   ├── auth-provider.tsx  # Firebase Auth context
│   │   ├── auth-wrapper.tsx   # Authorization guard
│   │   └── login-page.tsx     # Google SSO login
│   ├── layout/                  # Layout components
│   │   └── app-sidebar.tsx    # Navigation sidebar
│   ├── image-studio/            # AI image composition
│   ├── product-form/            # Product creation/editing
│   ├── synchronized-editor.tsx  # Dual editor (manual + AI rewriter)
│   ├── magic-request/           # Magic Request UI components
│   │   ├── overview.tsx        # Feature toggle, stats
│   │   ├── pricing.tsx         # Pricing management
│   │   └── variants.tsx        # Variant options management
│   └── ui/                      # shadcn/ui components
│
├── ai/
│   ├── genkit.ts               # Genkit configuration
│   └── flows/                   # AI flows
│       ├── compose-with-gallery-background.ts  # Image composition
│       ├── generate-custom-candle-background.ts
│       ├── refine-generated-background-with-context.ts
│       ├── reengineer-description.ts  # Description rewriting
│       └── generate-business-strategy.ts
│
├── services/
│   ├── shopify.ts              # Shopify Admin API client
│   ├── ai-tag-generator.ts     # AI-powered tag generation
│   ├── description-history.ts  # Firestore history service
│   └── user-settings.ts        # User preferences
│
├── lib/
│   ├── firebase.ts             # Client-side Firebase init
│   ├── firebase-admin.ts       # Server-side Firebase Admin SDK
│   ├── storefront-appsync.ts   # AWS Amplify AppSync client
│   └── env-config.ts           # Environment variable management
│
└── styles/
    └── ai-content.css          # Scoped styling for AI-generated content
```

---

## 🔄 Data Flow Architecture

### **Image Studio Flow**
```
User uploads 2 images
  ↓
ResizeAndToDataUrl (client)
  ↓
generateImageAction (server action)
  ↓
Gemini Imagen 3 API (via Genkit)
  ↓
Composed image returned
  ↓
AddProductModal (user fills details)
  ↓
generateProductFromImageAction
  ↓
Gemini 2.5 Pro (product description, tags, etc.)
  ↓
stashAiGeneratedProductAction
  ↓
Upload to Firebase Storage
  ↓
Save draft to Firestore (aiProductDrafts)
  ↓
Navigate to /products/new?draftToken=xyz
  ↓
Product form pre-filled with AI data
  ↓
User reviews/edits
  ↓
Submit to Shopify + save to Firestore history
```

### **AI Description Rewriting Flow**
```
User types in manual editor (Tiptap rich text)
  ↓
SynchronizedEditor manages shared state
  ↓
User clicks "AI Rewrite" button
  ↓
rewriteDescriptionAction (server action)
  ↓
Gemini 2.5 Pro with brand voice prompt
  ↓
JSON response: { reengineeredDescription, reasoning, changes }
  ↓
Parse and display in UI
  ↓
Save to Firestore history (versioning)
  ↓
User can revert to any previous version
```

### **Product Lifecycle**
```
AI Draft → Product Form → Shopify Product → Update Description → History Tracking → Delete (Recycle Bin)
```

### **Magic Request Configuration Flow**
```
Admin Panel (this app)
  ↓
Admin updates pricing/variants/toggle
  ↓
AWS Amplify GraphQL client
  ↓
AppSync API (Storefront backend)
  ↓
DynamoDB (config storage)
  ↓
Real-time updates via subscriptions
  ↓
Custom Storefront displays Magic Request UI
```

---

## 🧩 Key Integrations

### **1. Firebase Integration**

#### **Client-Side (Firebase JS SDK)**
- **Auth**: Google SSO, session management
- **Firestore**: Description history, user settings (client queries)
- **Storage**: Image uploads (client-side)

#### **Server-Side (Firebase Admin SDK)**
- **Firestore**: CRUD operations for history, drafts, settings
- **Storage**: Image uploads from server actions
- **Auth**: Token verification (if needed for API routes)

**Bucket Naming**:
- Uses `.firebasestorage.app` domain (new standard)
- Falls back to `.appspot.com` if needed
- Configured via `FIREBASE_STORAGE_BUCKET_ADMIN`

### **2. Shopify Integration**

**GraphQL API**:
- Admin API version 2024-10
- Queries: `GET_PRODUCTS`, `GET_PRODUCT_BY_ID`
- Mutations: `CREATE_PRODUCT`, `UPDATE_PRODUCT`, `DELETE_PRODUCT`, `productVariantsBulkUpdate`

**Product Publishing**:
- Publishes to "Online Store" and "Threechicksandawick Dev Headless" channels
- Uses `publicationCreate` mutation
- Handles both `descriptionHtml` (standard) and custom metafield

**Metafield Architecture**:
- Namespace: `custom`
- Key: `description`
- Type: `multi_line_text_field`
- Access: `storefront: PUBLIC_READ` (for headless storefront)

### **3. AI Integration (Google Gemini)**

**Genkit Flows** (older flows, being phased out):
- `composeWithGalleryBackgroundFlow`
- `generateCustomCandleBackgroundFlow`
- `refineGeneratedBackgroundWithContextFlow`

**Direct Gemini API** (newer approach):
- `generateProductFromImageAction`: Product description generation
- `reengineeredDescriptionFlow`: Description rewriting
- `generateTagsFromProductInfo`: AI tag generation

**Model Selection**:
- **Imagen 3**: Image composition
- **Gemini 2.5 Pro**: High-quality text generation (descriptions, reasoning)
- **Gemini 2.5 Flash**: Fast tag generation

**Prompt Engineering**:
- Brand voice defined as "The Creator + The Jester"
- Principles: Immediacy, Potency, Active Language, Flow, Structured Highlights
- JSON schema for structured outputs

### **4. AWS Amplify + AppSync**

**Purpose**: Admin Panel communicates with Storefront backend

**Configuration**:
- `NEXT_PUBLIC_APPSYNC_URL`: GraphQL endpoint
- `NEXT_PUBLIC_APPSYNC_API_KEY`: API key authentication
- `NEXT_PUBLIC_ADMIN_SECRET`: Mutation authorization

**Operations**:
- `getFeatureFlag`: Fetch feature toggle state
- `setFeatureFlag`: Enable/disable Magic Request
- `getMagicRequestConfig`: Load variant options, pricing
- `updateMagicRequestConfig`: Update configuration

**Security**:
- API Key for queries (read-only)
- Admin Secret for mutations (write operations)
- Real-time subscriptions for live updates

---

## 🎨 UI/UX Architecture

### **Design System**
- **Component Library**: shadcn/ui (Radix UI primitives)
- **Styling**: Tailwind CSS with custom theme
- **Icons**: Lucide React
- **Forms**: react-hook-form + Zod validation
- **Toasts**: Sonner toast notifications

### **Key UI Patterns**

#### **Dual Editor (SynchronizedEditor)**
- Manual rich text editor (Tiptap) on top
- AI rewriter display below
- Shared state synchronization
- Version history panel
- Preview mode with storefront styling

#### **Image Studio**
- Drag-and-drop image upload
- Real-time preview
- Progress indicators
- Modal workflow

#### **Product Form**
- Auto-save drafts to localStorage
- AI data prefill from query params
- Conditional rendering (edit vs create)
- Image gallery with reordering

---

## 📊 State Management

### **Client State**
- React `useState`/`useReducer` for component state
- `localStorage` for draft persistence
- `useRef` for render optimization
- Custom hooks for auth, toasts

### **Server State**
- Next.js Server Actions for mutations
- Firestore queries via Firebase Admin SDK
- No external state management library (Redux, Zustand)

### **Real-Time Updates**
- AppSync subscriptions for Magic Request config
- Server-Sent Events for inventory updates (if needed)

---

## 🔒 Security Architecture

### **Authentication Flow**
```
User clicks "Sign in with Google"
  ↓
Firebase Auth initiates OAuth flow
  ↓
User authenticates with Google
  ↓
Firebase returns ID token
  ↓
Client stores token (httpOnly cookie)
  ↓
Check email against NEXT_PUBLIC_AUTHORIZED_EMAILS
  ↓
If authorized: Show admin panel
  ↓
If unauthorized: Show "Access Denied"
```

### **Server-Side Protection**
- All Server Actions check `auth.currentUser`
- API routes verify Firebase ID tokens
- Environment variables for sensitive config
- No secrets in client-side code

### **Data Protection**
- Firestore Security Rules (not in this codebase)
- Storage bucket rules (not in this codebase)
- CORS configuration for API access
- Input validation with Zod schemas

---

## 🚀 Performance Optimizations

### **Image Handling**
- Client-side image resizing before upload
- Data URLs for preview (no server roundtrip)
- Firebase Storage CDN for serving images

### **Code Splitting**
- Next.js automatic code splitting
- Dynamic imports for heavy components
- Tree shaking for unused code

### **Caching**
- Next.js build-time static generation
- Shopify API response caching (where applicable)
- Firebase Firestore caching

---

## 🧪 Error Handling

### **Patterns**
- Try-catch blocks in all async operations
- User-friendly error messages via toasts
- Fallback UI for failed operations
- Logging for debugging (console.log, console.error)

### **Recovery Strategies**
- Retry logic for API calls (implicit in libraries)
- Fallback to default config if AppSync fails
- Graceful degradation (e.g., AI features offline)

---

## 📈 Scalability Considerations

### **Current Limitations** (2-user system)
- Email whitelist is manual
- No role hierarchy
- Single Firebase project

### **Future Enhancements**
- Firebase Custom Claims for roles (owner, admin, editor, viewer)
- Multi-tenancy for multiple stores
- Webhook-based real-time updates
- CDN for static assets

---

## 🔗 Cross-Project Architecture

### **Admin Panel ↔ Storefront Communication**

**Admin Panel (this app)**:
- Manages Magic Request configuration
- Sets pricing rules
- Enables/disables feature

**Storefront (separate app)**:
- Displays Magic Request UI to customers
- Reads config from AppSync
- Processes orders
- Runs security validation (Cybersecurity AI)

**Integration Points**:
- AppSync GraphQL API (shared backend)
- DynamoDB (shared config storage)
- Step Functions (order processing pipeline)

---

## 📝 Development Workflow

### **Environment Management**
- `.env.local` for local development
- Vercel environment variables for deployment
- A_ prefix system for dev environment isolation (optional)

### **Deployment**
- Git push to `dev-environment` branch
- Vercel auto-deploys to staging
- Production deployment TBD

### **Code Quality**
- TypeScript strict mode
- ESLint + Prettier (configured via Next.js)
- Component-level error boundaries (implicit in Next.js 15)

---

## 🎯 Key Technical Achievements

1. **AI Integration**: Multi-model Gemini integration with sophisticated prompt engineering
2. **Security**: Professional OAuth + RBAC implementation
3. **Cross-App Communication**: AWS Amplify + AppSync for real-time config sync
4. **Rich Text Editing**: Dual editor with version history and storefront preview
5. **Shopify Integration**: Full CRUD with metafield management and bulk operations
6. **Image Processing**: Client-side optimization + AI composition
7. **Type Safety**: End-to-end TypeScript with Zod validation
8. **Performance**: Optimized data fetching and caching strategies

---

**This architecture demonstrates:**
- ✅ Full-stack development capability
- ✅ Security awareness and best practices
- ✅ AI/ML integration expertise
- ✅ Modern React patterns and Next.js features
- ✅ API design and integration skills
- ✅ Scalability and maintainability considerations

