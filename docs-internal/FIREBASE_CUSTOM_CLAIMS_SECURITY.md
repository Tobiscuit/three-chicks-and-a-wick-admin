// Firebase Custom Claims Implementation
// File: src/lib/firebase-admin-roles.ts

import { adminAuth } from '@/lib/firebase-admin';

export type AdminRole = 'owner' | 'admin' | 'editor' | 'viewer';

export interface AdminClaims {
  role: AdminRole;
  permissions: string[];
}

const ROLE_PERMISSIONS: Record<AdminRole, string[]> = {
  owner: ['*'], // All permissions
  admin: ['manage_products', 'manage_settings', 'manage_magic_request', 'view_analytics'],
  editor: ['edit_products', 'view_analytics'],
  viewer: ['view_products', 'view_analytics'],
};

/**
 * Grant admin role to a user
 * Run this once to set up initial admin users
 */
export async function grantAdminRole(email: string, role: AdminRole) {
  try {
    // Get user by email
    const user = await adminAuth.getUserByEmail(email);
    
    // Set custom claims
    await adminAuth.setCustomUserClaims(user.uid, {
      role,
      permissions: ROLE_PERMISSIONS[role],
      grantedAt: Date.now(),
    });
    
    console.log(`✅ Granted ${role} role to ${email}`);
    return { success: true };
  } catch (error) {
    console.error('Error granting role:', error);
    throw error;
  }
}

/**
 * Revoke admin access from a user
 */
export async function revokeAdminRole(email: string) {
  try {
    const user = await adminAuth.getUserByEmail(email);
    
    // Remove custom claims
    await adminAuth.setCustomUserClaims(user.uid, null);
    
    console.log(`✅ Revoked admin access from ${email}`);
    return { success: true };
  } catch (error) {
    console.error('Error revoking role:', error);
    throw error;
  }
}

/**
 * Check if user has specific permission
 */
export function hasPermission(claims: AdminClaims, permission: string): boolean {
  if (claims.permissions.includes('*')) return true;
  return claims.permissions.includes(permission);
}

/**
 * Middleware to protect routes
 */
export async function requireAdmin(user: any) {
  const token = await user.getIdToken(true);
  const decoded = await adminAuth.verifyIdToken(token);
  
  if (!decoded.role || !['owner', 'admin', 'editor', 'viewer'].includes(decoded.role)) {
    throw new Error('Unauthorized: Not an admin');
  }
  
  return decoded as AdminClaims;
}

/**
 * Setup script - Run once to initialize admin users
 */
export async function setupInitialAdmins() {
  // Grant owner role to primary admin
  await grantAdminRole('threechicksandawick@gmail.com', 'owner');
  
  // Grant admin role to developer
  await grantAdminRole('jramirez203@outlook.com', 'admin');
  
  console.log('✅ Initial admin users configured');
}

