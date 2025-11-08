'use server';

import { deployMagicRequestVessel, type PricingConfig, type VesselConfig, type WaxConfig, type WickConfig } from '@/services/magic-request-deployment';
import { getCurrentPricingConfig } from '@/services/magic-request-pricing';
import { fetchShopify } from '@/services/shopify';

/**
 * Server actions for vessel management
 */

export async function addVesselAction(vessel: {
  name: string;
  sizeOz: number;
  baseCostCents: number;
  marginPct: number;
  supplier?: string;
}): Promise<{ success: boolean; productId?: string; error?: string }> {
  try {
    // 1. Check for duplicate (product with same handle already exists)
    const handle = `${vessel.name.toLowerCase().replace(/\s+/g, '-')}-${vessel.sizeOz}oz`;
    const checkQuery = `
      query ($identifier: ProductIdentifierInput!) {
        productByIdentifier(identifier: $identifier) {
          id
          title
        }
      }
    `;
    
    const existing = await fetchShopify<{ productByIdentifier?: { id: string; title: string } | null }>(checkQuery, { identifier: { handle } });
    if (existing.productByIdentifier) {
      return {
        success: false,
        error: `Vessel "${vessel.name} ${vessel.sizeOz}oz" already exists in Shopify`,
      };
    }

    // 2. Get current pricing config to build full config
    const currentConfig = await getCurrentPricingConfig();
    
    // 3. Create PricingConfig with new vessel
    // Use full "VesselName SizeOz" format as key (matches getCurrentPricingConfig)
    const vesselKey = `${vessel.name} ${vessel.sizeOz}oz`;
    
    // Convert existing vessels to VesselConfig format (add name property)
    const existingVessels: Record<string, VesselConfig> = {};
    for (const [key, config] of Object.entries(currentConfig.vessels)) {
      // Extract name from key (e.g., "Mason Jar 16oz" -> "Mason Jar")
      const match = key.match(/^(.+?)\s+\d+oz$/);
      const vesselName = match ? match[1] : key;
      
      existingVessels[key] = {
        name: vesselName,
        sizeOz: config.sizeOz,
        baseCostCents: config.baseCostCents,
        marginPct: config.marginPct,
        supplier: undefined, // Existing vessels don't have supplier in pricing config
        status: 'enabled',
      };
    }
    
    // Convert waxes and wicks to proper format
    const waxes: Record<string, WaxConfig> = {};
    for (const [waxName, config] of Object.entries(currentConfig.waxes)) {
      waxes[waxName] = {
        name: waxName,
        pricePerOzCents: config.pricePerOzCents,
      };
    }
    
    const wicks: Record<string, WickConfig> = {};
    for (const [wickName, config] of Object.entries(currentConfig.wicks)) {
      wicks[wickName] = {
        name: wickName,
        costCents: config.costCents,
      };
    }
    
    const pricingConfig: PricingConfig = {
      vessels: {
        [vesselKey]: {
          name: vessel.name,
          sizeOz: vessel.sizeOz,
          baseCostCents: vessel.baseCostCents,
          marginPct: vessel.marginPct,
          supplier: vessel.supplier,
          status: 'enabled',
        },
        ...existingVessels, // Include existing vessels
      },
      waxes,
      wicks,
      marginPct: vessel.marginPct, // Use vessel margin or global default
      supplier: vessel.supplier || 'Unknown',
      inventoryQuantity: null, // Let deployment service use default
    };

    // 4. Deploy vessel immediately
    const result = await deployMagicRequestVessel(vessel.name, pricingConfig);
    
    if (result.success && result.productId) {
      return {
        success: true,
        productId: result.productId,
      };
    } else {
      return {
        success: false,
        error: result.errors?.join(', ') || 'Failed to deploy vessel',
      };
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to add vessel',
    };
  }
}

export async function updateVesselAction(
  oldVesselKey: string,
  vessel: {
    name: string;
    sizeOz: number;
    baseCostCents: number;
    marginPct: number;
    supplier?: string;
  }
): Promise<{ success: boolean; error?: string }> {
  try {
    // For now, updating a vessel means:
    // 1. Update the metafields on the existing product
    // 2. If name/size changed, it's effectively a new vessel (old one should be disabled)
    
    // TODO: Implement update logic
    // This could involve:
    // - If name/size unchanged: just update metafields
    // - If name/size changed: create new vessel, disable old one
    
    return {
      success: false,
      error: 'Vessel update not yet implemented. Please delete and recreate if needed.',
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update vessel',
    };
  }
}

export async function deleteVesselAction(vesselKey: string): Promise<{ success: boolean; error?: string }> {
  try {
    // Extract vessel name and size from key (format: "VesselName SizeOz")
    const match = vesselKey.match(/^(.+?)\s+(\d+)oz$/);
    if (!match) {
      return {
        success: false,
        error: 'Invalid vessel key format',
      };
    }

    const [, name, sizeOz] = match;
    
    // TODO: Implement delete logic
    // Options:
    // 1. Delete product from Shopify (irreversible)
    // 2. Set status to 'deleted' in metafield (soft delete)
    // 3. Use deployment service's disable/delete functionality
    
    return {
      success: false,
      error: 'Vessel deletion not yet implemented. Use deployment service to delete vessels.',
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete vessel',
    };
  }
}

export async function checkVesselExistsAction(vesselName: string, sizeOz: number): Promise<{ exists: boolean; productId?: string }> {
  try {
    const handle = `${vesselName.toLowerCase().replace(/\s+/g, '-')}-${sizeOz}oz`;
    const query = `
      query ($identifier: ProductIdentifierInput!) {
        productByIdentifier(identifier: $identifier) {
          id
          title
        }
      }
    `;
    
    const result = await fetchShopify<{ productByIdentifier?: { id: string; title: string } | null }>(query, { identifier: { handle } });
    
    if (result.productByIdentifier) {
      return {
        exists: true,
        productId: result.productByIdentifier.id,
      };
    }
    
    return { exists: false };
  } catch (error) {
    // If error, assume it doesn't exist (fail open for validation)
    return { exists: false };
  }
}

