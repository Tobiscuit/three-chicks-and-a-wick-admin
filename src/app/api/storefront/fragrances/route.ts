/**
 * Admin Panel API Route → Storefront AppSync (Fragrances)
 * 
 * Securely proxies fragrance CRUD requests to the Storefront's AppSync API.
 * The admin secret and API key never leave the server.
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminAuth } from '@/lib/server-auth';

// AppSync configuration (server-side only)
const APPSYNC_URL = process.env.STOREFRONT_APPSYNC_URL;
const APPSYNC_API_KEY = process.env.STOREFRONT_APPSYNC_API_KEY;

// GraphQL Queries & Mutations
const LIST_FRAGRANCES = `
  query ListFragrances {
    listFragrances {
      items {
        id
        name
        description
        quantityOz
        costPerOz
        status
        createdAt
        updatedAt
      }
      count
    }
  }
`;

const GET_FRAGRANCE = `
  query GetFragrance($id: ID!) {
    getFragrance(id: $id) {
      id
      name
      description
      quantityOz
      costPerOz
      status
      createdAt
      updatedAt
    }
  }
`;

const CREATE_FRAGRANCE = `
  mutation CreateFragrance($input: FragranceInput!) {
    createFragrance(input: $input) {
      id
      name
      description
      quantityOz
      costPerOz
      status
      createdAt
      updatedAt
    }
  }
`;

const UPDATE_FRAGRANCE = `
  mutation UpdateFragrance($id: ID!, $input: FragranceInput!) {
    updateFragrance(id: $id, input: $input) {
      id
      name
      description
      quantityOz
      costPerOz
      status
      updatedAt
    }
  }
`;

const DELETE_FRAGRANCE = `
  mutation DeleteFragrance($id: ID!) {
    deleteFragrance(id: $id) {
      success
      message
    }
  }
`;

export const dynamic = 'force-dynamic';

/**
 * GET /api/storefront/fragrances
 * List all fragrances or get a single fragrance by ID
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

    // Verify admin authentication
    const authResult = await verifyAdminAuth(request);
    if (!authResult.authorized) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized', details: authResult.error },
        { status: 401 }
      );
    }

    // Check required environment variables
    if (!APPSYNC_URL || !APPSYNC_API_KEY) {
      console.error('Missing required environment variables');
      return NextResponse.json(
        { success: false, error: 'Server configuration error' },
        { status: 500 }
      );
    }

    // Check if requesting a single fragrance by ID
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    const query = id ? GET_FRAGRANCE : LIST_FRAGRANCES;
    const variables = id ? { id } : {};

    // Call AppSync
    const response = await fetch(APPSYNC_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': APPSYNC_API_KEY,
      },
      body: JSON.stringify({ query, variables }),
    });

    const result = await response.json();

    if (result.errors) {
      console.error('AppSync GraphQL Error:', result.errors);
      return NextResponse.json(
        { success: false, error: result.errors[0]?.message || 'GraphQL error' },
        { status: 500 }
      );
    }

    const data = id ? result.data.getFragrance : result.data.listFragrances;

    return NextResponse.json({
      success: true,
      data,
    });
  } catch (error) {
    console.error('Error in GET /api/storefront/fragrances:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/storefront/fragrances
 * Create a new fragrance
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

    // Check required environment variables
    if (!APPSYNC_URL || !APPSYNC_API_KEY) {
      console.error('Missing required environment variables');
      return NextResponse.json(
        { success: false, error: 'Server configuration error' },
        { status: 500 }
      );
    }

    const body = await request.json();
    const { input } = body;

    if (!input || !input.name || typeof input.quantityOz !== 'number' || !input.status) {
      return NextResponse.json(
        { success: false, error: 'Invalid input: name, quantityOz, and status are required' },
        { status: 400 }
      );
    }

    // Validate status enum
    const validStatuses = ['IN_STOCK', 'LOW', 'OUT_OF_STOCK'];
    if (!validStatuses.includes(input.status)) {
      return NextResponse.json(
        { success: false, error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` },
        { status: 400 }
      );
    }

    // Call AppSync
    const response = await fetch(APPSYNC_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': APPSYNC_API_KEY,
      },
      body: JSON.stringify({
        query: CREATE_FRAGRANCE,
        variables: { input },
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
      data: result.data.createFragrance,
    });
  } catch (error) {
    console.error('Error in POST /api/storefront/fragrances:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/storefront/fragrances
 * Update an existing fragrance
 */
export async function PUT(request: NextRequest) {
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

    // Check required environment variables
    if (!APPSYNC_URL || !APPSYNC_API_KEY) {
      console.error('Missing required environment variables');
      return NextResponse.json(
        { success: false, error: 'Server configuration error' },
        { status: 500 }
      );
    }

    const body = await request.json();
    const { id, input } = body;

    if (!id || !input) {
      return NextResponse.json(
        { success: false, error: 'Invalid input: id and input are required' },
        { status: 400 }
      );
    }

    // Validate status enum if provided
    if (input.status) {
      const validStatuses = ['IN_STOCK', 'LOW', 'OUT_OF_STOCK'];
      if (!validStatuses.includes(input.status)) {
        return NextResponse.json(
          { success: false, error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` },
          { status: 400 }
        );
      }
    }

    // Call AppSync
    const response = await fetch(APPSYNC_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': APPSYNC_API_KEY,
      },
      body: JSON.stringify({
        query: UPDATE_FRAGRANCE,
        variables: { id, input },
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
      data: result.data.updateFragrance,
    });
  } catch (error) {
    console.error('Error in PUT /api/storefront/fragrances:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/storefront/fragrances?id=xyz
 * Delete a fragrance
 */
export async function DELETE(request: NextRequest) {
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

    // Check required environment variables
    if (!APPSYNC_URL || !APPSYNC_API_KEY) {
      console.error('Missing required environment variables');
      return NextResponse.json(
        { success: false, error: 'Server configuration error' },
        { status: 500 }
      );
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Missing id parameter' },
        { status: 400 }
      );
    }

    // Call AppSync
    const response = await fetch(APPSYNC_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': APPSYNC_API_KEY,
      },
      body: JSON.stringify({
        query: DELETE_FRAGRANCE,
        variables: { id },
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
      data: result.data.deleteFragrance,
    });
  } catch (error) {
    console.error('Error in DELETE /api/storefront/fragrances:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

