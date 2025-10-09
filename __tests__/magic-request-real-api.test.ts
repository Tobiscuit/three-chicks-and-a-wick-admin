import { describe, it, expect, beforeEach } from 'vitest';

// Real API integration test - this will actually call AppSync
describe('Magic Request Real API Integration', () => {
  beforeEach(() => {
    // This test will make real API calls
  });

  it('should fetch current feature flag value from AppSync', async () => {
    // This will make a real API call to get the current state
    const appsyncUrl = 'https://k27zfa7alffqzmrgdjnw4pe5oa.appsync-api.us-east-1.amazonaws.com/graphql';
    const apiKey = 'da2-spzif6mumbeshobov3eoynwq5i';
    
    const query = `
      query GetFeatureFlag($name: String!) {
        getFeatureFlag(name: $name) {
          name
          value
        }
      }
    `;

    const variables = {
      name: 'enableMagicRequest'
    };

    try {
      const response = await fetch(appsyncUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
        },
        body: JSON.stringify({
          query,
          variables
        })
      });

      const result = await response.json();
      
      // Verify we got a response
      expect(response.ok).toBe(true);
      expect(result).toHaveProperty('data');
      
      if (result.data?.getFeatureFlag) {
        // Feature flag exists
        expect(result.data.getFeatureFlag.name).toBe('enableMagicRequest');
        expect(typeof result.data.getFeatureFlag.value).toBe('boolean');
        console.log('Current Magic Request status:', result.data.getFeatureFlag.value);
      } else {
        // Feature flag doesn't exist yet
        console.log('Magic Request feature flag does not exist yet');
      }
      
    } catch (error) {
      console.error('API call failed:', error);
      throw error;
    }
  });

  it('should toggle feature flag ON and then OFF', async () => {
    // This will actually change the feature flag twice
    const appsyncUrl = 'https://k27zfa7alffqzmrgdjnw4pe5oa.appsync-api.us-east-1.amazonaws.com/graphql';
    const apiKey = 'da2-spzif6mumbeshobov3eoynwq5i';
    const adminSecret = '0sJ7Oaino9kRHKOrATaVa6n7BErQ8s1JP436Z7RH2Ms=';
    
    const mutation = `
      mutation SetFeatureFlag($name: String!, $value: Boolean!, $adminSecret: String!) {
        setFeatureFlag(name: $name, value: $value, adminSecret: $adminSecret) {
          name
          value
        }
      }
    `;

    try {
      // Step 1: Turn ON
      console.log('Turning Magic Request ON...');
      const onResponse = await fetch(appsyncUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
        },
        body: JSON.stringify({
          query: mutation,
          variables: {
            name: 'enableMagicRequest',
            value: true,
            adminSecret: adminSecret
          }
        })
      });

      const onResult = await onResponse.json();
      expect(onResponse.ok).toBe(true);
      
      if (onResult.data?.setFeatureFlag) {
        expect(onResult.data.setFeatureFlag.value).toBe(true);
        console.log('✅ Magic Request turned ON successfully');
      } else {
        console.log('❌ Failed to turn ON:', onResult);
      }

      // Wait a moment
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Step 2: Turn OFF (restore original state)
      console.log('Turning Magic Request OFF...');
      const offResponse = await fetch(appsyncUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
        },
        body: JSON.stringify({
          query: mutation,
          variables: {
            name: 'enableMagicRequest',
            value: false,
            adminSecret: adminSecret
          }
        })
      });

      const offResult = await offResponse.json();
      expect(offResponse.ok).toBe(true);
      
      if (offResult.data?.setFeatureFlag) {
        expect(offResult.data.setFeatureFlag.value).toBe(false);
        console.log('✅ Magic Request turned OFF successfully (restored)');
      } else {
        console.log('❌ Failed to turn OFF:', offResult);
      }
      
    } catch (error) {
      console.error('Toggle test failed:', error);
      throw error;
    }
  });
});
