'use server';

/**
 * Server Actions for Strategy Page
 * 
 * These wrap server-only functions for use in client components.
 */

import { getBusinessSnapshot } from '@/services/shopify';

/**
 * Get business data snapshot for strategy generation
 * This wraps the server-only function for client component use.
 */
export async function getBusinessSnapshotAction() {
  'use server';
  return await getBusinessSnapshot();
}
