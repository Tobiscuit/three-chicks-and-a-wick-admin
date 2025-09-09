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
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttempts = useRef(0);

  const connect = () => {
    if (reconnectAttempts.current > 5) {
      console.log('[SSE] Max reconnection attempts reached, giving up');
      return;
    }

    const clientId = `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    console.log('[SSE] Connecting to server...', clientId, `(attempt ${reconnectAttempts.current + 1})`);

    const eventSource = new EventSource(`/api/sse/inventory?clientId=${clientId}`);

    eventSource.onopen = () => {
      console.log('[SSE] Connection opened successfully');
      setIsConnected(true);
      reconnectAttempts.current = 0; // Reset on successful connection
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

      // Attempt to reconnect after a delay
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }

      reconnectAttempts.current++;
      const delay = Math.min(1000 * Math.pow(2, reconnectAttempts.current), 30000); // Exponential backoff, max 30s

      console.log(`[SSE] Scheduling reconnection in ${delay}ms`);
      reconnectTimeoutRef.current = setTimeout(() => {
        connect();
      }, delay);
    };

    eventSourceRef.current = eventSource;
  };

  useEffect(() => {
    if (!inventoryItemIds.length) return;

    connect();

    return () => {
      console.log('[SSE] Component unmounting, cleaning up');
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
      setIsConnected(false);
    };
  }, [inventoryItemIds]);

  return { isConnected, lastUpdate };
}
