
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
import { UploadCloud, Download, Sparkles, Wand2, Loader2, Image as ImageIcon, AlertTriangle, PackagePlus } from "lucide-react";
import {
  generateImageAction,
  getGalleryImagesAction,
  generateProductFromImageAction,
  composeWithGalleryAction,
} from "@/app/actions";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ScrollArea } from "../ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import CurrencyInput from "../ui/currency-input";
import { useRouter } from "next/navigation";

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

const ImageUploadArea = ({ field, preview, label, isLoading = false, form }: { field: any, preview: string | null, label: string, isLoading?: boolean, form?: any }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  return (
    <FormItem>
      <FormLabel>{label}</FormLabel>
      <FormControl>
        <div
          className="flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-lg cursor-pointer aspect-square hover:bg-accent/50 transition-colors"
          onClick={() => !isLoading && fileInputRef.current?.click()}
        >
          {isLoading ? (
            <div className="w-full h-full flex flex-col items-center justify-center gap-2">
              <Skeleton className="w-full h-full rounded-md animate-pulse" />
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Processing...</p>
              </div>
            </div>
          ) : preview ? (
            <Image
              src={preview}
              alt="Product preview"
              width={200}
              height={200}
              className="object-contain w-full h-full rounded-md"
            />
          ) : (
            <div className="text-center">
              <UploadCloud className="w-10 h-10 mx-auto text-muted-foreground" />
              <p className="mt-2 text-sm text-muted-foreground">Click to upload</p>
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
                // Trigger form dirty state
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
  const { toast } = useToast();

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
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-5">
          <div className="space-y-8 lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>1. Upload Product Images</CardTitle>
                <CardDescription>
                  Provide one or two angles of your product for the most accurate results.
                </CardDescription>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-4">
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
                      />
                    )}
                  />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>2. Choose Background</CardTitle>
                <CardDescription>Select a pre-made background or generate a new one.</CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <FormField
                  control={form.control}
                  name="backgroundType"
                  render={({ field }) => (
                    <Tabs
                      value={field.value}
                      onValueChange={(value) => field.onChange(value as 'gallery' | 'generate')}
                      className="w-full"
                    >
                      <TabsList className="h-9 gap-1 p-0">
                        <TabsTrigger value="gallery" className="px-3 py-1 text-sm"><ImageIcon className="mr-2"/>Gallery</TabsTrigger>
                        <TabsTrigger value="generate" className="px-3 py-1 text-sm"><Wand2 className="mr-2"/>Generate</TabsTrigger>
                      </TabsList>
                      <TabsContent value="generate" className="mt-2">
                        <FormField
                          control={form.control}
                          name="backgroundPrompt"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Background Prompt</FormLabel>
                              <FormControl>
                                <Textarea
                                  placeholder="Describe the background you want to create..."
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
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 md:gap-3">
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
                                        <ScrollArea className="h-[40vh] md:h-[45vh] lg:h-[50vh] w-full rounded-md border p-2 md:p-3">
                                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 md:gap-3">
                                                {galleryLoading ? (
                                                    // Skeleton loaders while fetching
                                                    Array.from({ length: 6 }).map((_, index) => (
                                                        <div key={index} className="aspect-square">
                                                            <Skeleton className="w-full h-full rounded-md animate-pulse" />
                                                        </div>
                                                    ))
                                                ) : (
                                                    galleryImages.map((bg) => {
                                                    const selected = field.value === bg.url;
                                                    return (
                                                        <div
                                                            key={bg.name}
                                                            className="relative cursor-pointer group rounded-md p-1 bg-background"
                                                            onClick={() => field.onChange(bg.url)}
                                                        >
                                                            <Image
                                                                src={bg.url}
                                                                alt={bg.name}
                                                                width={200}
                                                                height={200}
                                                                unoptimized={true}
                                                                className={`object-cover w-full h-full rounded-md transition-all aspect-square ${selected ? '' : 'group-hover:opacity-90'}`}
                                                            />
                                                            {selected && (
                                                                <>
                                                                    <div className="pointer-events-none absolute inset-1 rounded-md outline outline-2 outline-primary" />
                                                                    <div className="pointer-events-none absolute inset-1 rounded-md bg-primary/20" />
                                                                </>
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
            <Card className="sticky top-20">
              <CardHeader>
                <CardTitle>3. Final Touches &amp; Generation</CardTitle>
                <CardDescription>Add optional details and generate your final image.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <FormField
                  control={form.control}
                  name="contextualDetails"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Contextual Details (Optional)</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., a subtle pattern of vanilla beans" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="space-y-2">
                    <FormLabel>Result</FormLabel>
                    <div className="aspect-[4/3] w-full rounded-lg border bg-card-foreground/5 flex items-center justify-center overflow-hidden">
                        {isSubmitting ? (
                            <div className="flex flex-col items-center gap-4">
                                <div className="relative w-full h-[400px]">
                                    <Skeleton className="w-full h-full rounded-lg animate-pulse" />
                                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-muted-foreground">
                                        <Loader2 className="h-8 w-8 animate-spin" />
                                        <p>Generating your masterpiece...</p>
                                    </div>
                                </div>
                            </div>
                        ) : generatedImage ? (
                            <Image
                                src={generatedImage}
                                alt="Generated product"
                                width={800}
                                height={600}
                                unoptimized={true}
                                className="object-contain w-full h-full"
                            />
                        ) : (
                            <div className="text-center text-muted-foreground">
                                <Sparkles className="h-10 w-10 mx-auto"/>
                                <p className="mt-2">Your generated image will appear here</p>
                            </div>
                        )}
                    </div>
                </div>
              </CardContent>
              <CardFooter className="flex flex-wrap gap-2">
                <Button type="submit" disabled={isSubmitting || !form.formState.isValid} className="flex-1 min-w-0">
                  {isSubmitting ? (
                    <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Generating...
                    </>
                  ) : (
                    <>
                        <Wand2 className="mr-2"/> Generate Image
                    </>
                  )}
                </Button>
                <Button variant="secondary" type="button" disabled={!generatedImage || isSubmitting} className="flex-1 min-w-0" onClick={() => {
                  if(!generatedImage) return;
                  const link = document.createElement('a');
                  link.href = generatedImage;
                  link.download = `three-chicks-and-a-wick-image.webp`;
                  document.body.appendChild(link);
                  link.click();
                  document.body.removeChild(link);
                }}>
                  <Download className="mr-2"/> Download
                </Button>
                 <Button variant="default" type="button" disabled={!generatedImage || isSubmitting} className="flex-1 min-w-0" onClick={() => setShowAddProductModal(true)}>
                    <PackagePlus className="mr-2"/> Add as Product with AI
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

    const onSubmit = async (values: AddProductModalValues) => {
        setIsGenerating(true);
        try {
            // Get source images from the parent form
            const sourceImages = [];
            if (primaryImageFile instanceof File) {
                const primaryDataUrl = await fileToDataUrl(primaryImageFile);
                sourceImages.push(primaryDataUrl);
            }
            if (secondaryImageFile instanceof File) {
                const secondaryDataUrl = await fileToDataUrl(secondaryImageFile);
                sourceImages.push(secondaryDataUrl);
            }

            const result = await generateProductFromImageAction({
                imageDataUrl: generatedImage,
                price: values.price,
                creatorNotes: values.contextualDetails,
                quantity: values.quantity,
                sourceImages: sourceImages.length > 0 ? sourceImages : undefined,
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
            <DialogContent className="sm:max-w-[525px]">
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)}>
                        <DialogHeader>
                            <DialogTitle>Add as Product with AI</DialogTitle>
                            <DialogDescription>
                                Provide a few details, and we'll generate the product listing for you.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="py-4 space-y-4">
                            <Image src={generatedImage} alt="Generated product" width={525} height={400} unoptimized={true} className="rounded-lg object-contain w-full h-auto aspect-[4/3] border bg-muted" />
                            <FormField
                                control={form.control}
                                name="price"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Price</FormLabel>
                                        <FormControl>
                                            <CurrencyInput
                                                placeholder="25.00"
                                                value={field.value}
                                                onChange={(val) => field.onChange(val)}
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
                                        <FormLabel>Quantity</FormLabel>
                                        <FormControl>
                                            <Input type="number" placeholder="100" {...field} onChange={e => field.onChange(parseInt(e.target.value, 10) || 0)} />
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
                                        <FormLabel>Contextual Details</FormLabel>
                                        <FormControl>
                                            <Textarea
                                                placeholder="e.g., smells like a cozy autumn evening, with notes of spiced pear and cinnamon. Has a crackling wood wick..."
                                                className="min-h-24"
                                                {...field}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={onClose} type="button" disabled={isGenerating}>Cancel</Button>
                            <Button type="submit" disabled={isGenerating}>
                                {isGenerating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Generate and Pre-fill
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}
