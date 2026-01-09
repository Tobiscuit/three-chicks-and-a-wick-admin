'use client';

import { useState } from 'react';
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
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Loader2 } from 'lucide-react';

type SecureBulkDeleteDialogProps = {
  count: number;
  onConfirm: () => Promise<void>;
  children: React.ReactNode;
};

/**
 * Secure bulk delete dialog requiring user to type the count to confirm.
 */
export function SecureBulkDeleteDialog({ count, onConfirm, children }: SecureBulkDeleteDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [confirmationText, setConfirmationText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  const expectedValue = count.toString();
  const isConfirmationValid = confirmationText === expectedValue;

  const handleDelete = async () => {
    if (!isConfirmationValid) return;

    setIsDeleting(true);
    await onConfirm();
    setIsDeleting(false);
    setIsOpen(false);
    setConfirmationText('');
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setConfirmationText('');
    }
    setIsOpen(open);
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={handleOpenChange}>
      <AlertDialogTrigger asChild onClick={() => setIsOpen(true)}>
        {children}
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="text-destructive">
            ⚠️ Delete {count} Products
          </AlertDialogTitle>
          <AlertDialogDescription>
            This action <strong>cannot be undone</strong>. This will permanently delete {count}{' '}
            product{count > 1 ? 's' : ''} from your Shopify store.
            <br />
            <br />
            <strong>Security Check:</strong> Type{' '}
            <span className="font-mono bg-muted px-1 rounded">{count}</span> to confirm deletion.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="py-4">
          <Input
            placeholder={`Type: ${count}`}
            value={confirmationText}
            onChange={(e) => setConfirmationText(e.target.value)}
            className="w-full font-mono text-center text-lg"
          />
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={!isConfirmationValid || isDeleting}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isDeleting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Deleting...
              </>
            ) : (
              `Delete ${count} Products`
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
