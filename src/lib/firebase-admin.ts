
import { initializeApp, getApps, App, cert, applicationDefault } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getStorage } from 'firebase-admin/storage';
import { getFirestore } from 'firebase-admin/firestore';
import { FIREBASE_ADMIN_CONFIG, FIREBASE_CONFIG } from './env-config';

let app: App;

// This ensures we only initialize the app once
if (getApps().length === 0) {
  console.log("[Firebase Admin] Initializing Firebase Admin SDK...");

  const projectId = FIREBASE_ADMIN_CONFIG.PROJECT_ID;
  const publicBucket = FIREBASE_CONFIG.STORAGE_BUCKET;
  const adminBucketEnv = FIREBASE_ADMIN_CONFIG.STORAGE_BUCKET_ADMIN;
  const serviceAccountJson = FIREBASE_ADMIN_CONFIG.SERVICE_ACCOUNT;

  try {
    // Determine admin bucket: prefer explicit admin bucket (appspot.com),
    // else derive from projectId, else fall back to public bucket if provided.
    const derivedAdminBucket = projectId ? `${projectId}.appspot.com` : undefined;
    const storageBucket = adminBucketEnv || derivedAdminBucket || publicBucket;

    console.log('[Firebase Admin] Bucket selection diagnostics:', {
      projectIdCandidate: projectId || 'unset',
      adminBucketEnv: adminBucketEnv || 'unset',
      publicBucket,
      derivedAdminBucket: derivedAdminBucket || 'unset',
      chosenBucket: storageBucket || 'unset',
    });

    const options: any = { projectId, storageBucket };

    if (serviceAccountJson && serviceAccountJson.trim().length > 0) {
      console.log("[Firebase Admin] Using credentials from FIREBASE_SERVICE_ACCOUNT env var.");
      try {
        const parsed = JSON.parse(serviceAccountJson);
        console.log('[Firebase Admin] Service account fields present:', {
          hasProjectId: Boolean(parsed.project_id),
          hasClientEmail: Boolean(parsed.client_email),
          hasPrivateKey: Boolean(parsed.private_key && parsed.private_key.startsWith('-----BEGIN PRIVATE KEY-----')),
        });
        options.credential = cert(parsed);
      } catch (jsonErr: any) {
        console.error('[Firebase Admin] Failed to parse FIREBASE_SERVICE_ACCOUNT JSON:', jsonErr?.message || jsonErr);
        throw jsonErr;
      }
    } else {
      console.log("[Firebase Admin] No service account provided; using application default credentials if available.");
      options.credential = applicationDefault();
    }

    app = initializeApp(options);
    console.log(`[Firebase Admin] Initialized. Project: ${projectId || 'unknown'}, Bucket: ${storageBucket || 'unset'}`);
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
