# 🔧 Environment Variables Required

## **Current Environment Variables in Your Codebase**

Based on your code analysis, here are ALL the environment variables you need to set up for your development environment:

### **🛍️ Shopify Variables**
```bash
# Shopify Admin API
SHOPIFY_STORE_URL=your-dev-store.myshopify.com
SHOPIFY_ADMIN_ACCESS_TOKEN=your_dev_admin_access_token

# Shopify Webhook (if using)
SHOPIFY_WEBHOOK_SECRET=your_dev_webhook_secret
```

### **🔥 Firebase Variables (Client-Side)**
```bash
# Firebase Client Configuration (NEXT_PUBLIC_*)
NEXT_PUBLIC_FIREBASE_API_KEY=your_dev_firebase_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-dev-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-dev-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-dev-project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_dev_messaging_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_dev_app_id
```

### **🔥 Firebase Variables (Server-Side)**
```bash
# Firebase Admin SDK
FIREBASE_PROJECT_ID=your-dev-project-id
FIREBASE_STORAGE_BUCKET_ADMIN=your-dev-project.appspot.com
FIREBASE_SERVICE_ACCOUNT={"type":"service_account","project_id":"your-dev-project",...}
```

### **🤖 AI/Genkit Variables**
```bash
# Google AI (Gemini)
GEMINI_API_KEY=your_dev_gemini_api_key
```

### **🌐 App Configuration**
```bash
# App URLs
NEXT_PUBLIC_APP_ORIGIN=https://your-dev-app.vercel.app
NEXT_PUBLIC_STOREFRONT_URL=https://your-dev-storefront.vercel.app

# Authorization
AUTHORIZED_EMAILS=your-email@example.com,admin@example.com
```

## **📋 Complete Development Environment Setup**

### **Step 1: Check Current Vercel Environment Variables**
1. Go to your Vercel dashboard
2. Select your project
3. Go to Settings → Environment Variables
4. Note down all current variables

### **Step 2: Create Development Environment Variables**

You need to create NEW values for your development environment:

#### **🛍️ Shopify Development Store:**
1. Go to [partners.shopify.com](https://partners.shopify.com)
2. Create a new development store
3. Get your store URL (e.g., `my-dev-store.myshopify.com`)
4. Create an Admin API access token
5. Set webhook secret (if using webhooks)

#### **🔥 Firebase Development Project:**
1. Go to [console.firebase.google.com](https://console.firebase.google.com)
2. Create a new project (e.g., `threechicksandawick-dev`)
3. Enable Firestore, Authentication, and Storage
4. Get your Firebase config from Project Settings
5. Create a service account and download the JSON

#### **🤖 Google AI Development:**
1. Go to [console.google.com/ai](https://console.google.com/ai)
2. Create a new API key for development
3. Set appropriate usage limits

### **Step 3: Deploy Development Environment**

#### **Option A: Vercel CLI (Recommended)**
```bash
# Deploy development branch
vercel --prod=false

# Set environment variables
vercel env add SHOPIFY_STORE_URL
vercel env add SHOPIFY_ADMIN_ACCESS_TOKEN
vercel env add NEXT_PUBLIC_FIREBASE_PROJECT_ID
# ... add all variables
```

#### **Option B: Vercel Dashboard**
1. Go to your Vercel project
2. Settings → Environment Variables
3. Add all development variables
4. Make sure to set them for "Development" environment

## **🔍 How to Check What You Currently Have**

### **Check Vercel Environment Variables:**
1. Go to [vercel.com/dashboard](https://vercel.com/dashboard)
2. Select your project
3. Go to Settings → Environment Variables
4. You'll see all current variables

### **Check Local Environment:**
```bash
# Check if you have a .env.local file
cat .env.local

# Or check for any .env files
ls -la .env*
```

## **⚠️ Important Notes**

### **Environment Variable Types:**
- **`NEXT_PUBLIC_*`**: Available in browser (client-side)
- **Regular variables**: Only available on server-side
- **Vercel Environment**: Set in Vercel dashboard or CLI

### **Development vs Production:**
- **Development**: Use your personal Shopify store
- **Production**: Use client's Shopify store (when they pay)
- **Firebase**: Use separate projects for dev/prod
- **AI Keys**: Use separate API keys for dev/prod

### **Security:**
- Never commit `.env` files to git
- Use different credentials for dev/prod
- Set appropriate API limits for development

## **🚀 Quick Start Commands**

```bash
# Check current environment variables
vercel env ls

# Add new environment variable
vercel env add VARIABLE_NAME

# Deploy development environment
vercel --prod=false

# Check deployment logs
vercel logs
```

## **🆘 Troubleshooting**

### **Common Issues:**
1. **"Environment variable not found"**: Check if variable is set in Vercel
2. **"Firebase not initialized"**: Verify Firebase config variables
3. **"Shopify API error"**: Check store URL and access token
4. **"CORS error"**: Update `NEXT_PUBLIC_APP_ORIGIN` with your dev URL

### **Debug Steps:**
1. Check Vercel environment variables
2. Verify Firebase project settings
3. Test Shopify API connection
4. Check browser console for errors
5. Check Vercel function logs

