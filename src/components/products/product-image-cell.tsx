'use client';

import Image from 'next/image';
import { useProductImage } from '@/hooks/use-product-image';

type ProductImageCellProps = {
  productId: string;
  fallbackImageUrl?: string;
  isCardView?: boolean;
};

/**
 * Product image cell with real-time Firestore updates.
 * Falls back to Shopify's featuredImage when no real-time data available.
 */
export function ProductImageCell({ productId, fallbackImageUrl, isCardView = false }: ProductImageCellProps) {
  const { imageUrl } = useProductImage(productId);

  const displayImageUrl =
    imageUrl || fallbackImageUrl || (isCardView ? 'https://placehold.co/300x300' : 'https://placehold.co/64x64');

  return (
    <Image
      alt="Product"
      className={
        isCardView
          ? 'aspect-square object-cover w-full transition-transform group-hover:scale-105'
          : 'aspect-square rounded-md object-cover'
      }
      height={isCardView ? 300 : 64}
      src={displayImageUrl}
      width={isCardView ? 300 : 64}
    />
  );
}
