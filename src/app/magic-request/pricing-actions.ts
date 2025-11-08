'use server';

import { getCurrentPricingConfig, previewPriceChanges, applyPriceChanges } from '@/services/magic-request-pricing';

/**
 * Server actions for Magic Request pricing management
 */

export async function getPricingConfigAction() {
  try {
    const config = await getCurrentPricingConfig();
    return { success: true, data: config };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch pricing config',
    };
  }
}

export async function previewPricingChangesAction(updates: {
  wax?: Record<string, { pricePerOzCents: number }>;
  wick?: Record<string, { costCents: number }>;
  vessel?: Record<string, { baseCostCents: number }>;
}) {
  try {
    const preview = await previewPriceChanges(updates);
    return { success: true, data: preview };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to preview changes',
    };
  }
}

export async function applyPricingChangesAction(
  updates: {
    wax?: Record<string, { pricePerOzCents: number }>;
    wick?: Record<string, { costCents: number }>;
    vessel?: Record<string, { baseCostCents: number }>;
  },
  confirmationPrice: string
): Promise<{
  success: boolean;
  variantsUpdated?: number;
  errors?: string[];
  warnings?: string[];
  error?: string;
}> {
  try {
    // Verify confirmation (user should type one of the new prices)
    const preview = await previewPriceChanges(updates);
    const hasMatchingPrice = preview.changes.some(c => c.newPrice === confirmationPrice);
    
    if (!hasMatchingPrice && preview.changes.length > 0) {
      return {
        success: false,
        error: 'Confirmation price does not match any new prices. Please type one of the new prices shown in the preview.',
      };
    }

    const result = await applyPriceChanges(updates);
    return result;
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to apply changes',
    };
  }
}

