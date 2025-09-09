"use client";

import { useEffect, useState } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export function useInventoryStatus(inventoryItemId?: string) {
  const [status, setStatus] = useState<'idle'|'syncing'|'confirmed'|'error'>('idle');
  const [quantity, setQuantity] = useState<number | null>(null);

  useEffect(() => {
    if (!inventoryItemId) {
      console.log('[useInventoryStatus] No inventory item ID provided');
      setStatus('idle');
      setQuantity(null);
      return;
    }

    // Extract the numeric ID from Shopify GID format: gid://shopify/InventoryItem/123 -> 123
    const id = String(inventoryItemId).split('/').pop() as string;
    console.log('[useInventoryStatus] ===== STARTING HOOK FOR:', id, '=====');
    console.log('[useInventoryStatus] Full inventory item ID:', inventoryItemId);

    const ref = doc(db, 'inventoryStatus', id);
    console.log('[useInventoryStatus] Created document reference for:', id);

    // Set to syncing when we start listening
    console.log('[useInventoryStatus] Setting status to syncing');
    setStatus('syncing');

    // Add timeout to prevent infinite syncing
    const timeoutId = setTimeout(() => {
      console.log('[useInventoryStatus] TIMEOUT: No response from Firestore after 5s, setting to idle');
      setStatus('idle');
      setQuantity(null);
    }, 5000);

    console.log('[useInventoryStatus] Setting up onSnapshot listener...');

    const unsub = onSnapshot(ref,
      (snap) => {
        console.log('[useInventoryStatus] ===== SNAPSHOT CALLBACK FIRED =====');
        console.log('[useInventoryStatus] Clearing timeout');
        clearTimeout(timeoutId);

        console.log('[useInventoryStatus] Document exists:', snap.exists());
        console.log('[useInventoryStatus] Document data:', snap.data());

        if (snap.exists()) {
          const data = snap.data() as any;
          const newQuantity = typeof data.quantity === 'number' ? data.quantity : null;
          const newStatus = (data.status as any) || 'confirmed';
          console.log('[useInventoryStatus] Found document with quantity:', newQuantity, 'status:', newStatus);
          setQuantity(newQuantity);
          setStatus(newStatus);
        } else {
          console.log('[useInventoryStatus] Document does not exist, setting to idle');
          setQuantity(null);
          setStatus('idle');
        }
      },
      (error) => {
        console.log('[useInventoryStatus] ===== ERROR CALLBACK FIRED =====');
        console.error('[useInventoryStatus] Firebase error:', error);
        console.log('[useInventoryStatus] Clearing timeout due to error');
        clearTimeout(timeoutId);
        setStatus('error');
      }
    );

    console.log('[useInventoryStatus] onSnapshot listener set up successfully');

    // Listen for SSE updates
    const handleSSEUpdate = (event: CustomEvent) => {
      const { inventoryItemId: updatedId, data } = event.detail;
      if (updatedId === id) {
        console.log('[useInventoryStatus] SSE update received for:', id, data);
        setQuantity(data.quantity);
        setStatus(data.status || 'confirmed');
      }
    };

    window.addEventListener('inventoryUpdate', handleSSEUpdate as EventListener);

    return () => {
      console.log('[useInventoryStatus] ===== CLEANUP: Unsubscribing =====');
      clearTimeout(timeoutId);
      unsub();
      window.removeEventListener('inventoryUpdate', handleSSEUpdate as EventListener);
    };
  }, [inventoryItemId]);

  console.log('[useInventoryStatus] Returning status:', status, 'quantity:', quantity);
  return { status, quantity };
}


