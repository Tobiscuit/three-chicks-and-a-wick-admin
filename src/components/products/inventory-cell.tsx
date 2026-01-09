'use client';

import { useInventoryStatus } from '@/hooks/use-inventory-status';

type InventoryCellProps = {
  inventoryItemId?: string;
  fallback: number | null;
};

/**
 * Real-time inventory cell that subscribes to Firestore updates.
 * Falls back to Shopify's totalInventory when no real-time data available.
 */
export function InventoryCell({ inventoryItemId, fallback }: InventoryCellProps) {
  const { quantity } = useInventoryStatus(inventoryItemId);

  const displayValue = quantity !== null ? quantity : (fallback ?? 'N/A');

  return <span>{displayValue}</span>;
}
