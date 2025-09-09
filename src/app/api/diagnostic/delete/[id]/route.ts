import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  // Delete test data from Firestore
  try {
    const documentId = params.id;

    if (!documentId) {
      return NextResponse.json({ error: 'Document ID required' }, { status: 400 });
    }

    console.log('[Diagnostic] Deleting document:', documentId);

    await adminDb.collection('inventoryStatus').doc(documentId).delete();

    return NextResponse.json({
      status: 'ok',
      message: `Document ${documentId} deleted successfully`
    });
  } catch (e: any) {
    console.error('[Diagnostic] Delete error:', e?.message || e);
    return NextResponse.json({
      status: 'error',
      error: e?.message || 'Delete failed'
    }, { status: 500 });
  }
}
