
"use client";

import { useState, useRef, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import Image from "next/image";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { UploadCloud, Download, Sparkles, Wand2, Loader2, Image as ImageIcon, AlertTriangle, PackagePlus, Check } from "lucide-react";
import {
  generateImageAction,
  getGalleryImagesAction,
  generateProductFromImageAction,
  composeWithGalleryAction,
  uploadImageAction,
} from "@/app/actions";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ScrollArea } from "../ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import CurrencyInput from "../ui/currency-input";
import { useRouter } from "next/navigation";
import { ImageDetailsModal } from "./image-details-modal";

const formSchema = z.object({
  primaryProductImage: z.any().refine(file => file instanceof File, "A primary product image is required."),
  secondaryProductImage: z.any().optional(),
  backgroundType: z.enum(["gallery", "generate"]).default("gallery"),
  backgroundPrompt: z.string().optional(),
  selectedBackgroundUrl: z.string().optional(),
  contextualDetails: z.string().optional(),
}).refine(data => {
  if (data.backgroundType === 'generate') {
    return !!data.backgroundPrompt && data.backgroundPrompt.length > 0;
  }
  return true;
}, {
  message: "A prompt is required to generate a background.",
  path: ["backgroundPrompt"],
}).refine(data => {
  if (data.backgroundType === 'gallery') {
    return !!data.selectedBackgroundUrl;
  }
  return true;
}, {
  message: "Please select a background from the gallery.",
  path: ["selectedBackgroundUrl"],
});


type FormValues = z.infer<typeof formSchema>;

type GalleryImage = {
  name: string;
  url: string;
};

// Step badge component for visual hierarchy
const StepBadge = ({ step }: { step: number }) => (
  <span className="inline-flex items-center justify-center w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-gradient-to-br from-primary/80 to-primary text-primary-foreground text-xs sm:text-sm font-semibold shadow-sm mr-2 sm:mr-3">
    {step}
  </span>
);

const ImageUploadArea = ({ field, preview, label, isLoading = false, form, onImageClick }: { field: any, preview: string | null, label: string, isLoading?: boolean, form?: any, onImageClick?: (url: string) => void }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };
  
  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };
  
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    
    const file = e.dataTransfer.files?.[0];
    if (file && (file.type === 'image/png' || file.type === 'image/jpeg' || file.type === 'image/webp')) {
      field.onChange(file);
      if (form) {
        form.setValue(field.name, file, { shouldDirty: true, shouldValidate: true });
      }
    }
  };
  
  return (
    <FormItem>
      <FormLabel className="text-xs sm:text-sm font-medium">{label}</FormLabel>
      <FormControl>
        <div
          className={`
            relative flex flex-col items-center justify-center p-4 sm:p-6 
            border-2 border-dashed rounded-xl cursor-pointer aspect-square 
            transition-all duration-300 ease-out
            ${isDragOver 
              ? 'border-primary bg-primary/10 scale-[1.02] shadow-lg shadow-primary/20' 
              : 'border-muted-foreground/25 hover:border-primary/50 hover:bg-accent/30'
            }
            ${preview ? 'border-solid border-primary/30' : ''}
            motion-safe:animate-in motion-safe:fade-in motion-safe:duration-500
          `}
          onClick={() => {
            if (preview && onImageClick) {
              onImageClick(preview);
            } else {
              !isLoading && fileInputRef.current?.click();
            }
          }}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          {/* Glow effect on drag */}
          {isDragOver && (
            <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 animate-pulse" />
          )}
          
          {isLoading ? (
            <div className="w-full h-full flex flex-col items-center justify-center gap-2 relative">
              <Skeleton className="w-full h-full rounded-lg" />
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
                <Loader2 className="w-5 h-5 sm:w-6 sm:h-6 animate-spin text-primary" />
                <p className="text-xs sm:text-sm text-muted-foreground font-medium">Processing...</p>
              </div>
            </div>
          ) : preview ? (
            <div className="relative w-full h-full motion-safe:animate-in motion-safe:zoom-in-95 motion-safe:duration-300">
              <Image
                src={preview}
                alt="Product preview"
                width={200}
                height={200}
                className="object-contain w-full h-full rounded-lg"
              />
              {/* Success indicator */}
              <div className="absolute top-2 right-2 w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-green-500 flex items-center justify-center shadow-lg motion-safe:animate-in motion-safe:zoom-in motion-safe:duration-200">
                <Check className="w-3 h-3 sm:w-4 sm:h-4 text-white" />
              </div>
            </div>
          ) : (
            <div className="text-center relative z-10">
              <div className={`mx-auto w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center transition-all duration-300 ${isDragOver ? 'bg-primary text-primary-foreground scale-110' : 'bg-muted'}`}>
                <UploadCloud className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>
              <p className="mt-2 sm:mt-3 text-xs sm:text-sm font-medium text-muted-foreground">
                {isDragOver ? 'Drop to upload' : 'Click or drag to upload'}
              </p>
              <p className="mt-1 text-[10px] sm:text-xs text-muted-foreground/70">
                PNG, JPG, WebP
              </p>
            </div>
          )}
          <Input
            type="file"
            className="hidden"
            ref={fileInputRef}
            accept="image/png, image/jpeg, image/webp"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) {
                field.onChange(file);
                if (form) {
                  form.setValue(field.name, file, { shouldDirty: true, shouldValidate: true });
                }
              }
            }}
            value={undefined}
          />
        </div>
      </FormControl>
      <FormMessage />
    </FormItem>
  );
};

export function ImageStudio() {
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [primaryPreview, setPrimaryPreview] = useState<string | null>(null);
  const [secondaryPreview, setSecondaryPreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [galleryImages, setGalleryImages] = useState<GalleryImage[]>([]);
  const [galleryLoading, setGalleryLoading] = useState(true);
  const [galleryError, setGalleryError] = useState<string | null>(null);
  const [showAddProductModal, setShowAddProductModal] = useState(false);
  const [imageProcessing, setImageProcessing] = useState(false);
  const [selectedImage, setSelectedImage] = useState<{ url: string, field: 'primaryProductImage' | 'secondaryProductImage' } | null>(null);
  const { toast } = useToast();

  const handleReplace = (file: File) => {
    if (!selectedImage) return;
    form.setValue(selectedImage.field, file, { shouldDirty: true, shouldValidate: true });
  };

  const handleRemove = () => {
    if (!selectedImage) return;
    form.setValue(selectedImage.field, undefined, { shouldDirty: true, shouldValidate: true });
    // Reset preview manually if needed, though useEffect should handle it
    if (selectedImage.field === 'primaryProductImage') setPrimaryPreview(null);
    if (selectedImage.field === 'secondaryProductImage') setSecondaryPreview(null);
  };

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      backgroundType: "gallery",
    },
  });

  useEffect(() => {
    const fetchGalleryImages = async () => {
      try {
        setGalleryLoading(true);
        setGalleryError(null);

        const result = await getGalleryImagesAction();

        if (result.success && result.images) {
          if (result.images.length === 0) {
            setGalleryError("No images found in the 'gallery-backgrounds' folder in Firebase Storage.");
          } else {
            setGalleryImages(result.images);
            if (result.images.length > 0) {
              form.setValue("selectedBackgroundUrl", result.images[0].url);
            }
          }
        } else {
          setGalleryError(result.error || "An unknown error occurred while fetching gallery images.");
        }

      } catch (error: any) {
        setGalleryError(error.message || "An unexpected error occurred.");
      } finally {
        setGalleryLoading(false);
      }
    };
    fetchGalleryImages();
  }, [form]);

  const primaryImageFile = form.watch('primaryProductImage');
  const secondaryImageFile = form.watch('secondaryProductImage');

  useEffect(() => {
    if (primaryImageFile instanceof File) {
      setImageProcessing(true);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPrimaryPreview(reader.result as string);
        setImageProcessing(false);
      };
      reader.readAsDataURL(primaryImageFile);
    } else {
      setPrimaryPreview(null);
      setImageProcessing(false);
    }
  }, [primaryImageFile]);

  useEffect(() => {
    if (secondaryImageFile instanceof File) {
      setImageProcessing(true);
      const reader = new FileReader();
      reader.onloadend = () => {
        setSecondaryPreview(reader.result as string);
        setImageProcessing(false);
      };
      reader.readAsDataURL(secondaryImageFile);
    } else {
      setSecondaryPreview(null);
      setImageProcessing(false);
    }
  }, [secondaryImageFile]);

  const fileToDataUrl = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const resizeAndToDataUrl = (file: File, maxSize = 1024, quality = 0.8): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (readerEvent) => {
        const image = new window.Image();
        image.onload = () => {
          let { width, height } = image;
          if (width > height) {
            if (width > maxSize) {
              height = Math.round(height * (maxSize / width));
              width = maxSize;
            }
          } else {
            if (height > maxSize) {
              width = Math.round(width * (maxSize / height));
              height = maxSize;
            }
          }

          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            return reject(new Error('Could not get canvas context'));
          }
          ctx.drawImage(image, 0, 0, width, height);
          const dataUrl = canvas.toDataURL('image/jpeg', quality);
          resolve(dataUrl);
        };
        image.onerror = reject;
        image.src = readerEvent.target?.result as string;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const onSubmit = async (values: FormValues) => {
    setIsSubmitting(true);
    setGeneratedImage(null);

    try {
      let result: { imageDataUri?: string; error?: string };

      const angle1 = await resizeAndToDataUrl(values.primaryProductImage);
      const angle2 = values.secondaryProductImage ? await resizeAndToDataUrl(values.secondaryProductImage) : undefined;

      if (values.backgroundType === 'generate') {
        result = await generateImageAction({
          background: values.backgroundPrompt!,
          angle1,
          angle2,
        });
      } else { // Gallery
        result = await composeWithGalleryAction({
          galleryBackgroundUrl: values.selectedBackgroundUrl!,
          angle1,
          angle2,
          context: values.contextualDetails,
        });
      }

      if (result.imageDataUri) {
        setGeneratedImage(result.imageDataUri);
        toast({
          title: "Image Generated",
          description: "Your new product image is ready.",
        });
      } else {
        throw new Error(result.error || "An unknown error occurred.");
      }
    } catch (error: any) {
      console.error("Generation failed:", error);
      toast({
        variant: "destructive",
        title: "Generation Failed",
        description: error.message || "Could not generate image. Please try again.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const backgroundType = form.watch('backgroundType');

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 sm:space-y-8">
        <div className="grid grid-cols-1 gap-4 sm:gap-6 lg:gap-8 lg:grid-cols-5">
          <div className="space-y-4 sm:space-y-6 lg:space-y-8 lg:col-span-2">
            <Card className="motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-left-4 motion-safe:duration-500">
              <CardHeader className="p-4 sm:p-6">
                <CardTitle className="flex items-center text-base sm:text-lg font-semibold">
                  <StepBadge step={1} />
                  Upload Your Product
                </CardTitle>
                <CardDescription className="text-xs sm:text-sm ml-8 sm:ml-10">
                  Add one or two angles for the best AI-generated result
                </CardDescription>
              </CardHeader>
              <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 p-4 sm:p-6 pt-0">
                <FormField
                  control={form.control}
                  name="primaryProductImage"
                  render={({ field }) => (
                    <ImageUploadArea
                      field={field}
                      preview={primaryPreview}
                      label="Primary Image (Required)"
                      isLoading={imageProcessing}
                      form={form}
                      onImageClick={(url) => setSelectedImage({ url, field: 'primaryProductImage' })}
                    />
                  )}
                />
                <FormField
                  control={form.control}
                  name="secondaryProductImage"
                  render={({ field }) => (
                    <ImageUploadArea
                      field={field}
                      preview={secondaryPreview}
                      label="Additional Angle (Optional)"
                      isLoading={imageProcessing}
                      form={form}
                      onImageClick={(url) => setSelectedImage({ url, field: 'secondaryProductImage' })}
                    />
                  )}
                />
              </CardContent>
            </Card>

            <Card className="motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-left-4 motion-safe:duration-500 motion-safe:delay-150">
              <CardHeader className="p-4 sm:p-6">
                <CardTitle className="flex items-center text-base sm:text-lg font-semibold">
                  <StepBadge step={2} />
                  Select Background
                </CardTitle>
                <CardDescription className="text-xs sm:text-sm ml-8 sm:ml-10">
                  Choose from our gallery or describe your vision
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4 sm:p-6 pt-0">
                <FormField
                  control={form.control}
                  name="backgroundType"
                  render={({ field }) => (
                    <Tabs
                      value={field.value}
                      onValueChange={(value) => field.onChange(value as 'gallery' | 'generate')}
                      className="w-full"
                    >
                      <TabsList className="grid w-full grid-cols-2 h-9 gap-1 p-0">
                        <TabsTrigger value="gallery" className="px-2 sm:px-3 py-1 text-xs sm:text-sm"><ImageIcon className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />Gallery</TabsTrigger>
                        <TabsTrigger value="generate" className="px-2 sm:px-3 py-1 text-xs sm:text-sm"><Wand2 className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />Create New</TabsTrigger>
                      </TabsList>
                      <TabsContent value="generate" className="mt-2">
                        <FormField
                          control={form.control}
                          name="backgroundPrompt"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-sm">Describe Your Background</FormLabel>
                              <FormControl>
                                <Textarea
                                  placeholder="e.g., A cozy rustic wooden table with soft natural lighting..."
                                  className="text-sm"
                                  {...field}
                                  disabled={backgroundType !== 'generate'}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </TabsContent>
                      <TabsContent value="gallery" className="mt-2">
                        {galleryLoading ? (
                          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-3">
                            <Skeleton className="w-full aspect-square rounded-md" />
                            <Skeleton className="w-full aspect-square rounded-md" />
                            <Skeleton className="w-full aspect-square rounded-md" />
                            <Skeleton className="w-full aspect-square rounded-md" />
                          </div>
                        ) : galleryError ? (
                          <Alert variant="destructive">
                            <AlertTriangle className="h-4 w-4" />
                            <AlertTitle>Could not load gallery</AlertTitle>
                            <AlertDescription>{galleryError}</AlertDescription>
                          </Alert>
                        ) : (
                          <FormField
                            control={form.control}
                            name="selectedBackgroundUrl"
                            render={({ field }) => (
                              <FormItem>
                                <FormControl>
                                  <ScrollArea className="h-[35vh] sm:h-[40vh] md:h-[45vh] lg:h-[50vh] w-full rounded-md border p-2 sm:p-3">
                                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-3">
                                      {galleryLoading ? (
                                        // Skeleton loaders while fetching
                                        Array.from({ length: 6 }).map((_, index) => (
                                          <div key={index} className="aspect-square">
                                            <Skeleton className="w-full h-full rounded-md animate-pulse" />
                                          </div>
                                        ))
                                      ) : (
                                        galleryImages.map((bg, index) => {
                                          const selected = field.value === bg.url;
                                          return (
                                            <div
                                              key={bg.name}
                                              className={`
                                                relative cursor-pointer group rounded-xl overflow-hidden
                                                transition-all duration-300 ease-out
                                                motion-safe:animate-in motion-safe:fade-in motion-safe:zoom-in-95
                                                ${selected 
                                                  ? 'ring-2 ring-primary ring-offset-2 ring-offset-background scale-[1.02] shadow-lg' 
                                                  : 'hover:scale-[1.03] hover:shadow-md'
                                                }
                                              `}
                                              style={{ animationDelay: `${index * 50}ms` }}
                                              onClick={() => field.onChange(bg.url)}
                                            >
                                              <Image
                                                src={bg.url}
                                                alt={bg.name}
                                                width={200}
                                                height={200}
                                                unoptimized={true}
                                                className={`
                                                  object-cover w-full h-full aspect-square 
                                                  transition-all duration-300
                                                  ${selected ? 'brightness-100' : 'group-hover:brightness-105'}
                                                `}
                                              />
                                              {/* Selection overlay with checkmark */}
                                              {selected && (
                                                <div className="absolute inset-0 bg-primary/10 flex items-center justify-center motion-safe:animate-in motion-safe:fade-in motion-safe:duration-200">
                                                  <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center shadow-lg motion-safe:animate-in motion-safe:zoom-in motion-safe:duration-200">
                                                    <Check className="w-5 h-5 text-primary-foreground" />
                                                  </div>
                                                </div>
                                              )}
                                            </div>
                                          );
                                        })
                                      )}
                                    </div>
                                  </ScrollArea>
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        )}
                      </TabsContent>
                    </Tabs>
                  )}
                />
              </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-3">
            <Card className="lg:sticky lg:top-20 motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-right-4 motion-safe:duration-500 motion-safe:delay-300">
              <CardHeader className="p-4 sm:p-6">
                <CardTitle className="flex items-center text-base sm:text-lg font-semibold">
                  <StepBadge step={3} />
                  Generate & Finalize
                </CardTitle>
                <CardDescription className="text-xs sm:text-sm ml-8 sm:ml-10">
                  Create your professional product photo
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 sm:space-y-6 p-4 sm:p-6 pt-0">
                <FormField
                  control={form.control}
                  name="contextualDetails"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm">Extra Details (Optional)</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., add a subtle pattern of vanilla beans" className="text-sm" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="space-y-3">
                  <FormLabel className="text-xs sm:text-sm font-medium">Preview</FormLabel>
                  <div className="aspect-[4/3] w-full rounded-xl border-2 border-dashed border-muted-foreground/20 bg-gradient-to-br from-muted/30 to-muted/10 flex items-center justify-center overflow-hidden">
                    {isSubmitting ? (
                      <div className="flex flex-col items-center gap-4 p-4 w-full h-full">
                        <div className="relative w-full h-full min-h-[200px] sm:min-h-[300px]">
                          <Skeleton className="w-full h-full rounded-lg" />
                          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
                            {/* Multi-step progress indicator */}
                            <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-primary/10 flex items-center justify-center">
                              <Loader2 className="h-6 w-6 sm:h-8 sm:w-8 animate-spin text-primary" />
                            </div>
                            <div className="text-center">
                              <p className="text-sm sm:text-base font-medium text-foreground">Creating your image...</p>
                              <p className="text-xs text-muted-foreground mt-1">This usually takes 10-20 seconds</p>
                            </div>
                            {/* Progress dots */}
                            <div className="flex gap-1.5 mt-2">
                              <div className="w-2 h-2 rounded-full bg-primary animate-pulse" style={{ animationDelay: '0ms' }} />
                              <div className="w-2 h-2 rounded-full bg-primary/60 animate-pulse" style={{ animationDelay: '200ms' }} />
                              <div className="w-2 h-2 rounded-full bg-primary/30 animate-pulse" style={{ animationDelay: '400ms' }} />
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : generatedImage ? (
                      <div className="relative w-full h-full motion-safe:animate-in motion-safe:fade-in motion-safe:zoom-in-95 motion-safe:duration-500">
                        <Image
                          src={generatedImage}
                          alt="Generated product"
                          width={800}
                          height={600}
                          unoptimized={true}
                          className="object-contain w-full h-full"
                        />
                        {/* Success badge */}
                        <div className="absolute top-3 right-3 px-2.5 py-1 rounded-full bg-green-500/90 backdrop-blur-sm flex items-center gap-1.5 shadow-lg motion-safe:animate-in motion-safe:slide-in-from-top-2 motion-safe:duration-300">
                          <Check className="w-3.5 h-3.5 text-white" />
                          <span className="text-xs font-medium text-white">Ready</span>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center p-6">
                        <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-muted/50 flex items-center justify-center mx-auto">
                          <Sparkles className="h-7 w-7 sm:h-8 sm:w-8 text-muted-foreground/50" />
                        </div>
                        <p className="mt-3 text-sm font-medium text-muted-foreground">Your image will appear here</p>
                        <p className="mt-1 text-xs text-muted-foreground/70">Upload a product and choose a background to get started</p>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
              <CardFooter className="flex flex-col sm:flex-row gap-2 p-4 sm:p-6">
                <Button type="submit" disabled={isSubmitting || !form.formState.isValid} className="w-full sm:flex-1">
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      <span className="hidden sm:inline">Generating...</span>
                      <span className="sm:hidden">Creating...</span>
                    </>
                  ) : (
                    <>
                      <Wand2 className="mr-2 h-4 w-4" />
                      <span className="hidden sm:inline">Generate Image</span>
                      <span className="sm:hidden">Create Image</span>
                    </>
                  )}
                </Button>
                <Button variant="secondary" type="button" disabled={!generatedImage || isSubmitting} className="w-full sm:flex-1" onClick={() => {
                  if (!generatedImage) return;
                  const link = document.createElement('a');
                  link.href = generatedImage;
                  link.download = `three-chicks-and-a-wick-image.webp`;
                  document.body.appendChild(link);
                  link.click();
                  document.body.removeChild(link);
                }}>
                  <Download className="mr-2 h-4 w-4" /> Download
                </Button>
                <Button variant="default" type="button" disabled={!generatedImage || isSubmitting} className="w-full sm:flex-1" onClick={() => setShowAddProductModal(true)}>
                  <PackagePlus className="mr-2 h-4 w-4" />
                  <span className="hidden sm:inline">Add as Product</span>
                  <span className="sm:hidden">Add Product</span>
                </Button>
              </CardFooter>
            </Card>
          </div>
        </div>
      </form>
      {showAddProductModal && generatedImage && (
        <AddProductModal
          generatedImage={generatedImage}
          onClose={() => setShowAddProductModal(false)}
          primaryImageFile={form.watch('primaryProductImage')}
          secondaryImageFile={form.watch('secondaryProductImage')}
        />
      )}
      {selectedImage && (
        <ImageDetailsModal
          isOpen={!!selectedImage}
          onClose={() => setSelectedImage(null)}
          imageUrl={selectedImage.url}
          onReplace={handleReplace}
          onRemove={handleRemove}
          title={selectedImage.field === 'primaryProductImage' ? "Primary Image" : "Secondary Image"}
        />
      )}
    </Form>
  );
}

const addProductModalSchema = z.object({
  price: z.string().refine((val) => !isNaN(parseFloat(val)) && parseFloat(val) > 0, {
    message: "Price must be a valid positive number.",
  }),
  contextualDetails: z.string().min(10, {
    message: "Please provide some details about the product (at least 10 characters).",
  }),
  quantity: z.coerce.number().int().min(0, {
    message: "Quantity must be a non-negative number.",
  }),
});

type AddProductModalValues = z.infer<typeof addProductModalSchema>;

function AddProductModal({ generatedImage, onClose, primaryImageFile, secondaryImageFile }: {
  generatedImage: string;
  onClose: () => void;
  primaryImageFile?: File;
  secondaryImageFile?: File;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [isGenerating, setIsGenerating] = useState(false);

  const form = useForm<AddProductModalValues>({
    resolver: zodResolver(addProductModalSchema),
  });

  const fileToDataUrl = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const onSubmit = async (values: AddProductModalValues) => {
    setIsGenerating(true);
    try {
      // Step 1: Upload source images in PARALLEL for speed
      const uploadPromises: Promise<string | null>[] = [];
      
      if (primaryImageFile instanceof File) {
        uploadPromises.push(
          fileToDataUrl(primaryImageFile).then(dataUrl => uploadImageAction(dataUrl))
        );
      }
      if (secondaryImageFile instanceof File) {
        uploadPromises.push(
          fileToDataUrl(secondaryImageFile).then(dataUrl => uploadImageAction(dataUrl))
        );
      }

      // Wait for all uploads in parallel
      const uploadResults = await Promise.all(uploadPromises);
      const sourceImageUrls = uploadResults.filter((url): url is string => url !== null);

      console.log('[Image Studio] Source images uploaded:', sourceImageUrls.length, sourceImageUrls);

      // Step 2: Generate product content with AI
      const result = await generateProductFromImageAction({
        imageDataUrl: generatedImage,
        price: values.price,
        creatorNotes: values.contextualDetails,
        quantity: values.quantity,
        sourceImageUrls: sourceImageUrls.length > 0 ? sourceImageUrls : undefined,
      });

      if (result.token) {
        toast({
          title: "Content Generated!",
          description: "Redirecting you to the new product page to finalize...",
        });
        router.push(`/products/new?draftToken=${result.token}`);
      } else {
        throw new Error(result.error || "Failed to create product.");
      }
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Generation Failed",
        description: error.message,
      });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Dialog open={true} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-[95vw] sm:max-w-[525px] max-h-[90vh] overflow-y-auto">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <DialogHeader>
              <DialogTitle className="text-lg sm:text-xl">Add as Product</DialogTitle>
              <DialogDescription className="text-sm">
                Tell us a few details and we'll create your product listing.
              </DialogDescription>
            </DialogHeader>
            <div className="py-4 space-y-3 sm:space-y-4">
              <Image src={generatedImage} alt="Generated product" width={525} height={400} unoptimized={true} className="rounded-lg object-contain w-full h-auto aspect-[4/3] border bg-muted" />
              <FormField
                control={form.control}
                name="price"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm">Price</FormLabel>
                    <FormControl>
                      <CurrencyInput
                        placeholder="25.00"
                        value={field.value}
                        onChange={(val) => field.onChange(val)}
                        className="text-sm"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="quantity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm">Quantity</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="100" className="text-sm" {...field} onChange={e => field.onChange(parseInt(e.target.value, 10) || 0)} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="contextualDetails"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm">Product Details</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="e.g., smells like a cozy autumn evening, with notes of spiced pear and cinnamon. Has a crackling wood wick..."
                        className="min-h-20 sm:min-h-24 text-sm"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <DialogFooter className="flex-col sm:flex-row gap-2">
              <Button variant="outline" onClick={onClose} type="button" disabled={isGenerating} className="w-full sm:w-auto">Cancel</Button>
              <Button type="submit" disabled={isGenerating} className="w-full sm:w-auto">
                {isGenerating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                <span className="hidden sm:inline">Generate and Pre-fill</span>
                <span className="sm:hidden">Create Product</span>
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
