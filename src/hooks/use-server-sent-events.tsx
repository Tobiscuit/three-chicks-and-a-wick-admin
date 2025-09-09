"use client";

import { useEffect, useRef, useState } from 'react';

interface SSEMessage {
  type: 'connection' | 'inventory_update';
  message?: string;
  inventoryItemId?: string;
  data?: any;
  timestamp: string;
}

export function useServerSentEvents(inventoryItemIds: string[]) {
  const [isConnected, setIsConnected] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<string | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);

  useEffect(() => {
    if (!inventoryItemIds.length) return;

    const clientId = `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    console.log('[SSE] Connecting to server...', clientId);

    const eventSource = new EventSource(`/api/sse/inventory?clientId=${clientId}`);

    eventSource.onopen = () => {
      console.log('[SSE] Connection opened');
      setIsConnected(true);
    };

    eventSource.onmessage = (event) => {
      try {
        const data: SSEMessage = JSON.parse(event.data);
        console.log('[SSE] Received message:', data);

        if (data.type === 'connection') {
          console.log('[SSE] Connected successfully:', data.message);
        } else if (data.type === 'inventory_update') {
          const { inventoryItemId } = data;
          if (inventoryItemId && inventoryItemIds.includes(inventoryItemId)) {
            console.log('[SSE] Inventory update for tracked item:', inventoryItemId, data.data);
            setLastUpdate(new Date().toISOString());

            // Dispatch custom event that our inventory hook can listen to
            window.dispatchEvent(new CustomEvent('inventoryUpdate', {
              detail: {
                inventoryItemId,
                data: data.data
              }
            }));
          }
        }
      } catch (error) {
        console.error('[SSE] Error parsing message:', error);
      }
    };

    eventSource.onerror = (error) => {
      console.error('[SSE] Connection error:', error);
      setIsConnected(false);
    };

    eventSourceRef.current = eventSource;

    return () => {
      console.log('[SSE] Cleaning up connection');
      eventSource.close();
      setIsConnected(false);
    };
  }, [inventoryItemIds]);

  return { isConnected, lastUpdate };
}
