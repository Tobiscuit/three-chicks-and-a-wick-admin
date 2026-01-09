'use client';

/**
 * SortableImage Component
 * 
 * Drag-and-drop sortable image with lightbox preview and delete confirmation.
 * Used in product form for managing product images.
 */

import { useState } from 'react';
import Image from 'next/image';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
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
import { X, ZoomIn } from 'lucide-react';

type SortableImageProps = {
  url: string;
  index: number;
  onRemove: (index: number) => void;
};

export function SortableImage({ url, index, onRemove }: SortableImageProps) {
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: url,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : 1,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <Dialog open={isLightboxOpen} onOpenChange={setIsLightboxOpen}>
      <div
        ref={setNodeRef}
        style={style}
        {...attributes}
        {...listeners}
        className="relative aspect-square group cursor-grab active:cursor-grabbing touch-none"
      >
        <Image
          src={url}
          alt={`Product image ${index + 1}`}
          fill
          className="object-cover rounded-md transition-transform duration-200 group-hover:scale-[1.02]"
          draggable={false}
        />

        {/* Zoom button - bottom left corner */}
        <div className="absolute bottom-1 left-1 z-10">
          <DialogTrigger asChild>
            <Button
              type="button"
              variant="secondary"
              size="icon"
              className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity bg-black/60 hover:bg-black/80 border-none"
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation();
                setIsLightboxOpen(true);
              }}
            >
              <ZoomIn className="h-4 w-4 text-white" />
            </Button>
          </DialogTrigger>
        </div>

        {/* Delete button with confirmation - top right corner */}
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <div className="absolute top-1 right-1 z-10">
              <Button
                type="button"
                variant="destructive"
                size="icon"
                className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                onPointerDown={(e) => e.stopPropagation()}
                onClick={(e) => e.stopPropagation()}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Remove Image?</AlertDialogTitle>
              <AlertDialogDescription>
                This image will be removed from the product. You can re-upload it later if needed.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={() => onRemove(index)}>Remove</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      {/* Lightbox Modal */}
      <DialogContent className="max-w-4xl max-h-[90vh] p-0 overflow-hidden bg-black/95 border-none">
        <div className="relative w-full h-[80vh] flex items-center justify-center">
          <Image
            src={url}
            alt={`Product image ${index + 1} - Full size`}
            fill
            className="object-contain"
            sizes="(max-width: 1200px) 100vw, 1200px"
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
