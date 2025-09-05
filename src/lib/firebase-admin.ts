
import { initializeApp, getApps, App } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getStorage } from 'firebase-admin/storage';

let app: App;

// This ensures we only initialize the app once
if (getApps().length === 0) {
  console.log("[Firebase Admin] Central Initializing Firebase Admin SDK...");
  app = initializeApp({
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  });
  console.log(`[Firebase Admin] Central SDK Initialized with bucket: ${process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET}`);
} else {
  app = getApps()[0];
}

const adminAuth = getAuth(app);
const adminStorage = getStorage(app);

// Export the initialized services
export { app as adminApp, adminAuth, adminStorage };
