
import 'server-only';
import { initializeApp, getApps, App, cert, applicationDefault } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getStorage } from 'firebase-admin/storage';
import { getFirestore } from 'firebase-admin/firestore';
import { FIREBASE_ADMIN_CONFIG, FIREBASE_CONFIG } from './env-config';

let app: App;

// This ensures we only initialize the app once
let isBuildMock = false;

if (getApps().length === 0) {
  const projectId = FIREBASE_ADMIN_CONFIG.PROJECT_ID;
  const publicBucket = FIREBASE_CONFIG.STORAGE_BUCKET;
  const adminBucketEnv = FIREBASE_ADMIN_CONFIG.STORAGE_BUCKET_ADMIN;
  const serviceAccountJson = FIREBASE_ADMIN_CONFIG.SERVICE_ACCOUNT;
  
  // Check if we are running in build mode with placeholder
  // env-config.ts returns a JSON with project_id "mock-project-id" during build if missing
  if (serviceAccountJson && serviceAccountJson.includes('mock-project-id')) {
    console.warn('[Firebase Admin] Build placeholder detected. Bypassing initialization and using mocks.');
    isBuildMock = true;
  } else {
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
      // During build, do not crash if initialization fails
      if (process.env.npm_lifecycle_event === 'build') {
         console.warn('[Firebase Admin] Build mode detected. Suppressing initialization error.');
         isBuildMock = true;
      } else {
         throw e;
      }
    }
  }
} else {
  app = getApps()[0];
}

// Helper to create safe mocks during build
const createMock = (name: string) => new Proxy({}, {
    get: (_target, prop) => {
        if (prop === 'then') return undefined; // Prevent Promise confusion
        return (...args: any[]) => {
            console.warn(`[Firebase Admin Mock] ${name}.${String(prop)} called during build.`);
            return undefined;
        };
    }
});

const adminAuth = isBuildMock ? (createMock('adminAuth') as any) : getAuth(app);
const adminStorage = isBuildMock ? (createMock('adminStorage') as any) : getStorage(app);
const adminDb = isBuildMock ? (createMock('adminDb') as any) : getFirestore(app);

// Export the initialized services
export { app as adminApp, adminAuth, adminStorage, adminDb };
