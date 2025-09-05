
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
import { generateImageAction } from "@/app/actions";
import { useToast } from "@/hooks/use-toast";
import { ref, listAll, getDownloadURL } from "firebase/storage";
import { storage } from "@/lib/firebase";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";


const formSchema = z.object({
  productImage: z.any().refine(file => file instanceof File, "A product image is required."),
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

export function ImageStudio() {
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [productImagePreview, setProductImagePreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [galleryImages, setGalleryImages] = useState<GalleryImage[]>([]);
  const [galleryLoading, setGalleryLoading] = useState(true);
  const [galleryError, setGalleryError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
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
            const galleryRef = ref(storage, 'gallery-backgrounds');
            
            const result = await listAll(galleryRef);
            
            if (result.items.length === 0) {
                const errorMessage = "No images found in the 'gallery-backgrounds' folder in Firebase Storage. Please upload some images to use the gallery feature.";
                setGalleryError(errorMessage);
                setGalleryImages([]);
            } else {
                const urls = await Promise.all(
                    result.items.map(async (imageRef) => {
                        const url = await getDownloadURL(imageRef);
                        return { name: imageRef.name, url };
                    })
                );
                setGalleryImages(urls);
                if (urls.length > 0) {
                    form.setValue("selectedBackgroundUrl", urls[0].url);
                }
            }
        } catch (error: any) {
            let detailedError = "An unexpected error occurred while loading gallery images.";
            if (error.code) {
                switch (error.code) {
                    case 'storage/object-not-found':
                        detailedError = "The 'gallery-backgrounds' folder does not exist in your Firebase Storage bucket. Please ensure it has been created and contains images.";
                        break;
                    case 'storage/unauthorized':
                        detailedError = "You are not authorized to view the gallery images. Please check your Firebase Storage security rules to ensure they allow read access.";
                        break;
                    default:
                        detailedError = `A Firebase error occurred: ${error.message} (Code: ${error.code})`;
                }
            }
            setGalleryError(detailedError);
        } finally {
            setGalleryLoading(false);
        }
    };

    fetchGalleryImages();
  }, [form]);
  
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      form.setValue("productImage", file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setProductImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const onSubmit = async (values: FormValues) => {
    setIsSubmitting(true);
    setGeneratedImage(null);
    
    const formData = new FormData();
    formData.append('productImage', values.productImage);
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
                <CardTitle>1. Upload Product Image</CardTitle>
                <CardDescription>
                  For best results, upload a clear photo of a single product against a neutral background.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <FormField
                  control={form.control}
                  name="productImage"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <div
                          className="flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-lg cursor-pointer aspect-square hover:bg-accent/50 transition-colors"
                          onClick={() => fileInputRef.current?.click()}
                        >
                          {productImagePreview ? (
                            <Image
                              src={productImagePreview}
                              alt="Product preview"
                              width={400}
                              height={400}
                              className="object-contain w-full h-full rounded-md"
                            />
                          ) : (
                            <div className="text-center">
                              <UploadCloud className="w-12 h-12 mx-auto text-muted-foreground" />
                              <p className="mt-2 text-sm text-muted-foreground">Click to upload or drag & drop</p>
                              <p className="text-xs text-muted-foreground">PNG, JPG, WEBP</p>
                            </div>
                          )}
                          <Input
                            {...field}
                            type="file"
                            className="hidden"
                            ref={fileInputRef}
                            accept="image/png, image/jpeg, image/webp"
                            onChange={handleFileChange}
                            value={undefined} 
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>2. Choose Background</CardTitle>
                <CardDescription>Select a pre-made background or generate a new one.</CardDescription>
              </CardHeader>
              <CardContent>
                <FormField
                  control={form.control}
                  name="backgroundType"
                  render={({ field }) => (
                    <Tabs
                      value={field.value}
                      onValueChange={(value) => field.onChange(value as 'gallery' | 'generate')}
                      className="w-full"
                    >
                      <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="gallery"><ImageIcon className="mr-2"/>Gallery</TabsTrigger>
                        <TabsTrigger value="generate"><Wand2 className="mr-2"/>Generate</TabsTrigger>
                      </TabsList>
                      <TabsContent value="generate" className="mt-4">
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
                      <TabsContent value="gallery" className="mt-4">
                         {galleryLoading ? (
                            <div className="grid grid-cols-2 gap-2 h-48">
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
                                    <div className="grid grid-cols-2 gap-2 h-48 overflow-y-auto">
                                    {galleryImages.map((bg) => (
                                        <div key={bg.name} className="relative cursor-pointer group" onClick={() => field.onChange(bg.url)}>
                                            <Image
                                                src={bg.url}
                                                alt={bg.name}
                                                width={200}
                                                height={200}
                                                className={`object-cover w-full h-full rounded-md transition-all aspect-square ${field.value === bg.url ? 'ring-2 ring-primary ring-offset-2 ring-offset-background' : 'group-hover:opacity-80'}`}
                                            />
                                            {field.value === bg.url && <div className="absolute inset-0 bg-primary/30 rounded-md"/>}
                                        </div>
                                    ))}
                                    </div>
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
                <CardTitle>3. Final Touches & Generation</CardTitle>
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
                  link.download = 'three-chicks-and-a-wick-image.png';
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
