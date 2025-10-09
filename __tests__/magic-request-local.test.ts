import { describe, it, expect, beforeAll, afterAll } from 'vitest';

/**
 * Local API Route Testing
 * 
 * This approach tests the API routes directly on localhost,
 * bypassing CORS issues entirely.
 * 
 * Prerequisites:
 * 1. Run: npm run dev (to start the dev server)
 * 2. Have valid environment variables in .env.local
 * 3. Be authenticated in the admin panel (for ID token)
 */

const LOCAL_API_URL = 'http://localhost:3000';
const FEATURE_FLAG_NAME = 'enableMagicRequest';

// Helper to get ID token from browser
function getTestIdToken(): string | null {
  // In a real implementation, you'd:
  // 1. Open browser to admin panel
  // 2. Login with Google
  // 3. Open DevTools > Application > Local Storage
  // 4. Find the Firebase ID token
  // 5. Copy it here
  
  // For now, return null to indicate manual setup needed
  return null;
}

async function makeLocalRequest(endpoint: string, options: RequestInit = {}) {
  const idToken = getTestIdToken();
  
  if (!idToken) {
    throw new Error('No ID token available. Please: 1) Login to admin panel, 2) Get ID token from DevTools, 3) Update getTestIdToken() function');
  }
  
  const response = await fetch(`${LOCAL_API_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${idToken}`,
      ...options.headers,
    },
  });
  
  return response;
}

async function getFeatureFlag(): Promise<boolean | null> {
  try {
    const response = await makeLocalRequest(`/api/storefront/feature-flag?key=${FEATURE_FLAG_NAME}`);
    const result = await response.json();
    
    if (!response.ok) {
      throw new Error(`GET failed: ${response.status} - ${result.error || 'Unknown error'}`);
    }
    
    return result.data?.value ?? null;
  } catch (error) {
    console.error('Error fetching feature flag:', error.message);
    return null;
  }
}

async function setFeatureFlag(value: boolean): Promise<boolean> {
  try {
    const response = await makeLocalRequest('/api/storefront/feature-flag', {
      method: 'POST',
      body: JSON.stringify({ key: FEATURE_FLAG_NAME, value }),
    });
    
    const result = await response.json();
    
    if (!response.ok) {
      throw new Error(`POST failed: ${response.status} - ${result.error || 'Unknown error'}`);
    }
    
    return result.success === true;
  } catch (error) {
    console.error('Error setting feature flag:', error.message);
    return false;
  }
}

describe('Magic Request Feature Flag - Local API Testing', () => {
  let originalValue: boolean | null = null;
  
  beforeAll(async () => {
    // Check if dev server is running
    try {
      const response = await fetch(`${LOCAL_API_URL}/api/health`, { 
        method: 'HEAD',
        signal: AbortSignal.timeout(5000) // 5 second timeout
      });
      
      if (!response.ok) {
        throw new Error(`Dev server not responding: ${response.status}`);
      }
      
      console.log('✅ Dev server is running');
    } catch (error) {
      throw new Error('Dev server not running. Please run: npm run dev');
    }
    
    // Get initial value
    console.log('🔍 Getting initial feature flag value...');
    originalValue = await getFeatureFlag();
    
    if (originalValue === null) {
      throw new Error('Could not fetch initial value. Check authentication and environment variables.');
    }
    
    console.log(`📊 Initial value: ${originalValue}`);
  });
  
  afterAll(async () => {
    // Always restore original value
    if (originalValue !== null) {
      console.log(`🔄 Restoring to original value: ${originalValue}`);
      const restored = await setFeatureFlag(originalValue);
      if (!restored) {
        console.error('❌ Failed to restore original value!');
      } else {
        console.log('✅ Successfully restored original value');
      }
    }
  });
  
  it('should fetch current feature flag value', async () => {
    const value = await getFeatureFlag();
    expect(value).not.toBeNull();
    expect(typeof value).toBe('boolean');
    console.log(`✅ Current value: ${value}`);
  });
  
  it('should toggle feature flag to opposite value', async () => {
    const currentValue = await getFeatureFlag();
    const newValue = !currentValue;
    
    console.log(`🔄 Toggling from ${currentValue} to ${newValue}`);
    
    const setResult = await setFeatureFlag(newValue);
    expect(setResult).toBe(true);
    
    // Wait a moment for the change to propagate
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const verifyValue = await getFeatureFlag();
    expect(verifyValue).toBe(newValue);
    
    console.log(`✅ Successfully toggled to ${newValue}`);
  });
  
  it('should handle multiple rapid toggles', async () => {
    const initialValue = await getFeatureFlag();
    
    // Toggle back and forth a few times
    const toggles = [true, false, true, false];
    
    for (let i = 0; i < toggles.length; i++) {
      const targetValue = toggles[i];
      console.log(`🔄 Toggle ${i + 1}/${toggles.length}: Setting to ${targetValue}`);
      
      const setResult = await setFeatureFlag(targetValue);
      expect(setResult).toBe(true);
      
      // Wait for propagation
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const currentValue = await getFeatureFlag();
      expect(currentValue).toBe(targetValue);
      
      console.log(`✅ Toggle ${i + 1} successful`);
    }
    
    // Restore to initial value
    await setFeatureFlag(initialValue);
    console.log(`✅ Restored to initial value: ${initialValue}`);
  });
});

/**
 * SETUP INSTRUCTIONS:
 * 
 * 1. Start the dev server:
 *    npm run dev
 * 
 * 2. Open browser and login to admin panel:
 *    http://localhost:3000
 * 
 * 3. Get your ID token:
 *    - Open DevTools (F12)
 *    - Go to Application tab > Local Storage
 *    - Look for Firebase ID token
 *    - Copy the token value
 * 
 * 4. Update the getTestIdToken() function above with your token
 * 
 * 5. Run the test:
 *    npm test __tests__/magic-request-local.test.ts
 * 
 * This approach completely bypasses CORS since we're calling localhost!
 */
