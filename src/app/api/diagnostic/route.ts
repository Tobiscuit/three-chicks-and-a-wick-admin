import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { FIREBASE_CONFIG, FIREBASE_ADMIN_CONFIG } from '@/lib/env-config';

export const dynamic = 'force-dynamic';

export async function GET() {
  // Diagnostic endpoint to check Firebase connection
  try {
    const projectId = FIREBASE_CONFIG.PROJECT_ID;
    const serviceAccount = FIREBASE_ADMIN_CONFIG.SERVICE_ACCOUNT;

    console.log('[Diagnostic] Project ID:', projectId ? 'configured' : 'NOT SET');
    console.log('[Diagnostic] Service Account:', serviceAccount ? 'configured' : 'NOT SET');

    // Try to list documents in inventoryStatus collection
    const snapshot = await adminDb.collection('inventoryStatus').limit(10).get();
    const docs = snapshot.docs.map(doc => ({ id: doc.id, data: doc.data() }));

    return NextResponse.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      projectId: projectId || 'not set',
      serviceAccountConfigured: !!serviceAccount,
      inventoryStatusDocs: docs,
      totalDocs: snapshot.size
    });
  } catch (e: any) {
    console.error('[Diagnostic] Error:', e?.message || e);
    return NextResponse.json({
      status: 'error',
      timestamp: new Date().toISOString(),
      error: e?.message || 'Unknown error',
      projectId: FIREBASE_CONFIG.PROJECT_ID || 'not set',
      stack: e?.stack
    }, { status: 500 });
  }
}

