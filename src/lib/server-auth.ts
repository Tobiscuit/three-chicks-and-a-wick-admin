/**
 * Server-side authentication utilities
 * 
 * This module provides server-side only authentication checks
 * for API routes that need to verify user identity and authorization.
 */

import { cookies } from 'next/headers';
import { adminAuth } from '@/lib/firebase-admin';

/**
 * Verify Firebase ID token and check email authorization
 * This should only be called from Server Actions or API Routes
 * 
 * Uses ID token verification (OAuth 2.0 Bearer Token pattern)
 * - Stateless authentication
 * - Short-lived tokens (1 hour)
 * - Industry standard approach
 */
export async function verifyAdminAuth(request?: Request): Promise<{
  authorized: boolean;
  email?: string;
  uid?: string;
  error?: string;
}> {
  try {
    // Get ID token from Authorization header
    let idToken: string | undefined;

    if (request) {
      // From API route: Extract from Authorization header
      const authHeader = request.headers.get('Authorization');
      idToken = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : undefined;
    } else {
      // From Server Action: Try to get from cookies (Firebase might set it)
      const cookieStore = await cookies();
      idToken = cookieStore.get('__session')?.value;
    }

    if (!idToken) {
      return { authorized: false, error: 'No authentication token found' };
    }

    // Verify the ID token using Firebase Admin SDK
    // This validates the JWT signature, expiration, and issuer
    const decodedToken = await adminAuth.verifyIdToken(idToken);
    
    if (!decodedToken || !decodedToken.email) {
      return { authorized: false, error: 'Invalid token' };
    }

    // Check email whitelist (server-side only - NOT exposed to client)
    const authorizedEmails = process.env.AUTHORIZED_EMAILS?.split(',').map(e => e.trim()) || [];
    
    if (!authorizedEmails.includes(decodedToken.email)) {
      return { 
        authorized: false, 
        error: 'Email not authorized',
        email: decodedToken.email,
        uid: decodedToken.uid
      };
    }

    return {
      authorized: true,
      email: decodedToken.email,
      uid: decodedToken.uid
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
  const url = process.env.NEXT_PUBLIC_STOREFRONT_APPSYNC_URL;
  const apiKey = process.env.NEXT_PUBLIC_STOREFRONT_APPSYNC_API_KEY;
  
  if (!url || !apiKey) {
    throw new Error('AppSync configuration not found');
  }
  
  return { url, apiKey };
}

