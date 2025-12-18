
import { initializeApp, getApps, App, cert, applicationDefault } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getStorage } from 'firebase-admin/storage';
import { getFirestore } from 'firebase-admin/firestore';
import { FIREBASE_ADMIN_CONFIG, FIREBASE_CONFIG } from './env-config';

let app: App;

// This ensures we only initialize the app once
if (getApps().length === 0) {
  const projectId = FIREBASE_ADMIN_CONFIG.PROJECT_ID;
  const publicBucket = FIREBASE_CONFIG.STORAGE_BUCKET;
  const adminBucketEnv = FIREBASE_ADMIN_CONFIG.STORAGE_BUCKET_ADMIN;
  const serviceAccountJson = FIREBASE_ADMIN_CONFIG.SERVICE_ACCOUNT;

  try {
    // Use the public bucket directly for Firebase Storage (firebasestorage.app)
    // This ensures we use the correct bucket name that matches the client-side
    const storageBucket = publicBucket || adminBucketEnv;

    const options: any = { projectId, storageBucket };

    if (serviceAccountJson && serviceAccountJson.trim().length > 0) {
      try {
        const parsed = JSON.parse(serviceAccountJson);
        options.credential = cert(parsed);
      } catch (jsonErr: any) {
        console.error('[Firebase Admin] Failed to parse FIREBASE_SERVICE_ACCOUNT JSON:', jsonErr?.message || jsonErr);
        throw jsonErr;
      }
    } else {
      options.credential = applicationDefault();
    }

    app = initializeApp(options);
    if (!projectId) {
      console.warn('[Firebase Admin] WARNING: projectId is not set. Set NEXT_PUBLIC_FIREBASE_PROJECT_ID.');
    }
    if (!options.storageBucket) {
      console.warn('[Firebase Admin] WARNING: storageBucket is not set. Prefer FIREBASE_STORAGE_BUCKET_ADMIN or set projectId.');
    }
  } catch (e: any) {
    console.error("[Firebase Admin] Failed to initialize Admin SDK:", e?.message || e);
    throw e;
  }
} else {
  app = getApps()[0];
}

const adminAuth = getAuth(app);
const adminStorage = getStorage(app);
const adminDb = getFirestore(app);

// Export the initialized services
export { app as adminApp, adminAuth, adminStorage, adminDb };
