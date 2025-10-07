/**
 * API Route: Magic Request Configuration
 * 
 * This server-side route proxies Magic Request config mutations to the Storefront's AppSync API.
 * The admin secret is kept server-side and never exposed to the browser.
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminAuth, getAdminSecret, getAppSyncConfig } from '@/lib/server-auth';

export async function POST(request: NextRequest) {
  try {
    // 1. Verify user is authenticated and authorized
    const authResult = await verifyAdminAuth();
    
    if (!authResult.authorized) {
      return NextResponse.json(
        { error: authResult.error || 'Unauthorized' },
        { status: 403 }
      );
    }

    // 2. Parse request body
    const config = await request.json();
    
    // Validate config structure
    if (!config.waxTypes || !config.candleSizes || !config.wickTypes || !config.jarTypes) {
      return NextResponse.json(
        { error: 'Invalid config: missing required fields' },
        { status: 400 }
      );
    }

    // 3. Get server-side secrets
    const adminSecret = getAdminSecret();
    const { url, apiKey } = getAppSyncConfig();

    // 4. Call AppSync with admin secret
    const graphqlQuery = {
      query: `
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
      `,
      variables: {
        input: {
          ...config,
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
      console.error('[Magic Request Config API] AppSync error:', errorText);
      return NextResponse.json(
        { error: 'Failed to update configuration' },
        { status: response.status }
      );
    }

    const result = await response.json();

    if (result.errors) {
      console.error('[Magic Request Config API] GraphQL errors:', result.errors);
      return NextResponse.json(
        { error: result.errors[0]?.message || 'GraphQL error' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      data: result.data.updateMagicRequestConfig
    });

  } catch (error) {
    console.error('[Magic Request Config API] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    // 1. Verify user is authenticated and authorized
    const authResult = await verifyAdminAuth();
    
    if (!authResult.authorized) {
      return NextResponse.json(
        { error: authResult.error || 'Unauthorized' },
        { status: 403 }
      );
    }

    // 2. Get AppSync config
    const { url, apiKey } = getAppSyncConfig();

    // 3. Query AppSync (no admin secret needed for read)
    const graphqlQuery = {
      query: `
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
      `
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
      return NextResponse.json(
        { error: 'Failed to fetch configuration' },
        { status: response.status }
      );
    }

    const result = await response.json();

    if (result.errors) {
      return NextResponse.json(
        { error: result.errors[0]?.message || 'GraphQL error' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      data: result.data.getMagicRequestConfig
    });

  } catch (error) {
    console.error('[Magic Request Config API] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

