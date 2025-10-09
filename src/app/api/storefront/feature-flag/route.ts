/**
 * API Route: Set Feature Flag
 * 
 * This server-side route proxies feature flag mutations to the Storefront's AppSync API.
 * The admin secret is kept server-side and never exposed to the browser.
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminAuth, getAdminSecret, getAppSyncConfig } from '@/lib/server-auth';

export async function POST(request: NextRequest) {
  try {
    // 1. Verify user is authenticated and authorized
    const authResult = await verifyAdminAuth(request);
    
    if (!authResult.authorized) {
      return NextResponse.json(
        { error: authResult.error || 'Unauthorized' },
        { status: 403 }
      );
    }

    // 2. Parse request body
    const { key, value } = await request.json();
    
    if (!key || typeof value !== 'boolean') {
      return NextResponse.json(
        { error: 'Invalid request: key and value (boolean) required' },
        { status: 400 }
      );
    }

    // 3. Get server-side secrets
    const adminSecret = getAdminSecret();
    const { url, apiKey } = getAppSyncConfig();

    // 4. Call AppSync with admin secret (server-side only!)
    const graphqlQuery = {
      query: `
        mutation SetFeatureFlag($input: FeatureFlagInput!) {
          setFeatureFlag(input: $input) {
            key
            value
            updatedAt
            updatedBy
          }
        }
      `,
      variables: {
        input: {
          key: key,
          value,
          adminSecret
        }
      }
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
      },
      body: JSON.stringify(graphqlQuery)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Feature Flag API] AppSync HTTP error:', response.status, errorText);
      return NextResponse.json(
        { error: 'Failed to update feature flag', details: errorText },
        { status: response.status }
      );
    }

    const result = await response.json();

    // Check for GraphQL errors
    if (result.errors) {
      console.error('[Feature Flag API] GraphQL errors:', JSON.stringify(result.errors, null, 2));
      return NextResponse.json(
        { error: result.errors[0]?.message || 'GraphQL error', details: result.errors },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      data: result.data.setFeatureFlag
    });

  } catch (error) {
    console.error('[Feature Flag API] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    // 1. Verify user is authenticated and authorized
    const authResult = await verifyAdminAuth(request);
    
    if (!authResult.authorized) {
      return NextResponse.json(
        { error: authResult.error || 'Unauthorized' },
        { status: 403 }
      );
    }

    // 2. Get feature flag key from query params
    const { searchParams } = new URL(request.url);
    const key = searchParams.get('key');

    if (!key) {
      return NextResponse.json(
        { error: 'Missing key parameter' },
        { status: 400 }
      );
    }

    // 3. Get AppSync config
    const { url, apiKey } = getAppSyncConfig();

    // 4. Query AppSync (no admin secret needed for read operations)
    const graphqlQuery = {
      query: `
        query GetFeatureFlag($key: String!) {
          getFeatureFlag(key: $key) {
            key
            value
            updatedAt
            updatedBy
          }
        }
      `,
      variables: { key }
    };

    console.log('[Feature Flag API] GET - Requesting key:', key);
    console.log('[Feature Flag API] GET - AppSync URL:', url);

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
      },
      body: JSON.stringify(graphqlQuery)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Feature Flag API] GET - AppSync HTTP error:', response.status, errorText);
      return NextResponse.json(
        { error: 'Failed to fetch feature flag', details: errorText },
        { status: response.status }
      );
    }

    const result = await response.json();

    if (result.errors) {
      console.error('[Feature Flag API] GET - GraphQL errors:', JSON.stringify(result.errors, null, 2));
      return NextResponse.json(
        { error: result.errors[0]?.message || 'GraphQL error', details: result.errors },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      data: result.data.getFeatureFlag
    });

  } catch (error) {
    console.error('[Feature Flag API] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

