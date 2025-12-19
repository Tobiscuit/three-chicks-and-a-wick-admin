
"use client";

import { useState, useRef, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import Image from "next/image";
import { cn } from "@/lib/utils";
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
import { compressImageForStorage, compressImageForAI } from "@/lib/image-compression";
import { MultiImageDropzone } from "./multi-image-dropzone";

const MAX_PRODUCT_IMAGES = 6;

const formSchema = z.object({
  productImages: z.array(z.instanceof(File)).min(1, "At least one product image is required.").max(MAX_PRODUCT_IMAGES, `Maximum ${MAX_PRODUCT_IMAGES} images allowed.`),
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
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [galleryImages, setGalleryImages] = useState<GalleryImage[]>([]);
  const [galleryLoading, setGalleryLoading] = useState(true);
  const [galleryError, setGalleryError] = useState<string | null>(null);
  const [showAddProductModal, setShowAddProductModal] = useState(false);
  const [imageProcessing, setImageProcessing] = useState(false);
  const { toast } = useToast();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      productImages: [],
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

  const productImages = form.watch('productImages') || [];

  // Compress images when they change
  useEffect(() => {
    if (productImages.length === 0) {
      setImagePreviews([]);
      return;
    }

    setImageProcessing(true);
    const compressAll = async () => {
      try {
        const previews = await Promise.all(
          productImages.map(async (file: File) => {
            try {
              return await compressImageForAI(file);
            } catch (err) {
              console.error('[Image Studio] Compression failed:', err);
              // Fallback to uncompressed
              return await new Promise<string>((resolve) => {
                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result as string);
                reader.readAsDataURL(file);
              });
            }
          })
        );
        setImagePreviews(previews);
      } finally {
        setImageProcessing(false);
      }
    };
    compressAll();
  }, [productImages]);

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

      // Use first two images from the array (if available)
      const angle1 = values.productImages[0] ? await resizeAndToDataUrl(values.productImages[0]) : undefined;
      const angle2 = values.productImages[1] ? await resizeAndToDataUrl(values.productImages[1]) : undefined;

      if (!angle1) {
        throw new Error("At least one product image is required.");
      }

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
      <form onSubmit={form.handleSubmit(onSubmit)} className="h-[calc(100vh-10rem)]">
        {/* 2-Column Layout: Controls Left, Preview Right */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 h-full">
          
          {/* LEFT COLUMN: Stacked Controls */}
          <div className="lg:col-span-2 flex flex-col gap-3 overflow-auto">
          {/* Upload Section */}
          <Card className="motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-left-4 motion-safe:duration-300">
            <CardHeader className="p-3 pb-2">
              <CardTitle className="flex items-center text-sm font-semibold">
                <StepBadge step={1} />
                Upload Product
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3 pt-0">
              <FormField
                control={form.control}
                name="productImages"
                render={({ field }) => (
                  <MultiImageDropzone
                    value={field.value || []}
                    onChange={field.onChange}
                    maxFiles={MAX_PRODUCT_IMAGES}
                    disabled={isSubmitting || imageProcessing}
                  />
                )}
              />
              {form.formState.errors.productImages && (
                <p className="text-xs text-destructive mt-1">
                  {form.formState.errors.productImages.message}
                </p>
              )}
            </CardContent>
          </Card>

          {/* Background Section */}
          <Card className="flex-1 motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-4 motion-safe:duration-300 motion-safe:delay-100">
            <CardHeader className="p-3 pb-2">
              <CardTitle className="flex items-center text-sm font-semibold">
                <StepBadge step={2} />
                Background
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3 pt-0">
              <FormField
                control={form.control}
                name="backgroundType"
                render={({ field }) => (
                  <Tabs
                    value={field.value}
                    onValueChange={(value) => field.onChange(value as 'gallery' | 'generate')}
                    className="w-full"
                  >
                      <TabsList className="grid w-full grid-cols-2 h-8 mb-2 p-1">
                      <TabsTrigger value="gallery" className="px-2 py-1 text-xs"><ImageIcon className="mr-1 h-3 w-3" />Gallery</TabsTrigger>
                      <TabsTrigger value="generate" className="px-2 py-1 text-xs"><Wand2 className="mr-1 h-3 w-3" />Create</TabsTrigger>
                    </TabsList>
                    <TabsContent value="gallery" className="mt-0">
                      {galleryLoading ? (
                          <div className="grid grid-cols-4 gap-1.5">
                            {Array.from({ length: 8 }).map((_, index) => (
                              <div key={index} className="aspect-square">
                                <Skeleton className="w-full h-full rounded" />
                              </div>
                            ))}
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
                                  <div className="grid grid-cols-4 gap-1.5">
                                      {galleryImages.map((bg, index) => {
                                        const selected = field.value === bg.url;
                                        return (
                                          <div
                                            key={bg.name}
                                            className={cn(
                                              "relative cursor-pointer rounded overflow-hidden transition-all",
                                              selected ? "ring-2 ring-primary ring-offset-1" : "hover:opacity-80"
                                            )}
                                            style={{ animationDelay: `${index * 50}ms` }}
                                            onClick={() => field.onChange(bg.url)}
                                          >
                                            <Image
                                              src={bg.url}
                                              alt={bg.name}
                                              width={80}
                                              height={80}
                                              unoptimized={true}
                                              className="object-cover w-full h-full aspect-square"
                                            />
                                            {selected && (
                                              <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                                                <Check className="w-4 h-4 text-primary" />
                                              </div>
                                            )}
                                          </div>
                                        );
                                      })}
                                  </div>
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        )}
                    </TabsContent>
                    <TabsContent value="generate" className="mt-0">
                      <FormField
                        control={form.control}
                        name="backgroundPrompt"
                        render={({ field }) => (
                          <FormItem>
                            <FormControl>
                              <Textarea
                                placeholder="Describe your background..."
                                className="text-xs min-h-[60px] resize-none"
                                {...field}
                                disabled={backgroundType !== 'generate'}
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    </TabsContent>
                  </Tabs>
                )}
              />
            </CardContent>
          </Card>

          {/* Details + Actions Section */}
          <Card className="motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-right-4 motion-safe:duration-300 motion-safe:delay-200">
            <CardHeader className="p-3 pb-2">
              <CardTitle className="flex items-center text-sm font-semibold">
                <StepBadge step={3} />
                Generate
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3 pt-0 space-y-2">
              <FormField
                control={form.control}
                name="contextualDetails"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Textarea placeholder="Extra details (optional)..." className="text-xs min-h-[80px] resize-none flex-1" {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />
              <Button type="submit" disabled={isSubmitting || !form.formState.isValid} className="w-full h-8 text-xs">
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-1.5 h-3 w-3 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Wand2 className="mr-1.5 h-3 w-3" />
                    Generate Image
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

            {/* Action Buttons */}
            {generatedImage && (
              <div className="flex gap-2">
                <Button variant="secondary" type="button" className="flex-1" onClick={() => {
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
                <Button variant="default" type="button" className="flex-1" onClick={() => setShowAddProductModal(true)}>
                  <PackagePlus className="mr-2 h-4 w-4" /> Add as Product
                </Button>
              </div>
            )}
          </div>

          {/* RIGHT COLUMN: Preview - fills remaining space */}
          <Card className="lg:col-span-3 h-full motion-safe:animate-in motion-safe:fade-in motion-safe:duration-500 motion-safe:delay-300">
            <CardContent className="p-3 h-full">
              <div className="w-full h-full rounded-lg border-2 border-dashed border-muted-foreground/20 bg-gradient-to-br from-muted/30 to-muted/10 flex items-center justify-center overflow-hidden">
              {isSubmitting ? (
                <div className="flex flex-col items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-medium">Creating your image...</p>
                    <p className="text-xs text-muted-foreground mt-1">This usually takes 10-20 seconds</p>
                  </div>
                  <div className="flex gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-primary animate-pulse" style={{ animationDelay: '0ms' }} />
                    <div className="w-2 h-2 rounded-full bg-primary/60 animate-pulse" style={{ animationDelay: '200ms' }} />
                    <div className="w-2 h-2 rounded-full bg-primary/30 animate-pulse" style={{ animationDelay: '400ms' }} />
                  </div>
                </div>
              ) : generatedImage ? (
                <div className="relative w-full h-full">
                  <Image
                    src={generatedImage}
                    alt="Generated product"
                    fill
                    unoptimized={true}
                    className="object-contain"
                  />
                  <div className="absolute top-3 right-3 px-2 py-1 rounded-full bg-green-500/90 backdrop-blur-sm flex items-center gap-1 shadow-lg">
                    <Check className="w-3 h-3 text-white" />
                    <span className="text-xs font-medium text-white">Ready</span>
                  </div>
                </div>
              ) : (
                <div className="text-center p-6">
                  <div className="w-12 h-12 rounded-full bg-muted/50 flex items-center justify-center mx-auto">
                    <Sparkles className="h-6 w-6 text-muted-foreground/50" />
                  </div>
                  <p className="mt-2 text-sm font-medium text-muted-foreground">Your image will appear here</p>
                  <p className="mt-1 text-xs text-muted-foreground/70">Upload a product and choose a background</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
        </div>
      </form>
      {showAddProductModal && generatedImage && (
        <AddProductModal
          generatedImage={generatedImage}
          onClose={() => setShowAddProductModal(false)}
          primaryImageFile={productImages[0]}
          secondaryImageFile={productImages[1]}
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
      // Step 1: Compress and upload source images in PARALLEL for speed
      const uploadPromises: Promise<string | null>[] = [];
      
      if (primaryImageFile instanceof File) {
        uploadPromises.push(
          compressImageForStorage(primaryImageFile).then(dataUrl => uploadImageAction(dataUrl))
        );
      }
      if (secondaryImageFile instanceof File) {
        uploadPromises.push(
          compressImageForStorage(secondaryImageFile).then(dataUrl => uploadImageAction(dataUrl))
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
