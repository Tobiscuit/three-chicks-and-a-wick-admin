"use client";

import { useEffect, useState } from 'react';
import { doc, onSnapshot, getFirestore } from 'firebase/firestore';
import { app } from '@/lib/firebase';

const db = getFirestore(app);

export function useInventoryStatus(inventoryItemId?: string) {
  const [status, setStatus] = useState<'idle'|'syncing'|'confirmed'|'error'>('idle');
  const [quantity, setQuantity] = useState<number | null>(null);

  useEffect(() => {
    if (!inventoryItemId) {
      setStatus('idle');
      setQuantity(null);
      return;
    }

    // Extract the numeric ID from Shopify GID format: gid://shopify/InventoryItem/123 -> 123
    const id = String(inventoryItemId).split('/').pop() as string;
    console.log('[useInventoryStatus] Listening to inventory item:', inventoryItemId, '-> document ID:', id);

    const ref = doc(db, 'inventoryStatus', id);

    console.log('[useInventoryStatus] Listening to:', id);

    // Set to syncing when we start listening
    console.log('[useInventoryStatus] Setting initial status to syncing for:', id);
    setStatus('syncing');

    const unsub = onSnapshot(ref,
      (snap) => {
        console.log('[useInventoryStatus] Snapshot received for:', id, snap.exists() ? 'exists' : 'not exists');
        if (snap.exists()) {
          const data = snap.data() as any;
          const newQuantity = typeof data.quantity === 'number' ? data.quantity : null;
          const newStatus = (data.status as any) || 'confirmed';
          console.log('[useInventoryStatus] Data:', { quantity: newQuantity, status: data.status });
          console.log('[useInventoryStatus] Setting status to:', newStatus, 'and quantity to:', newQuantity);
          setQuantity(newQuantity);
          setStatus(newStatus);
        } else {
          console.log('[useInventoryStatus] Document does not exist');
          setQuantity(null);
          setStatus('idle');
        }
      },
      (error) => {
        console.error('[useInventoryStatus] Error:', error);
        setStatus('error');
      }
    );

    return () => {
      console.log('[useInventoryStatus] Unsubscribing from:', id);
      unsub();
    };
  }, [inventoryItemId]);

  return { status, quantity };
}


