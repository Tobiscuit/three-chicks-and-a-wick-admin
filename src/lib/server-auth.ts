/**
 * Server-side authentication utilities
 * 
 * This module provides server-side only authentication checks
 * for API routes that need to verify user identity and authorization.
 */

import { cookies } from 'next/headers';
import { adminAuth } from '@/lib/firebase-admin';

/**
 * Verify Firebase auth token and check email authorization
 * This should only be called from Server Actions or API Routes
 */
export async function verifyAdminAuth(): Promise<{
  authorized: boolean;
  email?: string;
  uid?: string;
  error?: string;
}> {
  try {
    // Get the session cookie
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('__session')?.value;

    if (!sessionCookie) {
      return { authorized: false, error: 'No session cookie found' };
    }

    // Verify the session cookie using Firebase Admin SDK
    const decodedClaims = await adminAuth.verifySessionCookie(sessionCookie, true);
    
    if (!decodedClaims || !decodedClaims.email) {
      return { authorized: false, error: 'Invalid session' };
    }

    // Check email whitelist
    const authorizedEmails = process.env.NEXT_PUBLIC_AUTHORIZED_EMAILS?.split(',').map(e => e.trim()) || [];
    
    if (!authorizedEmails.includes(decodedClaims.email)) {
      return { 
        authorized: false, 
        error: 'Email not authorized',
        email: decodedClaims.email,
        uid: decodedClaims.uid
      };
    }

    return {
      authorized: true,
      email: decodedClaims.email,
      uid: decodedClaims.uid
    };
  } catch (error) {
    console.error('[Server Auth] Verification error:', error);
    return { 
      authorized: false, 
      error: error instanceof Error ? error.message : 'Authentication failed' 
    };
  }
}

/**
 * Get admin secret from environment (server-side only)
 * This should NEVER be exposed to the client
 */
export function getAdminSecret(): string {
  const secret = process.env.STOREFRONT_ADMIN_SECRET;
  
  if (!secret) {
    throw new Error('STOREFRONT_ADMIN_SECRET not configured');
  }
  
  return secret;
}

/**
 * Get AppSync configuration (server-side only)
 */
export function getAppSyncConfig() {
  const url = process.env.STOREFRONT_APPSYNC_URL;
  const apiKey = process.env.STOREFRONT_APPSYNC_API_KEY;
  
  if (!url || !apiKey) {
    throw new Error('AppSync configuration not found');
  }
  
  return { url, apiKey };
}

