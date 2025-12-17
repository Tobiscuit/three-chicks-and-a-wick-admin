# A_ Prefixed Environment Variables Template

## **How to Use A_ Prefixed Variables**

Set `USE_A_PREFIX=true` in your environment to use A_ prefixed variables instead of the original ones.

## **Environment Variables to Set**

### **For Your New Store (A_ Prefixed):**

```bash
# Toggle to use A_ prefixed variables
USE_A_PREFIX=true

# Shopify - Your New Store
A_SHOPIFY_STORE_URL=your-new-store.myshopify.com
A_SHOPIFY_ADMIN_ACCESS_TOKEN=your_new_store_admin_token
A_SHOPIFY_WEBHOOK_SECRET=your_new_store_webhook_secret

# Firebase - Separate Project for New Store
A_NEXT_PUBLIC_FIREBASE_API_KEY=your_new_firebase_api_key
A_NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-new-project.firebaseapp.com
A_NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-new-project-id
A_NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-new-project.appspot.com
A_NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_new_messaging_sender_id
A_NEXT_PUBLIC_FIREBASE_APP_ID=your_new_app_id

# Firebase Admin - Server Side
A_FIREBASE_PROJECT_ID=your-new-project-id
A_FIREBASE_STORAGE_BUCKET_ADMIN=your-new-project.appspot.com
A_FIREBASE_SERVICE_ACCOUNT={"type":"service_account","project_id":"your-new-project",...}

# Google AI
A_GEMINI_API_KEY=your_gemini_api_key

# App URLs
A_NEXT_PUBLIC_APP_ORIGIN=https://your-new-admin-domain.com
A_NEXT_PUBLIC_STOREFRONT_URL=https://your-new-storefront.com
A_AUTHORIZED_EMAILS=your-email@example.com
```

## **For Production (Original Variables):**

```bash
# Toggle to use original variables (default)
USE_A_PREFIX=false

# Original production variables remain unchanged
SHOPIFY_STORE_URL=original-store.myshopify.com
SHOPIFY_ADMIN_ACCESS_TOKEN=original_token
# ... etc
```

## **Vercel Deployment**

### **Option 1: Environment Variables in Vercel Dashboard**
1. Go to your Vercel project settings
2. Add all the A_ prefixed variables
3. Set `USE_A_PREFIX=true`

### **Option 2: .env.local for Local Development**
Create a `.env.local` file with your A_ variables for local testing.

## **Firebase Collections**

The A_ prefixed setup will use a **separate Firebase project**, so:
- ✅ **Inventory data** will be completely separate
- ✅ **User authentication** will be separate  
- ✅ **Product descriptions** will be separate
- ✅ **No data mixing** between stores

## **Testing**

1. **Local**: Set `USE_A_PREFIX=true` in `.env.local`
2. **Vercel**: Set `USE_A_PREFIX=true` in environment variables
3. **Verify**: Check logs to see which store/project is being used

## **Switching Back to Production**

Simply set `USE_A_PREFIX=false` or remove the variable entirely to use original production variables.

## **Benefits**

- ✅ **No code changes** needed to switch stores
- ✅ **Complete data isolation** between stores
- ✅ **Easy switching** with one environment variable
- ✅ **Production safety** - original variables untouched
- ✅ **Separate Firebase projects** for complete isolation
