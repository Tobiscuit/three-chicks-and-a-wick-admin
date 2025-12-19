"use client";

import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { cn } from "@/lib/utils";
import { Upload, X, ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import { compressImageForAI } from "@/lib/image-compression";

interface MultiImageDropzoneProps {
  value: File[];
  onChange: (files: File[]) => void;
  maxFiles?: number;
  disabled?: boolean;
  className?: string;
}

interface ImagePreview {
  file: File;
  preview: string;
}

export function MultiImageDropzone({
  value = [],
  onChange,
  maxFiles = 6,
  disabled = false,
  className,
}: MultiImageDropzoneProps) {
  const [previews, setPreviews] = useState<ImagePreview[]>([]);
  const [processing, setProcessing] = useState(false);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (disabled) return;
    
    // Limit to maxFiles
    const totalFiles = value.length + acceptedFiles.length;
    const filesToAdd = totalFiles > maxFiles 
      ? acceptedFiles.slice(0, maxFiles - value.length)
      : acceptedFiles;
    
    if (filesToAdd.length === 0) return;

    setProcessing(true);
    
    // Compress and create previews
    const newPreviews = await Promise.all(
      filesToAdd.map(async (file) => {
        try {
          const compressed = await compressImageForAI(file);
          return { file, preview: compressed };
        } catch (err) {
          console.error('[MultiImageDropzone] Compression failed:', err);
          // Fallback to uncompressed
          return new Promise<ImagePreview>((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve({ file, preview: reader.result as string });
            reader.readAsDataURL(file);
          });
        }
      })
    );

    setPreviews(prev => [...prev, ...newPreviews]);
    onChange([...value, ...filesToAdd]);
    setProcessing(false);
  }, [value, onChange, maxFiles, disabled]);

  const removeImage = (index: number) => {
    const newFiles = value.filter((_, i) => i !== index);
    const newPreviews = previews.filter((_, i) => i !== index);
    onChange(newFiles);
    setPreviews(newPreviews);
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': ['.jpeg', '.jpg', '.png', '.webp'] },
    multiple: true,
    disabled: disabled || value.length >= maxFiles,
  });

  const hasImages = previews.length > 0;

  return (
    <div className={cn("space-y-2", className)}>
      {/* Dropzone - compact when has images */}
      <div
        {...getRootProps()}
        className={cn(
          "relative border-2 border-dashed rounded-lg transition-all duration-200",
          "flex items-center justify-center gap-2 cursor-pointer",
          "hover:border-primary/60 hover:bg-muted/30",
          isDragActive && "border-primary bg-primary/5 scale-[1.01]",
          disabled && "opacity-50 cursor-not-allowed",
          value.length >= maxFiles && "opacity-50 cursor-not-allowed",
          hasImages ? "p-3" : "p-6 flex-col"
        )}
      >
        <input {...getInputProps()} />
        
        {processing ? (
          <>
            <div className="h-5 w-5 rounded-full border-2 border-primary border-t-transparent animate-spin" />
            <p className="text-xs text-muted-foreground">Compressing...</p>
          </>
        ) : (
          <>
            <Upload className={cn(
              "text-muted-foreground transition-colors",
              hasImages ? "h-4 w-4" : "h-6 w-6",
              isDragActive && "text-primary"
            )} />
            <div className={hasImages ? "" : "text-center"}>
              <p className={cn("font-medium", hasImages ? "text-xs" : "text-sm")}>
                {isDragActive ? "Drop here" : hasImages ? `Add more (${value.length}/${maxFiles})` : "Drag & drop product images"}
              </p>
              {!hasImages && (
                <p className="text-xs text-muted-foreground mt-1">
                  2 recommended for best AI results
                </p>
              )}
            </div>
          </>
        )}
      </div>

      {/* Preview Grid */}
      {hasImages && (
        <div className="flex flex-wrap gap-2">
          {previews.map((preview, index) => (
            <div
              key={index}
              className="relative group w-16 h-16 rounded-lg overflow-hidden border bg-muted/30"
            >
              <Image
                src={preview.preview}
                alt={`Product image ${index + 1}`}
                fill
                className="object-cover"
              />
              {/* Remove button */}
              <Button
                type="button"
                variant="destructive"
                size="icon"
                className="absolute top-0.5 right-0.5 h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={(e) => {
                  e.stopPropagation();
                  removeImage(index);
                }}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
