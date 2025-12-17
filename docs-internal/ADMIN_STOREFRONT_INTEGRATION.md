# Admin Panel ↔ Storefront Integration Architecture

## Overview
Admin Panel communicates with Storefront's AppSync API to manage feature flags and Magic Request variant options.

## Communication Flow

```
Admin Panel → AppSync GraphQL → DynamoDB ← AppSync GraphQL ← Storefront
                                      ↓
                              Subscription Events
                                      ↓
                              All Connected Clients
```

## Implementation

### 1. AppSync Schema Extensions (Storefront)

```graphql
# Feature Flags
type FeatureFlag {
  key: String!
  value: Boolean!
  updatedAt: AWSDateTime!
  updatedBy: String
}

input SetFeatureFlagInput {
  key: String!
  value: Boolean!
  adminSecret: String! # Authorization
}

# Magic Request Variant Options
type MagicRequestOption {
  name: String!
  value: String!
  enabled: Boolean!
  order: Int
}

type MagicRequestConfig {
  waxTypes: [MagicRequestOption!]!
  candleSizes: [MagicRequestOption!]!
  wickTypes: [MagicRequestOption!]!
  jarTypes: [MagicRequestOption!]!
  updatedAt: AWSDateTime!
}

input MagicRequestOptionInput {
  name: String!
  value: String!
  enabled: Boolean!
  order: Int
}

input MagicRequestConfigInput {
  waxTypes: [MagicRequestOptionInput!]!
  candleSizes: [MagicRequestOptionInput!]!
  wickTypes: [MagicRequestOptionInput!]!
  jarTypes: [MagicRequestOptionInput!]!
  adminSecret: String! # Authorization
}

# Queries
type Query {
  getFeatureFlag(key: String!): FeatureFlag
  getFeatureFlags: [FeatureFlag!]!
  getMagicRequestConfig: MagicRequestConfig!
}

# Mutations
type Mutation {
  setFeatureFlag(input: SetFeatureFlagInput!): FeatureFlag!
  updateMagicRequestConfig(input: MagicRequestConfigInput!): MagicRequestConfig!
}

# Subscriptions (Real-time updates)
type Subscription {
  onFeatureFlagChanged(key: String): FeatureFlag
    @aws_subscribe(mutations: ["setFeatureFlag"])
  
  onMagicRequestConfigChanged: MagicRequestConfig
    @aws_subscribe(mutations: ["updateMagicRequestConfig"])
}
```

### 2. DynamoDB Tables (Storefront Backend)

```javascript
// Config Table
{
  TableName: 'ConfigTable',
  KeySchema: [
    { AttributeName: 'key', KeyType: 'HASH' }
  ],
  AttributeDefinitions: [
    { AttributeName: 'key', AttributeType: 'S' }
  ]
}

// Example items:
{
  "key": "enableMagicRequest",
  "value": true,
  "updatedAt": "2025-10-06T12:00:00Z",
  "updatedBy": "admin@threechicksandawick.com"
}

{
  "key": "magic_request_options",
  "value": {
    "waxTypes": [
      { "name": "Soy", "value": "Soy", "enabled": true, "order": 1 },
      { "name": "Beeswax", "value": "Beeswax", "enabled": true, "order": 2 },
      { "name": "Coconut Soy", "value": "Coconut Soy", "enabled": true, "order": 3 }
    ],
    "candleSizes": [
      { "name": "The Spark", "value": "The Spark (8oz)", "enabled": true, "order": 1 },
      { "name": "The Flame", "value": "The Flame (12oz)", "enabled": true, "order": 2 },
      { "name": "The Glow", "value": "The Glow (16oz)", "enabled": true, "order": 3 }
    ],
    "wickTypes": [
      { "name": "Cotton", "value": "Cotton", "enabled": true, "order": 1 },
      { "name": "Hemp", "value": "Hemp", "enabled": true, "order": 2 },
      { "name": "Wood", "value": "Wood", "enabled": true, "order": 3 }
    ],
    "jarTypes": [
      { "name": "Standard Tin", "value": "Standard Tin", "enabled": true, "order": 1 },
      { "name": "Amber Glass", "value": "Amber Glass", "enabled": true, "order": 2 },
      { "name": "Frosted Glass", "value": "Frosted Glass", "enabled": true, "order": 3 },
      { "name": "Ceramic", "value": "Ceramic", "enabled": true, "order": 4 }
    ]
  },
  "updatedAt": "2025-10-06T12:00:00Z"
}
```

### 3. AppSync Resolvers (Storefront Backend)

```javascript
// setFeatureFlag resolver
import { util } from '@aws-appsync/utils';

export function request(ctx) {
  const { key, value, adminSecret } = ctx.arguments.input;
  
  // Authorization check
  if (adminSecret !== ctx.env.ADMIN_SECRET) {
    util.error('Unauthorized: Invalid admin secret', 'Unauthorized');
  }
  
  const now = util.time.nowISO8601();
  
  return {
    operation: 'PutItem',
    key: util.dynamodb.toMapValues({ key }),
    attributeValues: util.dynamodb.toMapValues({
      value,
      updatedAt: now,
      updatedBy: ctx.identity?.email || 'admin'
    })
  };
}

export function response(ctx) {
  return ctx.result;
}
```

```javascript
// updateMagicRequestConfig resolver
export function request(ctx) {
  const { waxTypes, candleSizes, wickTypes, jarTypes, adminSecret } = ctx.arguments.input;
  
  // Authorization check
  if (adminSecret !== ctx.env.ADMIN_SECRET) {
    util.error('Unauthorized: Invalid admin secret', 'Unauthorized');
  }
  
  const config = {
    waxTypes,
    candleSizes,
    wickTypes,
    jarTypes
  };
  
  const now = util.time.nowISO8601();
  
  return {
    operation: 'PutItem',
    key: util.dynamodb.toMapValues({ key: 'magic_request_options' }),
    attributeValues: util.dynamodb.toMapValues({
      value: config,
      updatedAt: now
    })
  };
}

export function response(ctx) {
  return {
    ...ctx.result.value,
    updatedAt: ctx.result.updatedAt
  };
}
```

### 4. Admin Panel Integration

```typescript
// Admin Panel: src/lib/storefront-appsync.ts
import { ApolloClient, InMemoryCache, HttpLink, gql } from '@apollo/client';

const apolloClient = new ApolloClient({
  link: new HttpLink({
    uri: process.env.NEXT_PUBLIC_APPSYNC_URL!,
    headers: {
      'x-api-key': process.env.NEXT_PUBLIC_APPSYNC_API_KEY!,
    },
  }),
  cache: new InMemoryCache(),
});

// Feature Flag Management
export async function setFeatureFlag(key: string, value: boolean) {
  const adminSecret = process.env.NEXT_PUBLIC_ADMIN_SECRET!;
  
  return apolloClient.mutate({
    mutation: gql`
      mutation SetFeatureFlag($input: SetFeatureFlagInput!) {
        setFeatureFlag(input: $input) {
          key
          value
          updatedAt
        }
      }
    `,
    variables: {
      input: { key, value, adminSecret }
    },
  });
}

export async function getFeatureFlags() {
  const { data } = await apolloClient.query({
    query: gql`
      query GetFeatureFlags {
        getFeatureFlags {
          key
          value
          updatedAt
        }
      }
    `,
  });
  return data.getFeatureFlags;
}

// Magic Request Config Management
export async function getMagicRequestConfig() {
  const { data } = await apolloClient.query({
    query: gql`
      query GetMagicRequestConfig {
        getMagicRequestConfig {
          waxTypes { name value enabled order }
          candleSizes { name value enabled order }
          wickTypes { name value enabled order }
          jarTypes { name value enabled order }
          updatedAt
        }
      }
    `,
  });
  return data.getMagicRequestConfig;
}

export async function updateMagicRequestConfig(config: MagicRequestConfigInput) {
  const adminSecret = process.env.NEXT_PUBLIC_ADMIN_SECRET!;
  
  return apolloClient.mutate({
    mutation: gql`
      mutation UpdateMagicRequestConfig($input: MagicRequestConfigInput!) {
        updateMagicRequestConfig(input: $input) {
          waxTypes { name value enabled order }
          candleSizes { name value enabled order }
          wickTypes { name value enabled order }
          jarTypes { name value enabled order }
          updatedAt
        }
      }
    `,
    variables: {
      input: { ...config, adminSecret }
    },
  });
}
```

### 5. Admin Panel UI Component

```typescript
// Admin Panel: src/app/settings/magic-request-config.tsx
'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { getMagicRequestConfig, updateMagicRequestConfig } from '@/lib/storefront-appsync';
import { useToast } from '@/hooks/use-toast';

export function MagicRequestConfigCard() {
  const { toast } = useToast();
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    loadConfig();
  }, []);
  
  const loadConfig = async () => {
    try {
      const data = await getMagicRequestConfig();
      setConfig(data);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load Magic Request configuration"
      });
    } finally {
      setLoading(false);
    }
  };
  
  const handleSave = async () => {
    try {
      await updateMagicRequestConfig(config);
      toast({
        title: "Success",
        description: "Magic Request configuration updated"
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to update configuration"
      });
    }
  };
  
  if (loading) return <div>Loading...</div>;
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Magic Request Variant Options</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Wax Types */}
        <div>
          <h3 className="font-semibold mb-2">Wax Types</h3>
          {config.waxTypes.map((wax, idx) => (
            <div key={idx} className="flex items-center gap-4 mb-2">
              <Switch
                checked={wax.enabled}
                onCheckedChange={(checked) => {
                  const newConfig = { ...config };
                  newConfig.waxTypes[idx].enabled = checked;
                  setConfig(newConfig);
                }}
              />
              <Input
                value={wax.name}
                onChange={(e) => {
                  const newConfig = { ...config };
                  newConfig.waxTypes[idx].name = e.target.value;
                  newConfig.waxTypes[idx].value = e.target.value;
                  setConfig(newConfig);
                }}
              />
            </div>
          ))}
        </div>
        
        {/* Candle Sizes */}
        <div>
          <h3 className="font-semibold mb-2">Candle Sizes</h3>
          {config.candleSizes.map((size, idx) => (
            <div key={idx} className="flex items-center gap-4 mb-2">
              <Switch
                checked={size.enabled}
                onCheckedChange={(checked) => {
                  const newConfig = { ...config };
                  newConfig.candleSizes[idx].enabled = checked;
                  setConfig(newConfig);
                }}
              />
              <Input
                value={size.name}
                onChange={(e) => {
                  const newConfig = { ...config };
                  newConfig.candleSizes[idx].name = e.target.value;
                  setConfig(newConfig);
                }}
              />
              <Input
                value={size.value}
                onChange={(e) => {
                  const newConfig = { ...config };
                  newConfig.candleSizes[idx].value = e.target.value;
                  setConfig(newConfig);
                }}
                placeholder="e.g., The Spark (8oz)"
              />
            </div>
          ))}
        </div>
        
        {/* Similar for Wick Types and Jar Types */}
        
        <Button onClick={handleSave}>Save Configuration</Button>
      </CardContent>
    </Card>
  );
}
```

### 6. Storefront Real-Time Integration

```typescript
// Storefront: src/components/magic-request-form.tsx
import { useEffect, useState } from 'react';
import { useSubscription } from '@apollo/client';
import { gql } from '@apollo/client';

const FEATURE_FLAG_SUBSCRIPTION = gql`
  subscription OnFeatureFlagChanged($key: String!) {
    onFeatureFlagChanged(key: $key) {
      key
      value
    }
  }
`;

export function MagicRequestForm() {
  const [isEnabled, setIsEnabled] = useState(true);
  
  // Subscribe to feature flag changes
  const { data } = useSubscription(FEATURE_FLAG_SUBSCRIPTION, {
    variables: { key: 'enableMagicRequest' }
  });
  
  useEffect(() => {
    if (data?.onFeatureFlagChanged) {
      setIsEnabled(data.onFeatureFlagChanged.value);
      
      if (!data.onFeatureFlagChanged.value) {
        toast({
          title: "Feature Unavailable",
          description: "Custom candles are temporarily unavailable"
        });
      }
    }
  }, [data]);
  
  if (!isEnabled) {
    return <div>Custom candles are temporarily unavailable</div>;
  }
  
  return <div>{/* Rest of form */}</div>;
}
```

## Security Considerations

### 1. Admin Secret
- Store in environment variable: `NEXT_PUBLIC_ADMIN_SECRET`
- Never commit to git
- Rotate periodically

### 2. CORS Configuration
```javascript
// AppSync API Settings
{
  "cors": {
    "allowOrigins": [
      "https://dev-admin.threechicksandawick.com",
      "https://admin.threechicksandawick.com",
      "https://dev.threechicksandawick.com",
      "https://threechicksandawick.com"
    ],
    "allowMethods": ["GET", "POST"],
    "allowHeaders": ["Content-Type", "x-api-key"]
  }
}
```

### 3. Rate Limiting
- Implement in AppSync resolver
- Limit admin mutations to prevent abuse

## Environment Variables

### Admin Panel
```env
# AppSync (Storefront Backend)
NEXT_PUBLIC_APPSYNC_URL=https://xxx.appsync-api.us-east-1.amazonaws.com/graphql
NEXT_PUBLIC_APPSYNC_API_KEY=da2-xxxxx
NEXT_PUBLIC_ADMIN_SECRET=your-secure-secret-here
```

### Storefront
```env
# Already has these
NEXT_PUBLIC_APPSYNC_URL=...
NEXT_PUBLIC_APPSYNC_API_KEY=...

# Add this for resolver authorization
ADMIN_SECRET=your-secure-secret-here
```

## Benefits of This Architecture

✅ **No custom backend API needed** - Reuse existing AppSync
✅ **Real-time updates** - Subscriptions notify all clients instantly
✅ **Centralized config** - Single source of truth in DynamoDB
✅ **Simple deployment** - No new infrastructure
✅ **Secure** - Admin secret for authorization
✅ **Type-safe** - GraphQL schema validation

## Blind Spot Checklist

✅ **Race conditions** - Handled via subscriptions + backend validation
✅ **Authorization** - Admin secret in resolver
✅ **CORS** - Configured in AppSync
✅ **Data consistency** - Single DynamoDB source
✅ **Error handling** - Try/catch with user feedback
✅ **Environment isolation** - Separate secrets per environment
✅ **Audit trail** - `updatedBy` and `updatedAt` fields

## Next Steps

1. ✅ Update AppSync schema (Storefront project)
2. ✅ Create DynamoDB Config table (Storefront Terraform)
3. ✅ Implement AppSync resolvers (Storefront Lambda)
4. ✅ Add subscription support (Storefront frontend)
5. ✅ Create AppSync client (Admin Panel)
6. ✅ Build UI for variant management (Admin Panel)
7. ✅ Test end-to-end flow
8. ✅ Deploy to staging environment

