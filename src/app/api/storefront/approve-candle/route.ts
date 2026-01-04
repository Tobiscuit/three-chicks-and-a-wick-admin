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

import { adminDb } from '@/lib/firebase-admin';

export const dynamic = 'force-dynamic';

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

    // Check required environment variables
    if (!APPSYNC_URL || !APPSYNC_API_KEY || !ADMIN_SECRET) {
      console.error('Missing required environment variables');
      return NextResponse.json(
        { success: false, error: 'Server configuration error' },
        { status: 500 }
      );
    }

    const body = await request.json();
    const { jobId, candleData } = body;

    if (!jobId) {
      return NextResponse.json(
        { success: false, error: 'Missing jobId parameter' },
        { status: 400 }
      );
    }

    // --- NEW: Create Real Shopify Product ---
    // If candleData is provided, we create a product. 
    // If getting approved from a legacy UI without candleData, we skip this (backward compatibility).
    let createdProductId: string | undefined;

    if (candleData) {
      try {
        const { createProduct } = await import('@/services/shopify');
        
        // 1. Use stored price from submission (preferred) or fallback to API call for legacy items
        let price = candleData.calculatedPrice || null;
        
        if (!price) {
            // Legacy fallback: re-query pricing API if no stored price (backwards compatibility)
            console.log('⚠️ No stored price found, falling back to pricing API...');
            try {
                const sfUrl = process.env.STOREFRONT_BASE_URL || 'https://threechicksandawick.com';
                const priceRes = await fetch(`${sfUrl}/api/magic/resolve-variant`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        vesselHandle: candleData.container,
                        wax: candleData.wax,
                        wick: candleData.wick
                    })
                });
                
                if (priceRes.ok) {
                    const priceData = await priceRes.json();
                    if (priceData.price) {
                        price = String(priceData.price);
                        console.log(`💲 Resolved dynamic price via API: $${price}`);
                    }
                } else {
                    console.warn(`⚠️ Pricing API failed (Status: ${priceRes.status}). Using fallback.`);
                }
            } catch (priceErr) {
                console.error("⚠️ Error fetching dynamic price:", priceErr);
            }
        } else {
            console.log(`💲 Using stored price from submission: $${price}`);
        }
        
        // Final fallback
        if (!price) {
            price = "35.00";
            console.warn('⚠️ Using hardcoded fallback price: $35.00');
        }

        console.log(`Creating Shopify product for job ${jobId}: ${candleData.candleName} @ $${price}`);

        const result = await createProduct({
          title: candleData.candleName || "Community Creation",
          description: candleData.description || "A custom creation from our community.",
          tags: "community-creation, magic-request-verified, status:approved", 
          status: 'ACTIVE',
          price: price, // Use resolved price
          sku: `COMMUNITY-${jobId.substring(0, 8).toUpperCase()}`,
          inventory: 100, // Make it purchasable immediately
          imageUrls: [], // No images yet, or we could use a default placeholder
          collections: [], // Could add to a specific 'Community' collection ID here if known
          metafields: [
            { namespace: "custom", key: "wax", value: candleData.wax || "Soy", type: "single_line_text_field" },
            { namespace: "custom", key: "wick", value: candleData.wick || "Cotton", type: "single_line_text_field" },
            { namespace: "custom", key: "container", value: candleData.container || "Standard", type: "single_line_text_field" },
            { namespace: "custom", key: "fragrances_json", value: JSON.stringify(candleData.fragrances || []), type: "json" },
            { namespace: "custom", key: "job_id", value: jobId, type: "single_line_text_field" },
            { namespace: "custom", key: "source", value: "community", type: "single_line_text_field" }
          ]
        });

        createdProductId = result.product.id;
        console.log(`✅ Created Product: ${createdProductId}`);

      } catch (productError) {
        console.error("Failed to create Shopify product:", productError);
        // We decide here: Fail the whole approval? Or proceed with warning?
        // Let's fail hard so we don't have desync.
        return NextResponse.json(
          { 
            success: false, 
            error: productError instanceof Error ? productError.message : 'Failed to create product' 
          },
          { status: 500 }
        );
      }
    }

    // --- END NEW LOGIC ---

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
      productId: createdProductId // Return this for debug/UI usage
    });
  } catch (error) {
    console.error('Error in POST /api/storefront/approve-candle:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

