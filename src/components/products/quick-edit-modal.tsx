'use client';

import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { quickUpdateInventoryAction } from '@/app/products/actions';
import type { ShopifyProduct } from '@/types/shopify';

type QuickEditModalProps = {
  product: ShopifyProduct;
  onClose: () => void;
};

/**
 * Modal for quick inventory editing without navigating to full product form.
 */
export function QuickEditModal({ product, onClose }: QuickEditModalProps) {
  const { toast } = useToast();
  const [quantity, setQuantity] = useState(product.totalInventory ?? 0);
  const [isSaving, setIsSaving] = useState(false);
  const inventoryItemId = product.variants?.edges?.[0]?.node?.inventoryItem?.id;

  const handleSave = async () => {
    if (!inventoryItemId) {
      toast({ variant: 'destructive', title: 'Error', description: 'Inventory item ID not found.' });
      return;
    }

    setIsSaving(true);
    try {
      const result = await quickUpdateInventoryAction({ inventoryItemId, quantity });
      if (result.success) {
        toast({ title: 'Success', description: `Inventory for "${product.title}" updated.` });
        onClose();
      } else {
        throw new Error(result.error || 'Failed to update inventory.');
      }
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Update Failed', description: error.message });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={true} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Quick Edit: {product.title}</DialogTitle>
          <DialogDescription>
            Update the available inventory count. This will be reflected on your Shopify store.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <Input
            type="number"
            value={quantity}
            onChange={(e) => setQuantity(parseInt(e.target.value, 10))}
            className="text-lg"
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSaving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
