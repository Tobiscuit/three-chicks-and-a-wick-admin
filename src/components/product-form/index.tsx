
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
import { Loader2, UploadCloud, Check, ChevronsUpDown, X, Info, ArrowLeft, Copy } from "lucide-react";
import type { ShopifyCollection, ShopifyProduct } from "@/services/shopify";
import { cn } from "@/lib/utils";
import { toWebpAndResize } from "@/lib/image";
import { resolveProductPrefillImage, resolveAiGeneratedProductAction } from "@/app/actions";

const productFormSchema = z.object({
  title: z.string().min(2, { message: "Title must be at least 2 characters." }),
  description: z.string().optional(),
  price: z.string().refine((val) => !isNaN(parseFloat(val)) && parseFloat(val) >= 0, {
    message: "Price must be a valid non-negative number.",
  }),
  sku: z.string().min(1, { message: "SKU is required." }),
  inventory: z.coerce.number().int().min(0, { message: "Inventory must be a non-negative number." }),
  status: z.enum(["ACTIVE", "DRAFT", "ARCHIVED"]),
  image: z.any().optional(),
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
  const router = useRouter();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(initialData?.featuredImage?.url || null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const hasFetchedAiData = useRef(false);

  const isEditMode = !!initialData;
  
  const rawPriceString = initialData?.priceRange.minVariantPrice.amount;
  const priceString = rawPriceString !== undefined
    ? (() => {
        const num = parseFloat(rawPriceString);
        return isNaN(num) ? "" : num.toFixed(2);
      })()
    : "";
  
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
      image: initialData?.featuredImage?.url || null,
      productType: initialData?.productType || "Candle",
      collections: initialData?.collections?.edges.map(e => e.node.id) || [],
      tags: initialData?.tags.join(', ') || "",
      featured: (() => {
        const ids = initialData?.collections?.edges.map(e => e.node.id) || [];
        return featuredCollection ? ids.includes(featuredCollection.id) : false;
      })(),
  };

  const form = useForm<ProductFormValues>({
    resolver: zodResolver(productFormSchema),
    defaultValues,
  });
  
  const { setValue, getValues, formState } = form;
  // Prefill image by token (from Image Studio)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');
    if (!token || isEditMode) return;
    (async () => {
      try {
        const res = await resolveProductPrefillImage(token);
        if (!res.success || !res.url) return;
        const response = await fetch(res.url);
        const blob = await response.blob();
        const rawFile = new File([blob], `prefill-${Date.now()}.webp`, { type: blob.type || 'image/webp' });
        console.log('[ProductForm prefill] original bytes:', rawFile.size);
        const optimized = await toWebpAndResize(rawFile, 1600, 0.82);
        console.log('[ProductForm prefill] optimized bytes:', optimized.size);
        setValue('image', optimized, { shouldValidate: true, shouldDirty: true });
        const reader = new FileReader();
        reader.onloadend = () => setImagePreview(reader.result as string);
        reader.readAsDataURL(optimized);
      } catch {}
    })();
  }, [isEditMode, setValue]);

  // Prefill form with AI generated data
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('ai-token');
    if (!token || isEditMode) return;

    if (hasFetchedAiData.current) return; // Prevent multiple fetches

    (async () => {
        try {
            hasFetchedAiData.current = true; // Set flag immediately
            toast({ title: "Loading AI Content..." });
            const data = await resolveAiGeneratedProductAction(token);

            if (data) {
                form.reset({
                    title: data.title,
                    description: data.body_html,
                    price: data.price,
                    sku: data.sku,
                    tags: data.tags,
                });
                setImagePreview(data.publicImageUrl);
                toast({ title: "AI Content Loaded!" });
                // Clean the URL
                const newUrl = window.location.pathname;
                window.history.replaceState({}, '', newUrl);
            } else {
                toast({
                    title: "Error: Could not load AI content",
                    description: "The AI-generated draft could not be found. It may have expired.",
                    variant: "destructive",
                });
            }
        } catch (error) {
            console.error('Failed to resolve AI token', error);
            toast({
                variant: "destructive",
                title: "Error",
                description: "Could not load AI content.",
            });
        }
    })();
  }, [isEditMode, setValue, toast, form, defaultValues]);


  const handleTitleBlur = (event: React.FocusEvent<HTMLInputElement>) => {
      const titleValue = event.target.value;
      const skuValue = getValues('sku');

      // Generate SKU only if the title has a value and the SKU is currently empty.
      if (titleValue && !skuValue) {
          const newSku = generateSku(titleValue);
          setValue('sku', newSku, { shouldValidate: true, shouldDirty: true });
      }
  };


  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      try {
        console.log('[ProductForm] original image size (bytes):', file.size);
        const optimized = await toWebpAndResize(file, 1600, 0.82);
        console.log('[ProductForm] optimized image size (bytes):', optimized.size);
        form.setValue("image", optimized, { shouldValidate: true, shouldDirty: true });
        const reader = new FileReader();
        reader.onloadend = () => {
          setImagePreview(reader.result as string);
        };
        reader.readAsDataURL(optimized);
      } catch (e) {
        console.warn('[ProductForm] optimization failed, using original', e);
        form.setValue("image", file, { shouldValidate: true, shouldDirty: true });
        const reader = new FileReader();
        reader.onloadend = () => setImagePreview(reader.result as string);
        reader.readAsDataURL(file);
      }
    }
  };

  async function onSubmit(data: ProductFormValues) {
    setIsSubmitting(true);

    const formData = new FormData();
    if (isEditMode && initialData) {
        const variant = initialData.variants.edges[0]?.node;
        if (!variant) {
             toast({
                variant: "destructive",
                title: "Update Failed",
                description: "Product variant data is missing.",
            });
            setIsSubmitting(false);
            return;
        }
        formData.append('id', initialData.id);
        formData.append('variantId', variant.id);
        formData.append('inventoryItemId', variant.inventoryItem.id);
    }
    
    formData.append('title', data.title);
    if(data.description) formData.append('description', data.description);
    formData.append('price', String(data.price));
    formData.append('sku', data.sku);
    formData.append('status', data.status);
    formData.append('inventory', String(data.inventory));
    
    if (data.image && typeof data.image !== 'string') {
      formData.append('image', data.image);
    }

    if (data.productType) formData.append('productType', data.productType);
    if (data.tags) formData.append('tags', data.tags);
    if (data.collections) {
        data.collections.forEach(id => formData.append('collections', id));
    }
    // When editing, compute collections to leave (so toggling featured off is reflected)
    if (isEditMode && initialData) {
        const original = new Set((initialData.collections?.edges || []).map(e => e.node.id));
        const current = new Set(data.collections || []);
        const toLeave: string[] = [];
        original.forEach(id => { if (!current.has(id)) toLeave.push(id); });
        toLeave.forEach(id => formData.append('collectionsToLeave', id));
    }


    try {
      const action = isEditMode ? updateProductAction : addProductAction;
      const result = await action({
        ...data,
        id: initialData?.id,
        imageUrl: imagePreview,
      });
      
      if (result.success) {
        toast({
          title: `Product ${isEditMode ? 'Updated' : 'Created'}!`,
          description: `"${data.title}" has been successfully saved.`,
        });

        // Use a full page reload to bypass the client-side router cache
        window.location.href = '/products';
      } else {
        throw new Error(result.error || "An unknown error occurred.");
      }
    } catch (error: any) {
      const errorMessage = error.message || "An unknown error occurred.";
      toast({
        variant: "destructive",
        title: `Failed to ${isEditMode ? 'Update' : 'Create'} Product`,
        description: <pre className="mt-2 w-[340px] rounded-md bg-slate-950 p-4"><code className="text-white">{errorMessage}</code></pre>,
        action: (
           <ToastAction
                altText="Copy"
                onClick={() => {
                    navigator.clipboard.writeText(errorMessage);
                    toast({ description: "Error message copied to clipboard." });
                }}
            >
                <Copy className="h-4 w-4" />
                Copy
            </ToastAction>
        )
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
                        <CardDescription>Add or replace the featured image. An image is optional.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <FormField control={form.control} name="image" render={({ field }) => (
                            <FormItem>
                            <FormControl>
                                <div className="flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-lg cursor-pointer aspect-square hover:bg-accent/50 transition-colors" onClick={() => fileInputRef.current?.click()} >
                                {imagePreview ? (
                                    <Image src={imagePreview} alt="Product image preview" width={400} height={400} className="object-contain w-full h-full rounded-md" />
                                ) : (
                                    <div className="text-center">
                                    <UploadCloud className="w-12 h-12 mx-auto text-muted-foreground" />
                                    <p className="mt-2 text-sm text-muted-foreground">Click to upload product image</p>
                                    </div>
                                )}
                                <Input {...field} type="file" className="hidden" ref={fileInputRef} accept="image/png, image/jpeg, image/gif, image/webp" onChange={handleFileChange} value={undefined} />
                                </div>
                            </FormControl>
                            <FormMessage />
                            </FormItem>
                        )}
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
                    <FormField control={form.control} name="sku" render={({ field }) => (<FormItem><FormLabel>SKU (Stock Keeping Unit)</FormLabel><FormControl><Input placeholder="Auto-generated if left empty" {...field} /></FormControl><FormMessage /></FormItem>)} />
                    <FormField control={form.control} name="inventory" render={({ field }) => (<FormItem className="sm:col-span-2"><FormLabel>Available Quantity</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>)} />
                </CardContent>
                </Card>
            </div>
            <div className="space-y-6">
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            Product Status
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <button type="button" className="focus:outline-none">
                                        <Info className="h-4 w-4 text-muted-foreground" />
                                    </button>
                                </TooltipTrigger>
                                <TooltipContent side="right" className="max-w-xs">
                                    <ul className="list-disc pl-4 space-y-2 text-left">
                                        <li><b>Active:</b> Visible and available for purchase on your store.</li>
                                        <li><b>Draft:</b> Hidden from your store. Use for products you're still working on.</li>
                                        <li><b>Archived:</b> Hidden from your store and admin. Use for past products.</li>
                                    </ul>
                                </TooltipContent>
                            </Tooltip>
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                    <FormField control={form.control} name="status" render={({ field }) => (
                        <FormItem>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl><SelectTrigger><SelectValue placeholder="Select product status" /></SelectTrigger></FormControl>
                                <SelectContent>
                                     <SelectItem value="ACTIVE">
                                        Active
                                    </SelectItem>
                                    <SelectItem value="DRAFT">
                                        Draft
                                    </SelectItem>
                                    <SelectItem value="ARCHIVED">
                                        Archived
                                    </SelectItem>
                                </SelectContent>
                            </Select>
                        <FormMessage />
                        </FormItem>
                    )} />
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <CardTitle>Product Organization</CardTitle>
                        <CardDescription>
                            Categorize your product to make it easier for customers to find and for you to manage.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {featuredCollection && (
                          <FormField
                            control={form.control}
                            name="featured"
                            render={({ field }) => (
                              <FormItem className="flex items-center justify-between rounded-lg border p-3">
                                <div>
                                  <FormLabel>Featured on Homepage</FormLabel>
                                  <FormDescription>Toggle to add/remove from the "{featuredCollection.title}" collection used on the storefront home page.</FormDescription>
                                </div>
                                <FormControl>
                                  <Switch
                                    checked={field.value}
                                    onCheckedChange={(checked) => {
                                      field.onChange(checked);
                                      const current = new Set(form.getValues('collections') || []);
                                      if (checked) current.add(featuredCollection.id);
                                      else current.delete(featuredCollection.id);
                                      form.setValue('collections', Array.from(current), { shouldDirty: true });
                                    }}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        )}
                        <FormField control={form.control} name="productType" render={({ field }) => (
                            <FormItem>
                            <FormLabel>Product Type</FormLabel>
                            <FormControl><Input placeholder="e.g. Candle, Wax Melt" {...field} /></FormControl>
                            <FormMessage />
                            </FormItem>
                        )} />
                        <FormField control={form.control} name="tags" render={({ field }) => (
                            <FormItem>
                                <FormLabel>Tags</FormLabel>
                                <FormControl><Input placeholder="e.g. Lavender, Soy, Handmade" {...field} /></FormControl>
                                <FormDescription>Comma-separated values.</FormDescription>
                                <FormMessage />
                            </FormItem>
                        )} />
                        <FormField control={form.control} name="collections" render={({ field }) => (
                            <FormItem className="flex flex-col">
                                <FormLabel>Collections</FormLabel>
                                <Popover>
                                    <PopoverTrigger asChild>
                                    <FormControl>
                                        <Button variant="outline" role="combobox" className={cn("w-full justify-between", !field.value?.length && "text-muted-foreground")}>
                                            <span className="truncate">{field.value?.length ? `${field.value.length} selected` : "Select collections"}</span>
                                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                        </Button>
                                    </FormControl>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                                    <Command>
                                        <CommandInput placeholder="Search collections..." />
                                        <CommandList>
                                            <CommandEmpty>No collections found.</CommandEmpty>
                                            <CommandGroup>
                                                {collections.map((collection) => (
                                                    <CommandItem key={collection.id} onSelect={() => {
                                                        const selected = field.value || [];
                                                        const isSelected = selected.includes(collection.id);
                                                        if (isSelected) {
                                                            field.onChange(selected.filter((id) => id !== collection.id));
                                                        } else {
                                                            field.onChange([...selected, collection.id]);
                                                        }
                                                    }}>
                                                        <Check className={cn("mr-2 h-4 w-4",(field.value || []).includes(collection.id) ? "opacity-100" : "opacity-0")} />
                                                        {collection.title}
                                                    </CommandItem>
                                                ))}
                                            </CommandGroup>
                                        </CommandList>
                                    </Command>
                                    </PopoverContent>
                                </Popover>
                                <div className="space-x-1 space-y-1 pt-2">
                                    {(field.value || []).map((collectionId) => {
                                        const collection = collections.find(c => c.id === collectionId);
                                        return collection ? (
                                            <Badge variant="secondary" key={collectionId}>
                                                {collection.title}
                                                <button type="button" className="ml-1 rounded-full outline-none ring-offset-background focus:ring-2 focus:ring-ring focus:ring-offset-2"
                                                    onClick={() => {
                                                        const newValue = (field.value || []).filter(id => id !== collectionId);
                                                        field.onChange(newValue);

                                                    }}
                                                >
                                                    <X className="h-3 w-3 text-muted-foreground hover:text-foreground" />
                                                </button>
                                            </Badge>
                                        ) : null
                                    })}
                                </div>
                                <FormMessage />
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
