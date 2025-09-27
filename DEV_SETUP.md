# 🚀 Development Environment Setup

## **Your Development URLs:**
- **Admin Panel**: `dev-admin.threechicksandawick.com`
- **Storefront**: `dev.threechicksandawick.com`

## **📋 Step-by-Step Setup**

### **1. Create Your Shopify Development Store**
1. Go to [partners.shopify.com](https://partners.shopify.com)
2. Create a new development store
3. Get your store URL and access token
4. Update `.env.local` with your values

### **2. Create Firebase Development Project**
1. Go to [console.firebase.google.com](https://console.firebase.google.com)
2. Create a new project (e.g., `threechicksandawick-dev`)
3. Enable Firestore, Authentication, and Storage
4. Get your Firebase config and service account
5. Update `.env.local` with your values

### **3. Set Up Google AI**
1. Go to [console.google.com/ai](https://console.google.com/ai)
2. Create a new API key for development
3. Update `.env.local` with your key

### **4. Deploy to Vercel**
```bash
# Install Vercel CLI
npm i -g vercel

# Login to Vercel
vercel login

# Deploy to Vercel
vercel

# Set custom domain
vercel domains add dev-admin.threechicksandawick.com
```

### **5. Set Up Custom Domain**
1. Go to Vercel dashboard
2. Select your project
3. Go to Settings → Domains
4. Add `dev-admin.threechicksandawick.com`
5. Update DNS records as instructed

## **🔧 Environment Variables to Update**

### **In `.env.local`:**
```bash
# Shopify
SHOPIFY_STORE_URL=your-dev-store.myshopify.com
SHOPIFY_ADMIN_ACCESS_TOKEN=your_dev_token

# Firebase
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-dev-project
FIREBASE_SERVICE_ACCOUNT={"type":"service_account",...}

# Google AI
GEMINI_API_KEY=your_dev_key

# URLs
NEXT_PUBLIC_APP_ORIGIN=https://dev-admin.threechicksandawick.com
NEXT_PUBLIC_STOREFRONT_URL=https://dev.threechicksandawick.com
AUTHORIZED_EMAILS=your-email@example.com
```

## **🚀 Development Workflow**

### **Local Development:**
```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Open http://localhost:3000
```

### **Deploy to Vercel:**
```bash
# Deploy to Vercel
vercel

# Deploy to production
vercel --prod
```

## **🔒 Security Notes**

- **Never commit `.env.local`** to git
- **Use different credentials** for dev/prod
- **Test thoroughly** before switching back to production
- **Keep production data safe** - this is completely separate

## **📱 Testing Your Setup**

1. **Local Testing**: `npm run dev` → `http://localhost:3000`
2. **Vercel Preview**: Deploy → Test preview URL
3. **Custom Domain**: Set up `dev-admin.threechicksandawick.com`
4. **Full Workflow**: Test product creation, AI generation, etc.

## **🆘 Troubleshooting**

### **Common Issues:**
- **Environment variables not loading**: Check `.env.local` file
- **CORS errors**: Update `allowedOrigins` in `next.config.js`
- **Firebase errors**: Verify project ID and service account
- **Shopify errors**: Check store URL and access token

### **Debug Steps:**
1. Check `.env.local` file exists and has correct values
2. Verify Firebase project settings
3. Test Shopify API connection
4. Check browser console for errors
5. Check Vercel function logs

## **🎯 Next Steps**

1. **Set up your Shopify development store**
2. **Create Firebase development project**
3. **Update `.env.local` with your values**
4. **Deploy to Vercel**
5. **Set up custom domain**
6. **Test everything works**
7. **Start developing!**

## **💡 Pro Tips**

- **Use different email** for development Firebase project
- **Create test products** in your dev Shopify store
- **Test AI generation** with your own images
- **Keep production environment untouched**
- **Document any issues** you encounter

