"use client";

import { useEffect, useState } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { encodeShopifyId } from '@/lib/utils';

export function useProductImage(productId?: string) {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [status, setStatus] = useState<'idle'|'syncing'|'confirmed'|'error'>('idle');

  useEffect(() => {
    if (!productId) {
      setImageUrl(null);
      setStatus('idle');
      return;
    }

    const docId = encodeShopifyId(productId);
    console.log('[useProductImage] Starting hook for product:', docId);

    const ref = doc(db, 'productImages', docId);

    // Set to syncing when we start listening
    setStatus('syncing');

    // Add timeout to prevent infinite syncing
    const timeoutId = setTimeout(() => {
      console.log('[useProductImage] TIMEOUT: No response from Firestore after 5s');
      setStatus('idle');
    }, 5000);

    const unsub = onSnapshot(ref,
      (snap) => {
        console.log('[useProductImage] Snapshot callback fired');
        clearTimeout(timeoutId);

        if (snap.exists()) {
          const data = snap.data() as any;
          const newImageUrl = data.imageUrl || null;
          const newStatus = data.status || 'confirmed';
          
          console.log('[useProductImage] Found document with imageUrl:', newImageUrl, 'status:', newStatus);
          setImageUrl(newImageUrl);
          setStatus(newStatus);

          if (newStatus === 'confirmed') {
            setTimeout(() => {
              setStatus('idle');
            }, 3000); // Hide checkmark after 3 seconds
          }
        } else {
          console.log('[useProductImage] Document does not exist');
          setImageUrl(null);
          setStatus('idle');
        }
      },
      (error) => {
        console.error('[useProductImage] Firebase error:', error);
        clearTimeout(timeoutId);
        setStatus('error');
      }
    );

    return () => {
      console.log('[useProductImage] Cleanup: Unsubscribing');
      clearTimeout(timeoutId);
      unsub();
    };
  }, [productId]);

  return { imageUrl, status };
}
