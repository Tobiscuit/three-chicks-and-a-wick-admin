import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Encodes a Shopify GID to make it Firestore-safe.
 * @param gid The Shopify GID (e.g., "gid://shopify/Product/12345").
 * @returns A base64 encoded string.
 */
export function encodeShopifyId(gid: string): string {
  if (typeof window === 'undefined') {
    // Node.js environment
    return Buffer.from(gid).toString('base64');
  } else {
    // Browser environment
    return btoa(gid);
  }
}
