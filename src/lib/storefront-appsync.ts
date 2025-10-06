/**
 * Admin Panel → Storefront AppSync Integration
 * 
 * This module allows the admin panel to communicate with the storefront's
 * AppSync GraphQL API to manage feature flags and Magic Request configuration.
 */

import { ApolloClient, InMemoryCache, HttpLink, gql } from '@apollo/client';

// Apollo Client for Storefront AppSync
const createApolloClient = () => {
  const appsyncUrl = process.env.NEXT_PUBLIC_APPSYNC_URL;
  const appsyncApiKey = process.env.NEXT_PUBLIC_APPSYNC_API_KEY;

  if (!appsyncUrl || !appsyncApiKey) {
    throw new Error('Missing AppSync configuration. Please set NEXT_PUBLIC_APPSYNC_URL and NEXT_PUBLIC_APPSYNC_API_KEY');
  }

  return new ApolloClient({
    link: new HttpLink({
      uri: appsyncUrl,
      headers: {
        'x-api-key': appsyncApiKey,
      },
    }),
    cache: new InMemoryCache(),
  });
};

const apolloClient = createApolloClient();

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
const GET_FEATURE_FLAG = gql`
  query GetFeatureFlag($key: String!) {
    getFeatureFlag(key: $key) {
      key
      value
      updatedAt
      updatedBy
    }
  }
`;

const GET_FEATURE_FLAGS = gql`
  query GetFeatureFlags {
    getFeatureFlags {
      key
      value
      updatedAt
      updatedBy
    }
  }
`;

const SET_FEATURE_FLAG = gql`
  mutation SetFeatureFlag($input: SetFeatureFlagInput!) {
    setFeatureFlag(input: $input) {
      key
      value
      updatedAt
      updatedBy
    }
  }
`;

const GET_MAGIC_REQUEST_CONFIG = gql`
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

const UPDATE_MAGIC_REQUEST_CONFIG = gql`
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

// Feature Flag Functions
export async function getFeatureFlag(key: string): Promise<FeatureFlag | null> {
  try {
    const { data } = await apolloClient.query({
      query: GET_FEATURE_FLAG,
      variables: { key },
      fetchPolicy: 'network-only', // Always get fresh data
    });
    return data.getFeatureFlag;
  } catch (error) {
    console.error('Error fetching feature flag:', error);
    return null;
  }
}

export async function getFeatureFlags(): Promise<FeatureFlag[]> {
  try {
    const { data } = await apolloClient.query({
      query: GET_FEATURE_FLAGS,
      fetchPolicy: 'network-only',
    });
    return data.getFeatureFlags || [];
  } catch (error) {
    console.error('Error fetching feature flags:', error);
    return [];
  }
}

export async function setFeatureFlag(key: string, value: boolean): Promise<FeatureFlag> {
  const adminSecret = getAdminSecret();

  const { data } = await apolloClient.mutate({
    mutation: SET_FEATURE_FLAG,
    variables: {
      input: {
        key,
        value,
        adminSecret,
      },
    },
  });

  return data.setFeatureFlag;
}

// Magic Request Config Functions
export async function getMagicRequestConfig(): Promise<MagicRequestConfig> {
  try {
    const { data } = await apolloClient.query({
      query: GET_MAGIC_REQUEST_CONFIG,
      fetchPolicy: 'network-only',
    });
    return data.getMagicRequestConfig;
  } catch (error) {
    console.error('Error fetching Magic Request config:', error);
    // Return default config if API call fails
    return {
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
    };
  }
}

export async function updateMagicRequestConfig(config: Omit<MagicRequestConfig, 'updatedAt'>): Promise<MagicRequestConfig> {
  const adminSecret = getAdminSecret();

  const { data } = await apolloClient.mutate({
    mutation: UPDATE_MAGIC_REQUEST_CONFIG,
    variables: {
      input: {
        ...config,
        adminSecret,
      },
    },
  });

  return data.updateMagicRequestConfig;
}

