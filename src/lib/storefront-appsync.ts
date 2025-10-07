/**
 * Admin Panel → Storefront AppSync Integration (SECURE)
 * 
 * This module provides client-side functions that call the Admin Panel's own API routes,
 * which then proxy requests to the Storefront's AppSync API.
 * 
 * The admin secret is NEVER exposed to the browser - it stays server-side only.
 * 
 * Uses Firebase ID tokens (JWT) for authentication - OAuth 2.0 Bearer Token pattern.
 */

import { auth } from '@/lib/firebase';

/**
 * Get Firebase ID token for authenticated requests
 */
async function getIdToken(): Promise<string | null> {
  try {
    const user = auth.currentUser;
    if (!user) {
      console.error('[AppSync Client] No authenticated user');
      return null;
    }
    
    // Get the ID token (refreshes automatically if expired)
    const idToken = await user.getIdToken();
    return idToken;
  } catch (error) {
    console.error('[AppSync Client] Error getting ID token:', error);
    return null;
  }
}

// Types
export interface MagicRequestOption {
  name: string;
  value: string;
  enabled: boolean;
  order: number;
}

export interface MagicRequestConfig {
  waxTypes: MagicRequestOption[];
  candleSizes: MagicRequestOption[];
  wickTypes: MagicRequestOption[];
  jarTypes: MagicRequestOption[];
  updatedAt?: string;
}

export interface FeatureFlag {
  key: string;
  value: boolean;
  updatedAt?: string;
  updatedBy?: string;
}

// Default config fallback
const getDefaultConfig = (): MagicRequestConfig => ({
  waxTypes: [
    { name: 'Soy', value: 'Soy', enabled: true, order: 1 },
    { name: 'Beeswax', value: 'Beeswax', enabled: true, order: 2 },
    { name: 'Coconut Soy', value: 'Coconut Soy', enabled: true, order: 3 },
  ],
  candleSizes: [
    { name: 'The Spark', value: 'The Spark (8oz)', enabled: true, order: 1 },
    { name: 'The Flame', value: 'The Flame (12oz)', enabled: true, order: 2 },
    { name: 'The Glow', value: 'The Glow (16oz)', enabled: true, order: 3 },
  ],
  wickTypes: [
    { name: 'Cotton', value: 'Cotton', enabled: true, order: 1 },
    { name: 'Hemp', value: 'Hemp', enabled: true, order: 2 },
    { name: 'Wood', value: 'Wood', enabled: true, order: 3 },
  ],
  jarTypes: [
    { name: 'Standard Tin', value: 'Standard Tin', enabled: true, order: 1 },
    { name: 'Amber Glass', value: 'Amber Glass', enabled: true, order: 2 },
    { name: 'Frosted Glass', value: 'Frosted Glass', enabled: true, order: 3 },
    { name: 'Ceramic', value: 'Ceramic', enabled: true, order: 4 },
  ],
});

/**
 * Feature Flag Functions
 * These call the Admin Panel's API routes, which then proxy to AppSync
 */

export async function getFeatureFlag(key: string): Promise<FeatureFlag | null> {
  try {
    const idToken = await getIdToken();
    if (!idToken) {
      console.error('[getFeatureFlag] No ID token available');
      return null;
    }

    const response = await fetch(`/api/storefront/feature-flag?key=${encodeURIComponent(key)}`, {
      headers: {
        'Authorization': `Bearer ${idToken}`,
      },
    });
    
    if (!response.ok) {
      console.error('Error fetching feature flag:', response.statusText);
      return null;
    }

    const result = await response.json();
    return result.success ? result.data : null;
  } catch (error) {
    console.error('Error fetching feature flag:', error);
    return null;
  }
}

export async function getFeatureFlags(): Promise<FeatureFlag[]> {
  try {
    const response = await fetch('/api/storefront/feature-flags');
    
    if (!response.ok) {
      console.error('Error fetching feature flags:', response.statusText);
      return [];
    }

    const result = await response.json();
    return result.success ? result.data : [];
  } catch (error) {
    console.error('Error fetching feature flags:', error);
    return [];
  }
}

export async function setFeatureFlag(key: string, value: boolean): Promise<FeatureFlag> {
  const idToken = await getIdToken();
  if (!idToken) {
    throw new Error('No ID token available - user may not be authenticated');
  }

  const response = await fetch('/api/storefront/feature-flag', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${idToken}`,
    },
    body: JSON.stringify({ key, value }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to update feature flag');
  }

  const result = await response.json();
  
  if (!result.success) {
    throw new Error(result.error || 'Failed to update feature flag');
  }

  return result.data;
}

/**
 * Magic Request Config Functions
 * These call the Admin Panel's API routes, which then proxy to AppSync
 */

export async function getMagicRequestConfig(): Promise<MagicRequestConfig> {
  try {
    const idToken = await getIdToken();
    if (!idToken) {
      console.warn('[getMagicRequestConfig] No ID token available, using default config');
      return getDefaultConfig();
    }

    const response = await fetch('/api/storefront/magic-request-config', {
      headers: {
        'Authorization': `Bearer ${idToken}`,
      },
    });
    
    if (!response.ok) {
      console.warn('Error fetching Magic Request config, using default');
      return getDefaultConfig();
    }

    const result = await response.json();
    return result.success ? result.data : getDefaultConfig();
  } catch (error) {
    console.error('Error fetching Magic Request config:', error);
    return getDefaultConfig();
  }
}

export async function updateMagicRequestConfig(config: Omit<MagicRequestConfig, 'updatedAt'>): Promise<MagicRequestConfig> {
  const idToken = await getIdToken();
  if (!idToken) {
    throw new Error('No ID token available - user may not be authenticated');
  }

  const response = await fetch('/api/storefront/magic-request-config', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${idToken}`,
    },
    body: JSON.stringify(config),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to update configuration');
  }

  const result = await response.json();
  
  if (!result.success) {
    throw new Error(result.error || 'Failed to update configuration');
  }

  return result.data;
}
