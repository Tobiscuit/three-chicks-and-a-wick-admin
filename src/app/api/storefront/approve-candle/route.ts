/**
 * Admin Panel API Route → Storefront AppSync (Approve Candle)
 * 
 * Securely proxies candle approval requests to the Storefront's AppSync API.
 * Requires admin secret for authorization.
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminAuth } from '@/lib/server-auth';

// AppSync configuration (server-side only)
const APPSYNC_URL = process.env.STOREFRONT_APPSYNC_URL;
const APPSYNC_API_KEY = process.env.STOREFRONT_APPSYNC_API_KEY;
const ADMIN_SECRET = process.env.STOREFRONT_ADMIN_SECRET;

// GraphQL Mutation
const APPROVE_SHARED_CANDLE = `
  mutation ApproveSharedCandle($jobId: ID!, $adminSecret: String!) {
    approveSharedCandle(jobId: $jobId, adminSecret: $adminSecret) {
      jobId
      candleName
      html
      createdAt
      reviewStatus
      reviewedBy
      reviewedAt
    }
  }
`;

/**
 * POST /api/storefront/approve-candle
 * Approve a shared candle for public display
 */
export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Verify admin authentication
    const authResult = await verifyAdminAuth(request);
    if (!authResult.authorized) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized', details: authResult.error },
        { status: 401 }
      );
    }

    // Check admin secret is configured
    if (!ADMIN_SECRET) {
      console.error('STOREFRONT_ADMIN_SECRET not configured');
      return NextResponse.json(
        { success: false, error: 'Server configuration error' },
        { status: 500 }
      );
    }

    const body = await request.json();
    const { jobId } = body;

    if (!jobId) {
      return NextResponse.json(
        { success: false, error: 'Missing jobId parameter' },
        { status: 400 }
      );
    }

    // Call AppSync with admin secret
    const response = await fetch(APPSYNC_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': APPSYNC_API_KEY,
      },
      body: JSON.stringify({
        query: APPROVE_SHARED_CANDLE,
        variables: { 
          jobId,
          adminSecret: ADMIN_SECRET  // Server-side only!
        },
      }),
    });

    const result = await response.json();

    if (result.errors) {
      console.error('AppSync GraphQL Error:', result.errors);
      return NextResponse.json(
        { success: false, error: result.errors[0]?.message || 'GraphQL error' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: result.data.approveSharedCandle,
    });
  } catch (error) {
    console.error('Error in POST /api/storefront/approve-candle:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

