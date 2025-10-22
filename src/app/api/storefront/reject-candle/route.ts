/**
 * Admin Panel API Route → Storefront AppSync (Reject Candle)
 * 
 * Securely proxies candle rejection requests to the Storefront's AppSync API.
 * Requires admin secret for authorization.
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyIdToken } from '@/lib/server-auth';

// AppSync configuration (server-side only)
const APPSYNC_URL = process.env.NEXT_PUBLIC_APPSYNC_URL || 'https://k27zfa7alffqzmrgdjnw4pe5oa.appsync-api.us-east-1.amazonaws.com/graphql';
const APPSYNC_API_KEY = process.env.NEXT_PUBLIC_APPSYNC_API_KEY || 'da2-spzif6mumbeshobov3eoynwq5i';
const ADMIN_SECRET = process.env.STOREFRONT_ADMIN_SECRET;

// GraphQL Mutation
const REJECT_SHARED_CANDLE = `
  mutation RejectSharedCandle($jobId: ID!, $reason: String, $adminSecret: String!) {
    rejectSharedCandle(jobId: $jobId, reason: $reason, adminSecret: $adminSecret) {
      success
      message
    }
  }
`;

/**
 * POST /api/storefront/reject-candle
 * Reject a shared candle and hide from public
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

    const idToken = authHeader.substring(7);
    const decodedToken = await verifyIdToken(idToken);
    
    if (!decodedToken) {
      return NextResponse.json(
        { success: false, error: 'Invalid token' },
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
    const { jobId, reason } = body;

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
        query: REJECT_SHARED_CANDLE,
        variables: { 
          jobId,
          reason: reason || 'No reason provided',
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
      data: result.data.rejectSharedCandle,
    });
  } catch (error) {
    console.error('Error in POST /api/storefront/reject-candle:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

