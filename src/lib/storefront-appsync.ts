/**
 * Admin Panel → Storefront AppSync Integration
 * 
 * This module allows the admin panel to communicate with the storefront's
 * AppSync GraphQL API to manage feature flags and Magic Request configuration.
 * 
 * Uses AWS Amplify's modern generateClient approach for GraphQL operations.
 */

import { Amplify } from 'aws-amplify';
import { generateClient } from 'aws-amplify/api';

// Configure Amplify for AppSync
const configureAmplify = () => {
  const appsyncUrl = process.env.NEXT_PUBLIC_APPSYNC_URL;
  const appsyncApiKey = process.env.NEXT_PUBLIC_APPSYNC_API_KEY;
  const appsyncRegion = process.env.NEXT_PUBLIC_APPSYNC_REGION || 'us-east-1';

  if (!appsyncUrl || !appsyncApiKey) {
    console.warn('Missing AppSync configuration. AppSync integration will not be available.');
    return false;
  }

  try {
    Amplify.configure({
      API: {
        GraphQL: {
          endpoint: appsyncUrl,
          region: appsyncRegion,
          defaultAuthMode: 'apiKey',
          apiKey: appsyncApiKey,
        },
      },
    });
    return true;
  } catch (error) {
    console.error('Failed to configure Amplify:', error);
    return false;
  }
};

// Initialize Amplify
const isConfigured = configureAmplify();

// Create Amplify GraphQL client
const client = isConfigured ? generateClient() : null;

// Admin Secret for authorization
const getAdminSecret = () => {
  const secret = process.env.NEXT_PUBLIC_ADMIN_SECRET;
  if (!secret) {
    throw new Error('Missing NEXT_PUBLIC_ADMIN_SECRET environment variable');
  }
  return secret;
};

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

// GraphQL Queries and Mutations
const getFeatureFlagQuery = `
  query GetFeatureFlag($key: String!) {
    getFeatureFlag(key: $key) {
      key
      value
      updatedAt
      updatedBy
    }
  }
`;

const getFeatureFlagsQuery = `
  query GetFeatureFlags {
    getFeatureFlags {
      key
      value
      updatedAt
      updatedBy
    }
  }
`;

const setFeatureFlagMutation = `
  mutation SetFeatureFlag($input: SetFeatureFlagInput!) {
    setFeatureFlag(input: $input) {
      key
      value
      updatedAt
      updatedBy
    }
  }
`;

const getMagicRequestConfigQuery = `
  query GetMagicRequestConfig {
    getMagicRequestConfig {
      waxTypes {
        name
        value
        enabled
        order
      }
      candleSizes {
        name
        value
        enabled
        order
      }
      wickTypes {
        name
        value
        enabled
        order
      }
      jarTypes {
        name
        value
        enabled
        order
      }
      updatedAt
    }
  }
`;

const updateMagicRequestConfigMutation = `
  mutation UpdateMagicRequestConfig($input: MagicRequestConfigInput!) {
    updateMagicRequestConfig(input: $input) {
      waxTypes {
        name
        value
        enabled
        order
      }
      candleSizes {
        name
        value
        enabled
        order
      }
      wickTypes {
        name
        value
        enabled
        order
      }
      jarTypes {
        name
        value
        enabled
        order
      }
      updatedAt
    }
  }
`;

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

// Feature Flag Functions
export async function getFeatureFlag(key: string): Promise<FeatureFlag | null> {
  if (!client) {
    console.warn('AppSync client not configured');
    return null;
  }

  try {
    const result = await client.graphql({
      query: getFeatureFlagQuery,
      variables: { key },
    });
    return (result as any).data.getFeatureFlag;
  } catch (error) {
    console.error('Error fetching feature flag:', error);
    return null;
  }
}

export async function getFeatureFlags(): Promise<FeatureFlag[]> {
  if (!client) {
    console.warn('AppSync client not configured');
    return [];
  }

  try {
    const result = await client.graphql({
      query: getFeatureFlagsQuery,
    });
    return (result as any).data.getFeatureFlags || [];
  } catch (error) {
    console.error('Error fetching feature flags:', error);
    return [];
  }
}

export async function setFeatureFlag(key: string, value: boolean): Promise<FeatureFlag> {
  if (!client) {
    throw new Error('AppSync client not configured');
  }

  const adminSecret = getAdminSecret();

  const result = await client.graphql({
    query: setFeatureFlagMutation,
    variables: {
      input: {
        key,
        value,
        adminSecret,
      },
    },
  });

  return (result as any).data.setFeatureFlag;
}

// Magic Request Config Functions
export async function getMagicRequestConfig(): Promise<MagicRequestConfig> {
  if (!client) {
    console.warn('AppSync client not configured, returning default config');
    return getDefaultConfig();
  }

  try {
    const result = await client.graphql({
      query: getMagicRequestConfigQuery,
    });
    return (result as any).data.getMagicRequestConfig;
  } catch (error) {
    console.error('Error fetching Magic Request config:', error);
    return getDefaultConfig();
  }
}

export async function updateMagicRequestConfig(config: Omit<MagicRequestConfig, 'updatedAt'>): Promise<MagicRequestConfig> {
  if (!client) {
    throw new Error('AppSync client not configured');
  }

  const adminSecret = getAdminSecret();

  const result = await client.graphql({
    query: updateMagicRequestConfigMutation,
    variables: {
      input: {
        ...config,
        adminSecret,
      },
    },
  });

  return (result as any).data.updateMagicRequestConfig;
}
