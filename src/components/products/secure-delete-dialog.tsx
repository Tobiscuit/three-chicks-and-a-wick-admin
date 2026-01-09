'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { ClipboardCopy, Loader2 } from 'lucide-react';
import type { ShopifyProduct } from '@/types/shopify';

type SecureDeleteDialogProps = {
  product: ShopifyProduct;
  onDelete: (e: React.MouseEvent, productId: string, title: string) => void;
  children: React.ReactNode;
};

/**
 * Secure delete dialog requiring user to type/paste product name to confirm.
 * Includes copy button for better UX.
 */
export function SecureDeleteDialog({ product, onDelete, children }: SecureDeleteDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [confirmationText, setConfirmationText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [copied, setCopied] = useState(false);

  const expectedValue = product.title;
  const isConfirmationValid = confirmationText === expectedValue;

  const handleCopy = async () => {
    await navigator.clipboard.writeText(product.title);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDelete = async (e: React.MouseEvent) => {
    if (!isConfirmationValid) return;

    setIsDeleting(true);
    await onDelete(e, product.id, product.title);
    setIsDeleting(false);
    setIsOpen(false);
    setConfirmationText('');
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setConfirmationText('');
      setCopied(false);
    }
    setIsOpen(open);
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={handleOpenChange}>
      {children}
      <AlertDialogContent onClick={(e) => e.stopPropagation()}>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Product</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-3">
              <p>This action cannot be undone. This will permanently delete this product.</p>

              <p className="font-medium text-foreground">
                To confirm, copy and paste the product name below:
              </p>

              <div className="flex items-center gap-2 p-3 bg-muted/50 border border-dashed border-border rounded-md">
                <code className="flex-1 text-sm font-mono text-foreground break-all">
                  {product.title}
                </code>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="shrink-0 h-8 px-3"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleCopy();
                  }}
                >
                  {copied ? (
                    <>✓ Copied</>
                  ) : (
                    <>
                      <ClipboardCopy className="h-4 w-4 mr-1" /> Copy
                    </>
                  )}
                </Button>
              </div>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="py-2">
          <Input
            placeholder="Paste product name here..."
            value={confirmationText}
            onChange={(e) => setConfirmationText(e.target.value)}
            className="w-full font-mono"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={(e) => e.stopPropagation()}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={!isConfirmationValid || isDeleting}
            className="bg-red-600 hover:bg-red-700"
          >
            {isDeleting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Deleting...
              </>
            ) : (
              'Delete Product'
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
