"use client";

import { useState, useRef, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useRouter } from 'next/navigation';
import Image from "next/image";
import Link from 'next/link';

import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import CurrencyInput from "@/components/ui/currency-input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Badge } from "@/components/ui/badge";
import { ToastAction } from "@/components/ui/toast"
import { useToast } from "@/hooks/use-toast";
import { addProductAction, updateProductAction } from "@/app/products/actions";
import { uploadImageAction } from "@/app/actions";
import { Loader2, Check, ChevronsUpDown, X, Info, ArrowLeft, Plus } from "lucide-react";
import type { ShopifyCollection, ShopifyProduct } from "@/services/shopify";
import { cn } from "@/lib/utils";
import { resolveAiGeneratedProductAction } from "@/app/actions";

const productFormSchema = z.object({
  title: z.string().min(2, { message: "Title must be at least 2 characters." }),
  description: z.string().optional(),
  price: z.string().refine((val) => !isNaN(parseFloat(val)) && parseFloat(val) >= 0, {
    message: "Price must be a valid non-negative number.",
  }),
  sku: z.string().min(1, { message: "SKU is required." }),
  inventory: z.coerce.number().int().min(0, { message: "Inventory must be a non-negative number." }),
  status: z.enum(["ACTIVE", "DRAFT", "ARCHIVED"]),
  productType: z.string().optional(),
  collections: z.array(z.string()).optional(),
  tags: z.string().optional(),
  featured: z.boolean().optional(),
});

type ProductFormValues = z.infer<typeof productFormSchema>;

type ProductFormProps = {
    collections: ShopifyCollection[];
    initialData?: ShopifyProduct | null;
}

function generateSku(title: string): string {
    if (!title) return '';
    const titlePart = title
        .split(' ')
        .slice(0, 3)
        .map(word => word.substring(0, 3))
        .join('-');
    const randomPart = Math.random().toString(36).substring(2, 6);
    return `${titlePart}-${randomPart}`.substring(0, 20).toUpperCase();
}

export function ProductForm({ collections, initialData = null }: ProductFormProps) {
  
  // --- ADD THIS LOG ---
  console.log("[CLIENT Form] initialData received on page load:", initialData);
  console.log("[CLIENT Form] Inventory value from initialData:", initialData?.totalInventory);

  const router = useRouter();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [imagePreviews, setImagePreviews] = useState<string[]>(initialData?.images?.edges.map((e: any) => e.node.url) || []);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const hasFetchedAiData = useRef(false);

  const isEditMode = !!initialData;
  
  const rawPriceString = initialData?.priceRange.minVariantPrice.amount;
  const priceString = rawPriceString ? parseFloat(rawPriceString).toFixed(2) : "";
  
  const FEATURED_ALIASES = ['featured','home-page','homepage','home','home page'];
  const featuredCollection = collections.find(c => {
    const handle = (c.handle || '').toLowerCase();
    const title = (c.title || '').toLowerCase();
    return FEATURED_ALIASES.includes(handle) || FEATURED_ALIASES.includes(title);
  });

  const defaultValues: Partial<ProductFormValues> = {
      title: initialData?.title || "",
      description: initialData?.description || "",
      price: priceString,
      sku: initialData?.variants.edges[0]?.node.sku || "",
      inventory: initialData?.totalInventory || 0,
      status: initialData?.status || "ACTIVE",
      productType: initialData?.productType || "Candle",
      collections: initialData?.collections?.edges.map((e: any) => e.node.id) || [],
      tags: initialData?.tags.join(', ') || "",
      featured: (() => {
        if (!featuredCollection) return false;
        const ids = initialData?.collections?.edges.map((e: any) => e.node.id) || [];
        return ids.includes(featuredCollection.id);
      })(),
  };

  const form = useForm<ProductFormValues>({
    resolver: zodResolver(productFormSchema),
    defaultValues,
  });
  
  const { setValue, getValues, formState } = form;

  // Prefill form with AI generated data
  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const token = searchParams.get('draftToken');

    if (!token || isEditMode || hasFetchedAiData.current) {
      return;
    }

    (async () => {
        try {
            hasFetchedAiData.current = true;
            toast({ title: "🪄 Loading AI Content..." });
            
            const res = await resolveAiGeneratedProductAction(token);

            if (res.success && res.data) {
                const { title, body_html, tags, sku, price, quantity, publicImageUrl } = res.data;
                
                setValue('title', title, { shouldDirty: true });
                setValue('description', body_html, { shouldDirty: true });
                setValue('price', String(price), { shouldDirty: true });
                setValue('sku', sku, { shouldDirty: true });
                setValue('tags', tags, { shouldDirty: true });
                setValue('inventory', quantity, { shouldDirty: true });
                setValue('status', 'ACTIVE', { shouldDirty: true });

                const response = await fetch(publicImageUrl);
                const blob = await response.blob();
                const file = new File([blob], `ai-generated-${Date.now()}.jpg`, { type: 'image/jpeg' });
                
                const reader = new FileReader();
                reader.onloadend = async () => {
                  const dataUrl = reader.result as string;
                  const finalPublicUrl = await uploadImageAction(dataUrl);
                  if (finalPublicUrl) {
                    setImagePreviews(prev => [finalPublicUrl, ...prev]);
                  }
                }
                reader.readAsDataURL(file);

                toast({ 
                  title: "✅ AI Content Loaded!", 
                  description: "Review and save your new product." 
                });
                
                const newUrl = window.location.pathname;
                window.history.replaceState({}, '', newUrl);
            } else {
                throw new Error(res.error || "Could not load AI content.");
            }
        } catch (error: any) {
            console.error("[AI PREFILL] Error caught:", error);
            toast({
                variant: "destructive",
                title: "❌ Error Loading AI Content",
                description: error.message,
            });
        }
    })();
  }, [isEditMode, setValue, defaultValues, toast]);


  const handleTitleBlur = (event: React.FocusEvent<HTMLInputElement>) => {
      const titleValue = event.target.value;
      if (titleValue && !getValues('sku')) {
          setValue('sku', generateSku(titleValue), { shouldValidate: true, shouldDirty: true });
      }
  };

  const handleImageChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const files = event.target.files;
        if (!files) return;

        setIsSubmitting(true);
        toast({ title: 'Uploading images...' });

        try {
            const uploadPromises = Array.from(files).map(async file => {
                const imageDataUrl = await new Promise<string>((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onloadend = () => resolve(reader.result as string);
                    reader.onerror = reject;
                    reader.readAsDataURL(file);
                });
                return await uploadImageAction(imageDataUrl);
            });

            const uploadedUrls = (await Promise.all(uploadPromises)).filter(Boolean) as string[];
            setImagePreviews(prev => [...prev, ...uploadedUrls]);
            toast({ title: 'Upload complete!' });
        } catch (error) {
            toast({
                title: "Upload Error",
                description: "Could not upload images.",
                variant: "destructive"
            });
        } finally {
            setIsSubmitting(false);
            if(fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
    };

  const removeImage = (index: number) => {
      const newPreviews = imagePreviews.filter((_, i) => i !== index);
      setImagePreviews(newPreviews);
  };

  async function onSubmit(data: ProductFormValues) {
    setIsSubmitting(true);
    
    // --- ADD THIS LOG ---
    console.log(`[CLIENT] Form submitted. Inventory value: ${data.inventory}`);
    
    try {
      const action = isEditMode ? updateProductAction : addProductAction;
      const result = await action({
        ...data,
        id: initialData?.id,
        inventoryItemId: initialData?.variants.edges[0]?.node.inventoryItem.id,
        imageUrls: imagePreviews,
      });
      
      if (result.success) {
        toast({
          title: `Product ${isEditMode ? 'Updated' : 'Created'}!`,
          description: `"${data.title}" has been successfully saved.`,
        });
        window.location.href = '/products';
      } else {
        throw new Error(result.error || "An unknown error occurred.");
      }
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: `Failed to ${isEditMode ? 'Update' : 'Create'} Product`,
        description: error.message,
      });
    } finally {
        setIsSubmitting(false);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
                <Button variant="outline" size="icon" asChild>
                  <Link href="/products">
                    <ArrowLeft />
                    <span className="sr-only">Back to Products</span>
                  </Link>
                </Button>
                <div>
                    <h1 className="text-2xl font-semibold">{isEditMode ? 'Edit Product' : 'Add New Product'}</h1>
                    <p className="text-muted-foreground">
                        {isEditMode ? `Editing "${initialData?.title}"` : 'Fill in the details below to add a new product.'}
                    </p>
                </div>
            </div>
            <div className="flex gap-2">
                 <Button variant="outline" type="button" onClick={() => router.push('/products')}>Cancel</Button>
                 <Button type="submit" disabled={isSubmitting || !formState.isDirty}>
                    {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {isEditMode ? 'Save Changes' : 'Add Product'}
                 </Button>
            </div>
        </div>
        <TooltipProvider>
            <div className="grid gap-6 md:grid-cols-3">
            <div className="grid gap-6 md:col-span-2">
                <Card>
                <CardHeader><CardTitle>Product Details</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                    <FormField control={form.control} name="title" render={({ field }) => ( 
                        <FormItem>
                            <FormLabel>Title</FormLabel>
                            <FormControl>
                                <Input 
                                    placeholder="e.g. Lavender Dream Candle" 
                                    {...field}
                                    onBlur={handleTitleBlur} 
                                />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )} />
                    <FormField control={form.control} name="description" render={({ field }) => ( <FormItem><FormLabel>Description</FormLabel><FormControl><Textarea placeholder="Describe your product..." className="min-h-32" {...field} /></FormControl><FormMessage /></FormItem> )} />
                </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <CardTitle>Media</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-4 mb-4">
                            {imagePreviews.map((src, index) => (
                                <div key={index} className="relative aspect-square group">
                                    <Image
                                        src={src}
                                        alt={`Product image ${index + 1}`}
                                        fill
                                        className="object-cover rounded-md"
                                    />
                                    <div className="absolute top-1 right-1">
                                        <Button
                                            type="button"
                                            variant="destructive"
                                            size="icon"
                                            className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                                            onClick={() => removeImage(index)}
                                        >
                                            <X className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                            ))}
                            <div
                                className="aspect-square flex items-center justify-center border-2 border-dashed rounded-md cursor-pointer hover:border-primary transition-colors"
                                onClick={() => fileInputRef.current?.click()}
                            >
                                <div className="text-center">
                                    <Plus className="mx-auto h-8 w-8 text-muted-foreground" />
                                    <p className="text-sm text-muted-foreground mt-1">Add Image</p>
                                </div>
                            </div>
                        </div>
                        <Input
                            type="file"
                            className="hidden"
                            ref={fileInputRef}
                            onChange={handleImageChange}
                            accept="image/*"
                            multiple
                        />
                    </CardContent>
                </Card>
                <Card>
                <CardHeader><CardTitle>Pricing &amp; Inventory</CardTitle></CardHeader>
                <CardContent className="grid gap-4 sm:grid-cols-2">
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
                    <FormField control={form.control} name="inventory" render={({ field }) => (
                        <FormItem>
                            <FormLabel>Inventory</FormLabel>
                            <FormControl>
                                <Input 
                                    type="number" 
                                    placeholder="0" 
                                    {...field}
                                />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )} />
                    <FormField control={form.control} name="sku" render={({ field }) => (<FormItem><FormLabel>SKU</FormLabel><FormControl><Input placeholder="Auto-generated" {...field} /></FormControl><FormMessage /></FormItem>)} />
                </CardContent>
                </Card>
            </div>
            <div className="space-y-6">
                <Card>
                    <CardHeader>
                        <CardTitle>Product Status</CardTitle>
                    </CardHeader>
                    <CardContent>
                    <FormField control={form.control} name="status" render={({ field }) => (
                        <FormItem>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl><SelectTrigger><SelectValue placeholder="Select status" /></SelectTrigger></FormControl>
                                <SelectContent>
                                     <SelectItem value="ACTIVE">Active</SelectItem>
                                     <SelectItem value="DRAFT">Draft</SelectItem>
                                     <SelectItem value="ARCHIVED">Archived</SelectItem>
                                </SelectContent>
                            </Select>
                        <FormMessage />
                        </FormItem>
                    )} />
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader><CardTitle>Organization</CardTitle></CardHeader>
                    <CardContent className="space-y-4">
                        {featuredCollection && (
                          <FormField
                            control={form.control}
                            name="featured"
                            render={({ field }) => (
                              <FormItem className="flex items-center justify-between rounded-lg border p-3">
                                <div>
                                  <FormLabel>Featured</FormLabel>
                                </div>
                                <FormControl>
                                  <Switch
                                    checked={field.value}
                                    onCheckedChange={(checked) => {
                                      field.onChange(checked);
                                      const current = new Set(getValues('collections') || []);
                                      if (checked) {
                                        current.add(featuredCollection.id);
                                      } else {
                                        current.delete(featuredCollection.id);
                                      }
                                      setValue('collections', Array.from(current), { shouldDirty: true });
                                    }}
                                  />
                                </FormControl>
                              </FormItem>
                            )}
                          />
                        )}
                        <FormField control={form.control} name="productType" render={({ field }) => (
                            <FormItem>
                            <FormLabel>Product Type</FormLabel>
                            <FormControl><Input placeholder="e.g. Candle" {...field} /></FormControl>
                            <FormMessage />
                            </FormItem>
                        )} />
                        <FormField control={form.control} name="tags" render={({ field }) => (
                            <FormItem>
                                <FormLabel>Tags</FormLabel>
                                <FormControl><Input placeholder="e.g. Lavender, Soy" {...field} /></FormControl>
                                <FormDescription>Comma-separated.</FormDescription>
                                <FormMessage />
                            </FormItem>
                        )} />
                        <FormField control={form.control} name="collections" render={({ field }) => (
                            <FormItem className="flex flex-col">
                                <FormLabel>Collections</FormLabel>
                                <Popover>
                                    <PopoverTrigger asChild>
                                    <FormControl>
                                        <Button variant="outline" role="combobox" className="w-full justify-between text-muted-foreground">
                                            <span className="truncate">{field.value?.length ? `${field.value.length} selected` : "Select"}</span>
                                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                        </Button>
                                    </FormControl>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                                    <Command>
                                        <CommandInput placeholder="Search..." />
                                        <CommandList>
                                            <CommandEmpty>No collections.</CommandEmpty>
                                            <CommandGroup>
                                                {collections.map((c) => (
                                                    <CommandItem key={c.id} onSelect={() => {
                                                        const selected = new Set(field.value || []);
                                                        if (selected.has(c.id)) {
                                                          selected.delete(c.id);
                                                        } else {
                                                          selected.add(c.id);
                                                        }
                                                        field.onChange(Array.from(selected));
                                                    }}>
                                                        <Check className={cn("mr-2 h-4 w-4",(field.value || []).includes(c.id) ? "opacity-100" : "opacity-0")} />
                                                        {c.title}
                                                    </CommandItem>
                                                ))}
                                            </CommandGroup>
                                        </CommandList>
                                    </Command>
                                    </PopoverContent>
                                </Popover>
                                <div className="space-x-1 space-y-1 pt-2">
                                    {(field.value || []).map((id) => {
                                        const c = collections.find(c => c.id === id);
                                        return c ? (
                                            <Badge variant="secondary" key={id}>
                                                {c.title}
                                                <button type="button" className="ml-1"
                                                    onClick={() => {
                                                        field.onChange((field.value || []).filter(v => v !== id));
                                                    }}
                                                >
                                                    <X className="h-3 w-3" />
                                                </button>
                                            </Badge>
                                        ) : null
                                    })}
                                </div>
                            </FormItem>
                        )} />
                    </CardContent>
                </Card>
            </div>
            </div>
        </TooltipProvider>
      </form>
    </Form>
  );
}