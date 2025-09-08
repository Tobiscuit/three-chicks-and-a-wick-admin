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

  try {
    const payload = JSON.parse(raw.toString('utf8'));
    // inventory_levels/update payload fields
    const inventoryItemId = String(payload?.inventory_item_id || payload?.inventory_item?.id || '');
    const available = Number(payload?.available ?? payload?.available_quantity ?? 0);
    if (!inventoryItemId) return NextResponse.json({ ok: true });

    await adminDb
      .collection('inventoryStatus')
      .doc(inventoryItemId)
      .set({ quantity: available, status: 'confirmed', updatedAt: Date.now() }, { merge: true });

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error('[Webhook inventory-update] error', e?.message || e);
    return new NextResponse('Bad Request', { status: 400 });
  }
}


