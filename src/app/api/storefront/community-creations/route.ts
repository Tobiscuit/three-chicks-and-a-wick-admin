/**
 * Admin Panel API Route → Storefront AppSync (Community Creations)
 * 
 * Securely proxies requests to fetch shared candles for manual review.
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminAuth } from '@/lib/server-auth';

// AppSync configuration (server-side only)
const APPSYNC_URL = process.env.STOREFRONT_APPSYNC_URL;
const APPSYNC_API_KEY = process.env.STOREFRONT_APPSYNC_API_KEY;

// GraphQL Query
const GET_COMMUNITY_CREATIONS = `
  query GetCommunityCreations($limit: Int, $nextToken: String, $reviewStatus: ReviewStatus) {
    getCommunityCreations(limit: $limit, nextToken: $nextToken, reviewStatus: $reviewStatus) {
      items {
        jobId
        candleName
        html
        createdAt
        reviewStatus
        reviewedBy
        reviewedAt
        rejectionReason
      }
      nextToken
    }
  }
`;

/**
 * GET /api/storefront/community-creations
 * Get shared candles for manual review
 */
export async function GET(request: NextRequest) {
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

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const nextToken = searchParams.get('nextToken');
    const reviewStatus = searchParams.get('reviewStatus');

    // Build variables
    const variables: any = { limit };
    if (nextToken) {
      variables.nextToken = nextToken;
    }
    if (reviewStatus && ['PENDING', 'APPROVED', 'REJECTED'].includes(reviewStatus)) {
      variables.reviewStatus = reviewStatus;
    }

    // Call AppSync
    const response = await fetch(APPSYNC_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': APPSYNC_API_KEY,
      },
      body: JSON.stringify({
        query: GET_COMMUNITY_CREATIONS,
        variables,
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
      data: result.data.getCommunityCreations,
    });
  } catch (error) {
    console.error('Error in GET /api/storefront/community-creations:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

