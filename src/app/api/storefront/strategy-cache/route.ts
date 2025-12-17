import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminAuth, getAdminSecret, getAppSyncConfig } from '@/lib/server-auth';
import { adminDb } from '@/lib/firebase-admin';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    // Verify admin authentication
    await verifyAdminAuth(request);

    const { url, apiKey } = getAppSyncConfig();
    const adminSecret = getAdminSecret();

    // Get userId from query params for per-user caching
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const cacheId = userId ? `user:${userId}` : 'global';

    // GraphQL query to get strategy cache
    const graphqlQuery = {
      query: `
        query GetStrategyCache {
          getStrategyCache {
            id
            strategy
            generatedAt
            expires_at
          }
        }
      `
    };

    console.log('[Strategy Cache API] GET - Fetching strategy cache from AppSync');

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey
      },
      body: JSON.stringify(graphqlQuery)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Strategy Cache API] AppSync HTTP error:', response.status, errorText);
      return NextResponse.json(
        { error: 'Failed to fetch strategy cache', details: errorText },
        { status: response.status }
      );
    }

    const result = await response.json();

    if (result.errors) {
      console.error('[Strategy Cache API] GraphQL errors:', JSON.stringify(result.errors, null, 2));
      return NextResponse.json(
        { error: result.errors[0]?.message || 'GraphQL error', details: result.errors },
        { status: 400 }
      );
    }

    console.log('[Strategy Cache API] GET - Success:', result.data?.getStrategyCache ? 'Cache found' : 'No cache');

    // Map snake_case response to camelCase for frontend/internal use
    if (result.data?.getStrategyCache) {
      result.data.getStrategyCache.expiresAt = result.data.getStrategyCache.expires_at;
    }

    return NextResponse.json(result.data);

  } catch (error: any) {
    console.error('[Strategy Cache API] GET - Error:', error.message);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // Verify admin authentication
    await verifyAdminAuth(request);

    const { url, apiKey } = getAppSyncConfig();
    const adminSecret = getAdminSecret();

    const body = await request.json();
    const { strategy, expiresAt, userId } = body;

    if (!strategy || !expiresAt) {
      return NextResponse.json(
        { error: 'Missing required fields: strategy, expiresAt' },
        { status: 400 }
      );
    }

    // Use userId for per-user caching, or 'global' for shared cache
    const cacheId = userId ? `user:${userId}` : 'global';

    // GraphQL mutation to set strategy cache
    const graphqlQuery = {
      query: `
        mutation SetStrategyCache($input: StrategyCacheInput!) {
          setStrategyCache(input: $input) {
            id
            strategy
            generatedAt
            expires_at
          }
        }
      `,
      variables: {
        input: {
          id: cacheId,
          strategy,
          expires_at: expiresAt
        }
      }
    };

    console.log('[Strategy Cache API] POST - Setting strategy cache in AppSync');

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey
      },
      body: JSON.stringify(graphqlQuery)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Strategy Cache API] AppSync HTTP error:', response.status, errorText);
      return NextResponse.json(
        { error: 'Failed to set strategy cache', details: errorText },
        { status: response.status }
      );
    }

    const result = await response.json();

    if (result.errors) {
      console.error('[Strategy Cache API] GraphQL errors:', JSON.stringify(result.errors, null, 2));
      return NextResponse.json(
        { error: result.errors[0]?.message || 'GraphQL error', details: result.errors },
        { status: 400 }
      );
    }

    console.log('[Strategy Cache API] POST - Success: Strategy cache set');
    return NextResponse.json(result.data);

  } catch (error: any) {
    console.error('[Strategy Cache API] POST - Error:', error.message);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
