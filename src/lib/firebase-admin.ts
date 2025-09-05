
import { initializeApp, getApps, App, cert, applicationDefault } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getStorage } from 'firebase-admin/storage';

let app: App;

// This ensures we only initialize the app once
if (getApps().length === 0) {
  console.log("[Firebase Admin] Initializing Firebase Admin SDK...");

  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const storageBucket = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;
  const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT;

  try {
    const options: any = {
      projectId,
      storageBucket,
    };

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
    if (!storageBucket) {
      console.warn('[Firebase Admin] WARNING: storageBucket is not set. Set NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET.');
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

// Export the initialized services
export { app as adminApp, adminAuth, adminStorage };
