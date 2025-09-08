"use client";

import { useEffect, useState } from 'react';
import { doc, onSnapshot, getFirestore } from 'firebase/firestore';
import { app } from '@/lib/firebase';

const db = getFirestore(app);

export function useInventoryStatus(inventoryItemId?: string) {
  const [status, setStatus] = useState<'idle'|'syncing'|'confirmed'|'error'>('idle');
  const [quantity, setQuantity] = useState<number | null>(null);

  useEffect(() => {
    if (!inventoryItemId) return;
    const ref = doc(db, 'inventoryStatus', String(inventoryItemId));
    const unsub = onSnapshot(ref, (snap) => {
      if (snap.exists()) {
        const data = snap.data() as any;
        setQuantity(typeof data.quantity === 'number' ? data.quantity : null);
        setStatus((data.status as any) || 'confirmed');
      }
    });
    return () => unsub();
  }, [inventoryItemId]);

  return { status, quantity };
}


