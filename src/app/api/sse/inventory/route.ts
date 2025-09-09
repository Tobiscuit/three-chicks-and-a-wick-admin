import { NextRequest } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { headers } from 'next/headers';

// Store active SSE connections
const clients = new Map<string, WritableStreamDefaultWriter>();

export async function GET(request: NextRequest) {
  const headersList = headers();
  const clientId = headersList.get('x-client-id') || 'anonymous';

  console.log(`[SSE] New client connected: ${clientId}`);

  const stream = new ReadableStream({
    start(controller) {
      // Send initial connection message
      const data = {
        type: 'connection',
        message: 'Connected to inventory updates',
        timestamp: new Date().toISOString()
      };
      controller.enqueue(`data: ${JSON.stringify(data)}\n\n`);

      // Store the controller for this client
      clients.set(clientId, {
        write: (chunk: string) => {
          try {
            controller.enqueue(`data: ${chunk}\n\n`);
          } catch (error) {
            console.log(`[SSE] Error writing to client ${clientId}:`, error);
            clients.delete(clientId);
          }
        },
        close: () => {
          try {
            controller.close();
          } catch (error) {
            console.log(`[SSE] Error closing client ${clientId}:`, error);
          }
          clients.delete(clientId);
        }
      } as any);

      // Set up Firestore listener for this client
      const unsubscribe = adminDb.collection('inventoryStatus')
        .onSnapshot((snapshot) => {
          snapshot.docChanges().forEach((change) => {
            if (change.type === 'added' || change.type === 'modified') {
              const data = {
                type: 'inventory_update',
                inventoryItemId: change.doc.id,
                data: change.doc.data(),
                timestamp: new Date().toISOString()
              };

              // Send update to this client
              const client = clients.get(clientId);
              if (client) {
                client.write(JSON.stringify(data));
              }
            }
          });
        });

      // Clean up on disconnect
      request.signal.addEventListener('abort', () => {
        console.log(`[SSE] Client disconnected: ${clientId}`);
        unsubscribe();
        clients.delete(clientId);
      });
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Cache-Control',
    },
  });
}

// Manual trigger endpoint for testing
export async function POST(request: NextRequest) {
  const body = await request.json();
  const { inventoryItemId, quantity } = body;

  console.log(`[SSE] Manual trigger for ${inventoryItemId}: ${quantity}`);

  // Update Firestore (this will trigger the SSE updates)
  await adminDb.collection('inventoryStatus').doc(inventoryItemId).set({
    quantity: quantity,
    status: 'confirmed',
    updatedAt: Date.now()
  }, { merge: true });

  return Response.json({ success: true });
}
