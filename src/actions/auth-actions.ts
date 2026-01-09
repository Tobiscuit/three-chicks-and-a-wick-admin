'use server';

/**
 * Authentication Server Actions
 * 
 * Handles authorization checks against an allowed email list.
 * Sources: Environment variable → GCP Secret Manager fallback
 */

import { adminAuth } from '@/lib/firebase-admin';
import { SecretManagerServiceClient } from '@google-cloud/secret-manager';
import { APP_CONFIG, FIREBASE_CONFIG } from '@/lib/env-config';

/**
 * Verify user authorization by checking ID token and email whitelist.
 * 
 * @param idToken - Firebase ID token from client
 * @returns Authorization result with status and optional error
 */
export async function checkAuthorization(idToken: string | null) {
  if (!idToken) {
    console.log('[Auth Check] No ID token provided to server action.');
    return { isAuthorized: false, error: 'No ID token provided.' };
  }

  let decodedToken;
  try {
    console.log('[Auth Check] Verifying ID token...');
    decodedToken = await adminAuth.verifyIdToken(idToken);
    console.log('[Auth Check] ID token verified. UID:', decodedToken.uid, 'Email:', decodedToken.email);
  } catch (error) {
    console.error('[Auth Check] Error verifying ID token:', error);
    return { isAuthorized: false, error: 'Invalid or expired ID token.' };
  }

  const userEmail = decodedToken.email;
  if (!userEmail) {
    console.warn('[Auth Check] Token is valid but does not contain an email address.');
    return { isAuthorized: false, error: 'Token is missing email.' };
  }

  // Get authorized emails from env or Secret Manager
  const rawAuthorizedEmails = await getAuthorizedEmails();
  if (!rawAuthorizedEmails) {
    return { isAuthorized: false, error: 'Could not retrieve authorization list.' };
  }

  const authorizedEmails = rawAuthorizedEmails.split(',').map((email) => email.trim().toLowerCase());
  const lowercasedUserEmail = userEmail.toLowerCase();

  console.log(`[Auth Check] Verifying user against authorized list. Found ${authorizedEmails.length} authorized emails.`);

  const isAuthorized = authorizedEmails.includes(lowercasedUserEmail);

  if (isAuthorized) {
    console.log(`[Auth Check] SUCCESS: Authorized access for user: ${userEmail}`);
  } else {
    console.warn(`[Auth Check] DENIED: Unauthorized access attempt by user: ${userEmail}`);
  }

  return { isAuthorized, error: isAuthorized ? undefined : `User ${userEmail} is not in the authorized list.` };
}

/**
 * Get authorized emails from environment or Secret Manager.
 */
async function getAuthorizedEmails(): Promise<string | null> {
  // 1) Prefer environment variable (works on Vercel)
  const envAuthorized = APP_CONFIG.AUTHORIZED_EMAILS;
  if (envAuthorized && envAuthorized.trim().length > 0) {
    console.log('[Auth Check] Using AUTHORIZED_EMAILS from environment variables.');
    return envAuthorized;
  }

  // 2) Fallback to Secret Manager (for Firebase App Hosting)
  const projectId = FIREBASE_CONFIG.PROJECT_ID;
  if (!projectId) {
    console.error('[Auth Check] Project ID not set and AUTHORIZED_EMAILS env missing.');
    return null;
  }

  try {
    console.log('[Auth Check] AUTHORIZED_EMAILS env missing; fetching from Secret Manager...');
    const client = new SecretManagerServiceClient();
    const name = `projects/${projectId}/secrets/AUTHORIZED_EMAILS/versions/latest`;
    const [version] = await client.accessSecretVersion({ name });
    const secret = version.payload?.data?.toString();
    
    if (!secret) {
      console.error('[Auth Check] Secret AUTHORIZED_EMAILS is empty.');
      return null;
    }
    
    return secret;
  } catch (error: any) {
    console.error('[Auth Check] Failed to fetch secret from Secret Manager:', error?.message || error);
    return null;
  }
}
