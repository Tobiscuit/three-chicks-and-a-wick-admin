import { NextRequest, NextResponse } from 'next/server';
import { createHmac, timingSafeEqual } from 'crypto';
import { adminDb } from '@/lib/firebase-admin';

export const runtime = 'nodejs';

async function getRawBody(req: NextRequest): Promise<Buffer> {
  const arrayBuffer = await req.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

function verifyShopifyHmac(rawBody: Buffer, hmacHeader: string | null): boolean {
  const secret = process.env.SHOPIFY_WEBHOOK_SECRET || '';
  if (!secret || !hmacHeader) return false;
  const digest = createHmac('sha256', secret).update(rawBody).digest('base64');
  try {
    return timingSafeEqual(Buffer.from(digest), Buffer.from(hmacHeader));
  } catch {
    return false;
  }
}

export async function POST(req: NextRequest) {
  const raw = await getRawBody(req);
  const hmac = req.headers.get('x-shopify-hmac-sha256');
  if (!verifyShopifyHmac(raw, hmac)) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  // Check if Firebase is properly configured
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID;
  console.log('[Webhook inventory-update] Firebase project ID:', projectId ? 'set' : 'NOT SET');

  try {
    const payload = JSON.parse(raw.toString('utf8'));
    console.log('[Webhook inventory-update] Received payload:', payload);

    // Handle both real Shopify webhooks and test webhooks
    let inventoryItemIdRaw = '';

    // Real inventory_levels/update webhook format
    if (payload?.inventory_item_id) {
      inventoryItemIdRaw = String(payload.inventory_item_id);
    }
    // Shopify test webhook format
    else if (payload?.admin_graphql_api_id) {
      inventoryItemIdRaw = String(payload.admin_graphql_api_id);
    }
    // Alternative format
    else if (payload?.inventory_item?.id) {
      inventoryItemIdRaw = String(payload.inventory_item.id);
    }

    const inventoryItemId = inventoryItemIdRaw.split('/').pop() || inventoryItemIdRaw; // Firestore-safe id

    // Get available quantity from various possible fields
    const available = Number(
      payload?.available ??
      payload?.available_quantity ??
      payload?.quantity ??
      0
    );

    console.log('[Webhook inventory-update] Processing:', { inventoryItemId, available });

    if (!inventoryItemId) {
      console.log('[Webhook inventory-update] No inventory item ID found, skipping');
      return NextResponse.json({ ok: true });
    }

    console.log('[Webhook inventory-update] Updating Firestore...');
    try {
      const docRef = adminDb.collection('inventoryStatus').doc(inventoryItemId);
      const data = { quantity: available, status: 'confirmed', updatedAt: Date.now() };
      console.log('[Webhook inventory-update] Writing data:', data);

      await docRef.set(data, { merge: true });

      // Verify the write actually happened
      const doc = await docRef.get();
      if (doc.exists) {
        const savedData = doc.data();
        console.log('[Webhook inventory-update] Firestore update successful:', savedData);

        // Also try to read the collection to verify
        const collectionSnapshot = await adminDb.collection('inventoryStatus').limit(5).get();
        console.log('[Webhook inventory-update] Collection has', collectionSnapshot.size, 'documents');
        collectionSnapshot.forEach((doc) => {
          console.log('[Webhook inventory-update] Doc:', doc.id, doc.data());
        });

      } else {
        throw new Error('Document was not created');
      }
    } catch (firestoreError: any) {
      console.error('[Webhook inventory-update] Firestore error:', firestoreError?.message || firestoreError);
      console.error('[Webhook inventory-update] Error details:', {
        code: firestoreError?.code,
        details: firestoreError?.details,
        stack: firestoreError?.stack
      });
      throw firestoreError; // Re-throw to be caught by outer try-catch
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error('[Webhook inventory-update] error', e?.message || e);
    console.error('[Webhook inventory-update] stack trace:', e?.stack);

    // If it's a Firebase error, return a more specific status
    if (e?.message?.includes('Firebase') || e?.message?.includes('firestore') || e?.code) {
      return new NextResponse(`Firebase Error: ${e?.message || 'Unknown Firebase error'}`, { status: 500 });
    }

    return new NextResponse('Bad Request', { status: 400 });
  }
}


