import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { inventoryItemId, quantity } = body;

    if (!inventoryItemId) {
      return NextResponse.json({ error: 'inventoryItemId is required' }, { status: 400 });
    }

    console.log(`[Test Inventory] Updating ${inventoryItemId} to quantity ${quantity}`);

    // Update Firestore - this will trigger SSE updates to all connected clients
    await adminDb.collection('inventoryStatus').doc(inventoryItemId).set({
      quantity: quantity || 0,
      status: 'confirmed',
      updatedAt: Date.now()
    }, { merge: true });

    return NextResponse.json({
      success: true,
      message: `Updated inventory for ${inventoryItemId}`,
      quantity: quantity || 0
    });

  } catch (error) {
    console.error('[Test Inventory] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// GET endpoint to list current inventory status
export async function GET() {
  try {
    const snapshot = await adminDb.collection('inventoryStatus').get();
    const docs = snapshot.docs.map(doc => ({
      id: doc.id,
      data: doc.data()
    }));

    return NextResponse.json({
      success: true,
      documents: docs,
      total: snapshot.size
    });

  } catch (error) {
    console.error('[Test Inventory] Error fetching:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
