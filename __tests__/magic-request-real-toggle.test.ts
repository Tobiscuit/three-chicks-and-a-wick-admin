import { describe, it, expect, beforeAll, afterAll } from 'vitest';

// Test configuration
const API_BASE_URL = 'https://dev-admin.threechicksandawick.com';
const FEATURE_FLAG_NAME = 'enableMagicRequest';

// Helper function to make authenticated API calls
async function makeAuthenticatedRequest(endpoint: string, options: RequestInit = {}) {
  // For this test, we'll need to get a valid ID token
  // In a real test environment, you'd want to use a test user account
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
  
  return response;
}

// Helper to get current feature flag value
async function getFeatureFlagValue(): Promise<boolean | null> {
  try {
    const response = await makeAuthenticatedRequest(`/api/storefront/feature-flag?key=${FEATURE_FLAG_NAME}`);
    
    if (!response.ok) {
      console.log(`GET failed with status: ${response.status}`);
      return null;
    }
    
    const result = await response.json();
    return result.data?.value ?? null;
  } catch (error) {
    console.error('Error fetching feature flag:', error);
    return null;
  }
}

// Helper to set feature flag value
async function setFeatureFlagValue(value: boolean): Promise<boolean> {
  try {
    const response = await makeAuthenticatedRequest('/api/storefront/feature-flag', {
      method: 'POST',
      body: JSON.stringify({ key: FEATURE_FLAG_NAME, value }),
    });
    
    if (!response.ok) {
      console.log(`POST failed with status: ${response.status}`);
      const errorText = await response.text();
      console.log('Error response:', errorText);
      return false;
    }
    
    const result = await response.json();
    return result.success === true;
  } catch (error) {
    console.error('Error setting feature flag:', error);
    return false;
  }
}

// Helper to wait for a condition
async function waitFor(condition: () => Promise<boolean>, timeout = 10000, interval = 500): Promise<boolean> {
  const startTime = Date.now();
  
  while (Date.now() - startTime < timeout) {
    if (await condition()) {
      return true;
    }
    await new Promise(resolve => setTimeout(resolve, interval));
  }
  
  return false;
}

describe('Magic Request Feature Flag - Real API Integration', () => {
  let originalValue: boolean | null = null;
  
  beforeAll(async () => {
    // Get the initial value so we can restore it
    console.log('🔍 Getting initial feature flag value...');
    originalValue = await getFeatureFlagValue();
    console.log(`📊 Initial value: ${originalValue}`);
    
    if (originalValue === null) {
      throw new Error('Could not fetch initial feature flag value - check authentication');
    }
  });
  
  afterAll(async () => {
    // Always restore the original value
    if (originalValue !== null) {
      console.log(`🔄 Restoring feature flag to original value: ${originalValue}`);
      const restored = await setFeatureFlagValue(originalValue);
      if (!restored) {
        console.error('❌ Failed to restore original feature flag value!');
      } else {
        console.log('✅ Successfully restored original value');
      }
    }
  });
  
  it('should toggle feature flag ON and verify the change', async () => {
    console.log('🔄 Testing toggle ON...');
    
    // Step 1: Set to true
    const setResult = await setFeatureFlagValue(true);
    expect(setResult).toBe(true);
    console.log('✅ Set to true');
    
    // Step 2: Wait and verify it's actually true
    const verifyTrue = await waitFor(async () => {
      const currentValue = await getFeatureFlagValue();
      console.log(`🔍 Current value: ${currentValue}`);
      return currentValue === true;
    });
    
    expect(verifyTrue).toBe(true);
    console.log('✅ Verified value is true');
  }, 15000);
  
  it('should toggle feature flag OFF and verify the change', async () => {
    console.log('🔄 Testing toggle OFF...');
    
    // Step 1: Set to false
    const setResult = await setFeatureFlagValue(false);
    expect(setResult).toBe(true);
    console.log('✅ Set to false');
    
    // Step 2: Wait and verify it's actually false
    const verifyFalse = await waitFor(async () => {
      const currentValue = await getFeatureFlagValue();
      console.log(`🔍 Current value: ${currentValue}`);
      return currentValue === false;
    });
    
    expect(verifyFalse).toBe(true);
    console.log('✅ Verified value is false');
  }, 15000);
  
  it('should handle rapid toggles correctly', async () => {
    console.log('🔄 Testing rapid toggles...');
    
    // Rapid toggle sequence: false -> true -> false -> true
    const sequence = [false, true, false, true];
    
    for (let i = 0; i < sequence.length; i++) {
      const expectedValue = sequence[i];
      console.log(`🔄 Setting to ${expectedValue} (step ${i + 1}/${sequence.length})`);
      
      const setResult = await setFeatureFlagValue(expectedValue);
      expect(setResult).toBe(true);
      
      // Wait a moment for the change to propagate
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Verify the value
      const currentValue = await getFeatureFlagValue();
      expect(currentValue).toBe(expectedValue);
      console.log(`✅ Verified ${expectedValue}`);
    }
  }, 30000);
  
  it('should restore to original value after all tests', async () => {
    // This test runs last and verifies we're back to the original state
    console.log(`🔍 Verifying final state matches original: ${originalValue}`);
    
    const finalValue = await getFeatureFlagValue();
    expect(finalValue).toBe(originalValue);
    console.log('✅ Final state matches original');
  }, 10000);
});
