'use server';

import { getCurrentPricingConfig, previewPriceChanges, applyPriceChanges } from '@/services/magic-request-pricing';

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '');
}

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

export type VariantCombination = {
  id: string;
  container: string;
  vesselName: string;
  sizeOz: number;
  wax: string;
  wick: string;
  price: string;
  priceCents: number;
  marginPct: number;
  handle: string;
};

export async function getAvailableVariantCombosAction(): Promise<{
  success: boolean;
  data?: VariantCombination[];
  error?: string;
}> {
  try {
    const config = await getCurrentPricingConfig();
    console.log(
      '[Variants] Pricing config loaded',
      `vessels=${Object.keys(config.vessels).length}`,
      `waxes=${Object.keys(config.waxes).length}`,
      `wicks=${Object.keys(config.wicks).length}`
    );
    const variants: VariantCombination[] = [];

    for (const [vesselKey, vesselConfig] of Object.entries(config.vessels)) {
      const match = vesselKey.match(/^(.+?)\s+(\d+)oz$/i);
      const vesselName = match ? match[1].trim() : vesselKey;
      const sizeOz = match ? parseInt(match[2], 10) : vesselConfig.sizeOz;
      const marginPct = vesselConfig.marginPct ?? 20;
      const handle = slugify(vesselKey);

      for (const [waxName, waxConfig] of Object.entries(config.waxes)) {
        for (const [wickName, wickConfig] of Object.entries(config.wicks)) {
          const baseCostCents =
            vesselConfig.baseCostCents +
            wickConfig.costCents +
            waxConfig.pricePerOzCents * sizeOz;
          const finalPriceCents = Math.round(
            baseCostCents * (1 + marginPct / 100)
          );

          variants.push({
            id: `${handle}-${slugify(waxName)}-${slugify(wickName)}`,
            container: vesselKey,
            vesselName,
            sizeOz,
            wax: waxName,
            wick: wickName,
            price: (finalPriceCents / 100).toFixed(2),
            priceCents: finalPriceCents,
            marginPct,
            handle,
          });
        }
      }
    }

    console.log('[Variants] Generated combinations:', variants.length);

    variants.sort((a, b) => {
      if (a.container !== b.container) {
        return a.container.localeCompare(b.container);
      }
      if (a.wax !== b.wax) {
        return a.wax.localeCompare(b.wax);
      }
      return a.wick.localeCompare(b.wick);
    });

    return { success: true, data: variants };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Failed to generate variant combinations';
    console.error('[Variants] Error generating combinations:', errorMessage);
    return {
      success: false,
      error: errorMessage,
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

