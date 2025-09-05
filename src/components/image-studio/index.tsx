
"use client";

import { useState, useRef, useEffect } from "react";
import { useForm, useFormState } from "react-hook-form";
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
import { UploadCloud, Download, Sparkles, Wand2, Loader2, Image as ImageIcon, AlertTriangle } from "lucide-react";
import { generateImageAction, getGalleryImagesAction } from "@/app/actions";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ScrollArea } from "../ui/scroll-area";


// Client-side image conversion to WebP (no resizing)
async function toWebp(file: File, quality: number = 0.8): Promise<File> {
  let bitmap: ImageBitmap | null = null;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    // Fallback: read -> blob -> createImageBitmap (avoids new Image())
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
    const blobFromDataUrl = await fetch(dataUrl).then(r => r.blob());
    bitmap = await createImageBitmap(blobFromDataUrl);
  }

  if (!bitmap) throw new Error("Failed to decode image");

  const canvas = document.createElement("canvas");
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas context not available");
  ctx.drawImage(bitmap, 0, 0, bitmap.width, bitmap.height);

  const blob: Blob = await new Promise((res, rej) =>
    canvas.toBlob(b => (b ? res(b) : rej(new Error("toBlob failed"))), "image/webp", quality)
  );

  const safeName = file.name.replace(/\.[^.]+$/, ".webp");
  return new File([blob], safeName, { type: "image/webp" });
}

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

const ImageUploadArea = ({ field, preview, label }: { field: any, preview: string | null, label: string }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  return (
    <FormItem>
      <FormLabel>{label}</FormLabel>
      <FormControl>
        <div
          className="flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-lg cursor-pointer aspect-square hover:bg-accent/50 transition-colors"
          onClick={() => fileInputRef.current?.click()}
        >
          {preview ? (
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
            {...field}
            type="file"
            className="hidden"
            ref={fileInputRef}
            accept="image/png, image/jpeg, image/webp"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) {
                field.onChange(file);
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
                }
                setGalleryImages(result.images);
                if (result.images.length > 0) {
                    form.setValue("selectedBackgroundUrl", result.images[0].url);
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
            const reader = new FileReader();
            reader.onloadend = () => setPrimaryPreview(reader.result as string);
            reader.readAsDataURL(primaryImageFile);
        } else {
            setPrimaryPreview(null);
        }
   }, [primaryImageFile]);

   useEffect(() => {
        if (secondaryImageFile instanceof File) {
            const reader = new FileReader();
            reader.onloadend = () => setSecondaryPreview(reader.result as string);
            reader.readAsDataURL(secondaryImageFile);
        } else {
            setSecondaryPreview(null);
        }
   }, [secondaryImageFile]);


  const onSubmit = async (values: FormValues) => {
    setIsSubmitting(true);
    setGeneratedImage(null);

    const formData = new FormData();
    // Convert to WebP client-side to shrink payloads
    const primaryWebp = await toWebp(values.primaryProductImage);
    formData.append('primaryProductImage', primaryWebp);
    if(values.secondaryProductImage) {
      const secondaryWebp = await toWebp(values.secondaryProductImage);
      formData.append('secondaryProductImage', secondaryWebp);
    }
    formData.append('backgroundType', values.backgroundType);
    if(values.backgroundPrompt) formData.append('backgroundPrompt', values.backgroundPrompt);
    if(values.selectedBackgroundUrl) formData.append('selectedBackgroundUrl', values.selectedBackgroundUrl);
    if(values.contextualDetails) formData.append('contextualDetails', values.contextualDetails);

    try {
        const result = await generateImageAction(formData);
        if (result.success && result.imageDataUri) {
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
                                  placeholder="e.g., a serene beach at sunset with soft waves"
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
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 md:gap-3 h-[40vh] md:h-[45vh] lg:h-[50vh]">
                                <Skeleton className="w-full h-full rounded-md" />
                                <Skeleton className="w-full h-full rounded-md" />
                                <Skeleton className="w-full h-full rounded-md" />
                                <Skeleton className="w-full h-full rounded-md" />
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
                                                {galleryImages.map((bg) => (
                                                    <div key={bg.name} className="relative cursor-pointer group" onClick={() => field.onChange(bg.url)}>
                                                        <Image
                                                            src={bg.url}
                                                            alt={bg.name}
                                                            width={200}
                                                            height={200}
                                                            className={`object-cover w-full h-full rounded-md transition-all aspect-square ${field.value === bg.url ? 'ring-2 ring-primary ring-offset-2 ring-offset-background' : 'group-hover:opacity-90'}`}
                                                        />
                                                        {field.value === bg.url && <div className="absolute inset-0 bg-primary/30 rounded-md"/>}
                                                    </div>
                                                ))}
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
                            <div className="flex flex-col items-center gap-2 text-muted-foreground">
                                <Loader2 className="h-8 w-8 animate-spin" />
                                <p>Generating your masterpiece...</p>
                            </div>
                        ) : generatedImage ? (
                            <Image
                                src={generatedImage}
                                alt="Generated product"
                                width={800}
                                height={600}
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
              <CardFooter className="flex-col sm:flex-row gap-2">
                <Button type="submit" disabled={isSubmitting || !form.formState.isValid} className="w-full sm:w-auto">
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
                <Button variant="secondary" type="button" disabled={!generatedImage || isSubmitting} className="w-full sm:w-auto" onClick={() => {
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
              </CardFooter>
            </Card>
          </div>
        </div>
      </form>
    </Form>
  );
}
