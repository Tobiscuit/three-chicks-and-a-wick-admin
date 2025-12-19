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
    <div className={cn("space-y-4", className)}>
      {/* Dropzone */}
      <div
        {...getRootProps()}
        className={cn(
          "relative border-2 border-dashed rounded-xl p-8 transition-all duration-200",
          "flex flex-col items-center justify-center gap-3 cursor-pointer",
          "hover:border-primary/60 hover:bg-muted/30",
          isDragActive && "border-primary bg-primary/5 scale-[1.02]",
          disabled && "opacity-50 cursor-not-allowed",
          value.length >= maxFiles && "opacity-50 cursor-not-allowed",
          hasImages ? "min-h-[120px]" : "min-h-[200px]"
        )}
      >
        <input {...getInputProps()} />
        
        {processing ? (
          <>
            <div className="h-10 w-10 rounded-full border-2 border-primary border-t-transparent animate-spin" />
            <p className="text-sm text-muted-foreground">Compressing images...</p>
          </>
        ) : (
          <>
            <div className={cn(
              "p-3 rounded-full bg-muted/50 transition-colors",
              isDragActive && "bg-primary/20"
            )}>
              <Upload className={cn(
                "h-6 w-6 text-muted-foreground transition-colors",
                isDragActive && "text-primary"
              )} />
            </div>
            <div className="text-center">
              <p className="text-sm font-medium">
                {isDragActive ? "Drop images here" : "Drag & drop product images"}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {value.length}/{maxFiles} images • 2 recommended for best AI results
              </p>
            </div>
          </>
        )}
      </div>

      {/* Preview Grid */}
      {hasImages && (
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
          {previews.map((preview, index) => (
            <div
              key={index}
              className="relative group aspect-square rounded-lg overflow-hidden border bg-muted/30"
            >
              <Image
                src={preview.preview}
                alt={`Product image ${index + 1}`}
                fill
                className="object-cover"
              />
              {/* First image badge */}
              {index === 0 && (
                <div className="absolute top-1 left-1 bg-primary text-primary-foreground text-[10px] font-medium px-1.5 py-0.5 rounded">
                  Primary
                </div>
              )}
              {/* Remove button */}
              <Button
                type="button"
                variant="destructive"
                size="icon"
                className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={(e) => {
                  e.stopPropagation();
                  removeImage(index);
                }}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          ))}
          
          {/* Add more button if under limit */}
          {value.length < maxFiles && (
            <div
              {...getRootProps()}
              className={cn(
                "aspect-square rounded-lg border-2 border-dashed",
                "flex items-center justify-center cursor-pointer",
                "hover:border-primary/60 hover:bg-muted/30 transition-colors",
                isDragActive && "border-primary bg-primary/5"
              )}
            >
              <ImageIcon className="h-6 w-6 text-muted-foreground" />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
