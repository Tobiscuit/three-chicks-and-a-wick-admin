import { getLocations } from '@/services/shopify-locations';
import { NextResponse } from 'next/server';

/**
 * GET /api/shopify/locations
 * 
 * Fetches all Shopify locations for this store.
 * Useful for finding the location ID needed for inventory queries.
 */
export async function GET() {
  try {
    const locations = await getLocations();
    return NextResponse.json({ 
      success: true, 
      data: locations,
      instructions: "Copy the 'id' field from your primary location below. This is your SHOPIFY_LOCATION_ID."
    });
  } catch (error) {
    console.error('Error fetching locations:', error);
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}
