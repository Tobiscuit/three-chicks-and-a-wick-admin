'use server';

/**
 * Server Actions for Magic Request Deployment
 * 
 * These actions are called from the Admin Panel UI to deploy Magic Request
 * products to Shopify with progress tracking. Uses diff-based deployment
 * to only update what's changed.
 */

import { deployMagicRequestProducts, computeDeploymentDiff, type DeploymentProgress } from '@/services/magic-request-deployment';
import type { PricingConfig } from '@/services/magic-request-deployment';

// Store progress in memory (in production, use Redis or database)
const deploymentProgress = new Map<string, DeploymentProgress[]>();

export type DeployResult = {
  success: boolean;
  diff: {
    vesselsToCreate: string[];
    vesselsToUpdate: string[];
    vesselsToDisable: string[]; // Set mr.enabled=false (reversible)
    vesselsToDelete: string[];  // Actually delete from Shopify (irreversible)
    summary: string;
  };
  results: Array<{
    productId?: string;
    variantCount?: number;
    errors?: string[];
  }>;
  errors?: string[];
  message: string;
};

/**
 * Preview deployment changes (diff only, no deployment)
 */
export async function previewDeploymentAction(
  config: PricingConfig
): Promise<{ diff: { vesselsToCreate: string[]; vesselsToUpdate: string[]; vesselsToDisable: string[]; vesselsToDelete: string[]; summary: string } }> {
  const diff = await computeDeploymentDiff(config);
  return { diff };
}

/**
 * Deploy Magic Request products to Shopify
 * 
 * This is the main action called by the "Deploy to Shopify" button.
 * It computes a diff, shows what will change, then applies only necessary updates.
 */
export async function deployMagicRequestAction(
  config: PricingConfig
): Promise<DeployResult> {
  try {
    const deploymentId = `deploy-${Date.now()}`;
    
    const result = await deployMagicRequestProducts(config, (progress) => {
      // Store progress updates
      if (!deploymentProgress.has(deploymentId)) {
        deploymentProgress.set(deploymentId, []);
      }
      deploymentProgress.get(deploymentId)!.push(progress);
    });

    // Clean up progress after 5 minutes
    setTimeout(() => {
      deploymentProgress.delete(deploymentId);
    }, 5 * 60 * 1000);

    return {
      success: result.success,
      diff: result.diff,
      results: result.results.map(r => ({
        productId: r.productId,
        variantCount: r.variantCount,
        errors: r.errors,
      })),
      errors: result.errors,
      message: result.success
        ? `Successfully deployed ${result.results.length} vessel(s). ${result.diff.summary}`
        : `Deployment failed: ${result.errors?.join(', ') || 'Unknown error'}`,
    };
  } catch (error: any) {
    return {
      success: false,
      diff: { vesselsToCreate: [], vesselsToUpdate: [], vesselsToDisable: [], vesselsToDelete: [], summary: 'Error computing diff' },
      results: [],
      errors: [error.message],
      message: `Error deploying: ${error.message}`,
    };
  }
}

/**
 * Get deployment progress for a specific deployment
 */
export async function getDeploymentProgress(deploymentId: string): Promise<DeploymentProgress[]> {
  return deploymentProgress.get(deploymentId) || [];
}

