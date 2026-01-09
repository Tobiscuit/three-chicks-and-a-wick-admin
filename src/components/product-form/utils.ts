/**
 * Product Form Utilities
 * 
 * Helper functions for product form operations.
 */

/**
 * Generate a unique SKU from a product title.
 * Format: First 3 chars of first 3 words + random suffix
 */
export function generateSku(title: string): string {
  if (!title) return '';
  
  const titlePart = title
    .split(' ')
    .slice(0, 3)
    .map((word) => word.substring(0, 3))
    .join('-');
  
  const randomPart = Math.random().toString(36).substring(2, 6);
  
  return `${titlePart}-${randomPart}`.substring(0, 20).toUpperCase();
}

/**
 * Featured collection aliases to check for.
 */
export const FEATURED_ALIASES = ['featured', 'home-page', 'homepage', 'home', 'home page'];
