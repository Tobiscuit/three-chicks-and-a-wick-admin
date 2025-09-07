
"use server";

import { createProduct, updateProduct, getPrimaryLocationId, updateInventoryItem, updateProductVariant, createProductVariantsBulk, setInventoryQuantity, getProductById } from "@/services/shopify";
import type { CreateProductInput, ProductUpdateInput, ProductVariantInput, CreateMediaInput, NewProductVariantInput } from "@/services/shopify";
import { adminStorage } from "@/lib/firebase-admin"; // USE CENTRAL ADMIN SDK
import { v4 as uuidv4 } from 'uuid';


type ActionResult = {
  success: boolean;
  productId?: string;
  error?: string;
  errorFields?: string[];
};


async function uploadImageToFirebase(file: File): Promise<string> {
    // adminStorage is pre-initialized from our central file
    const bucket = adminStorage.bucket();
    // Sanitize the original file name to avoid spaces or unsafe URL chars
    const sanitized = file.name
        .toLowerCase()
        .replace(/[^a-z0-9.]+/g, "-")
        .replace(/-+/g, "-")
        .replace(/^-+|-+$/g, "");
    const fileName = `product-images/${uuidv4()}-${sanitized}`;
    const fileBuffer = Buffer.from(await file.arrayBuffer());

    const blob = bucket.file(fileName);
    const blobStream = blob.createWriteStream({
        metadata: {
            contentType: file.type,
        },
    });

    return new Promise((resolve, reject) => {
        blobStream.on('error', (err) => {
            console.error("[Firebase Upload Error]", err);
            reject('Failed to upload image.');
        });

        blobStream.on('finish', async () => {
            try {
                await blob.makePublic();
                const publicUrl = `https://storage.googleapis.com/${bucket.name}/${encodeURIComponent(fileName)}`;
                resolve(publicUrl);
            } catch (error) {
                 console.error("[Firebase Make Public Error]", error);
                 reject('Failed to make image public.');
            }
        });

        blobStream.end(fileBuffer);
    });
}


export async function addProductAction(formData: FormData): Promise<ActionResult> {
    const title = formData.get('title') as string;
    const description = formData.get('description') as string | null;
    const price = formData.get('price') as string;
    const sku = formData.get('sku') as string;
    const status = formData.get('status') as "ACTIVE" | "DRAFT" | "ARCHIVED";
    const inventoryStr = formData.get('inventory') as string;
    const imageFile = formData.get('image') as File | null;
    const productType = formData.get('productType') as string | undefined;
    const tags = formData.get('tags') as string | undefined;
    const collections = formData.getAll('collections') as string[];

    if (!title || !price || !sku || !status || !inventoryStr) {
        return { success: false, error: "Missing required product fields." };
    }
    
    try {
        const inventory = parseInt(inventoryStr, 10);
        if (isNaN(inventory) || inventory < 0) {
            return { success: false, error: "Inventory must be a non-negative number." };
        }

        const locationId = await getPrimaryLocationId();
        if (!locationId) {
            return { success: false, error: "Could not determine the primary store location for inventory." };
        }
        
        let imageUrl: string | null = null;
        if (imageFile && imageFile.size > 0) {
            const candidateUrl = await uploadImageToFirebase(imageFile);
            try {
                const head = await fetch(candidateUrl, { method: 'HEAD' });
                if (head.ok) {
                    imageUrl = candidateUrl;
                } else {
                    console.warn("[Image HEAD check failed]", candidateUrl, head.status, head.statusText);
                }
            } catch (e) {
                console.warn("[Image HEAD check error]", e);
            }
        }
        
        const descriptionHtml = description 
            ? description.split('\n').filter(line => line.trim() !== '').map(line => `<p>${line}</p>`).join('')
            : undefined;

        const productInput: CreateProductInput = {
            title,
            ...(descriptionHtml && { descriptionHtml }),
            productType,
            status,
            tags: tags ? tags.split(',').map(tag => tag.trim()) : undefined,
            collectionsToJoin: collections.length > 0 ? collections : undefined,
            // Explicitly define default option name so variant options map cleanly
            // Shopify auto-creates "Title" if omitted, but we set it for clarity
            // @ts-expect-error: Our local type may not declare options, but Shopify accepts it
            options: ["Title"],
        };
        
        let mediaInput: CreateMediaInput[] | undefined = undefined;
        if (imageUrl) {
            mediaInput = [{
                alt: `${title} product image`,
                mediaContentType: "IMAGE" as const, 
                originalSource: imageUrl, 
            }];
        }

        // Step 1: Create the product
        const createResult = await createProduct(productInput, mediaInput);

        const createErrors = createResult.productCreate.userErrors;
        if (createErrors.length > 0) {
            const errorMessages = createErrors.map(e => e.message).join(', ');
            throw new Error(`Shopify returned errors on product creation: ${errorMessages}`);
        }
        
        const productId = createResult.productCreate.product?.id;
        if (!productId) {
            throw new Error("Product was created but its ID could not be retrieved.");
        }
        
        // Step 2: Add the variant to the newly created product
        const variants: ProductVariantInput[] = [{
            // For single-variant products, Shopify expects option values matching the product's options
            // Default option is "Title" with value "Default Title"
            // @ts-expect-error: options exists on ProductVariantsBulkInput
            options: ["Default Title"],
            price,
            // sku must be set via inventoryItemUpdate after creation; not allowed on ProductVariantsBulkInput
            inventoryItem: { tracked: true },
            inventoryQuantities: [{
                availableQuantity: inventory,
                locationId: locationId,
            }],
        }];

        const variantResult = await createProductVariantsBulk(productId, variants);
        const variantErrors = variantResult.productVariantsBulkCreate.userErrors;

        if (variantErrors.length > 0) {
             const errorMessages = variantErrors.map(e => e.message).join(', ');
             // Note: Here we have a product that was created but the variant failed.
             // A real-world app might need logic to delete the orphaned product.
             // For now, we'll just report the error.
             throw new Error(`Product was created, but variant creation failed: ${errorMessages}`);
        }
        // Set SKU after variant creation using the inventory item id
        try {
            const productAfter = await getProductById(productId);
            const invItemId = productAfter?.variants.edges[0]?.node.inventoryItem.id;
            if (invItemId) {
                await updateInventoryItem({ id: invItemId, sku });
            }
        } catch (e) {
            console.warn("[Post-create SKU update warning]", e);
        }

        return { success: true, productId };

    } catch (e: any) {
        console.error("[addProductAction Error]", e);
        return { success: false, error: e.message || "An unexpected error occurred while creating the product." };
    }
}

export async function updateProductAction(formData: FormData): Promise<ActionResult> {
    const id = formData.get('id') as string;
    const title = formData.get('title') as string;
    const description = formData.get('description') as string | null;
    const status = formData.get('status') as "ACTIVE" | "DRAFT" | "ARCHIVED";
    const productType = formData.get('productType') as string | undefined;
    const tags = formData.get('tags') as string | undefined;
    const collections = formData.getAll('collections') as string[];

    // Variant-specific fields
    const price = formData.get('price') as string;
    const sku = formData.get('sku') as string;
    const inventoryStr = formData.get('inventory') as string;
    const variantId = formData.get('variantId') as string;
    const inventoryItemId = formData.get('inventoryItemId') as string;

    if (!id || !variantId || !inventoryItemId || !title || !price || !sku || !status || !inventoryStr) {
        return { success: false, error: "Missing required fields for update." };
    }
    
    try {
        const inventory = parseInt(inventoryStr, 10);
         if (isNaN(inventory) || inventory < 0) {
            return { success: false, error: "Inventory must be a non-negative number." };
        }

        const locationId = await getPrimaryLocationId();
        if (!locationId) {
            throw new Error("Could not determine primary location for inventory update.");
        }

        const descriptionHtml = description 
            ? description.split('\n').filter(line => line.trim() !== '').map(line => `<p>${line}</p>`).join('')
            : "";

        const productInput: ProductUpdateInput = {
            id,
            title,
            descriptionHtml,
            productType,
            status,
            tags: tags ? tags.split(',').map(tag => tag.trim()) : [],
            collectionsToJoin: collections,
        };

        const variantInput: ProductVariantInput = {
            id: variantId,
            price,
            inventoryItem: { tracked: true },
            // inventoryQuantities cannot be used on update; handled via inventorySetQuantities
        };

        // Execute product + variant + sku updates in parallel (no inventory quantities here)
        const [productResult, variantResult, skuResult] = await Promise.all([
            updateProduct(productInput),
            updateProductVariant(id, variantInput),
            updateInventoryItem({ id: inventoryItemId, sku }),
        ]);

        // After product/variant/sku, set inventory to desired absolute quantity
        const invSet = await setInventoryQuantity({
            inventoryItemId: inventoryItemId,
            locationId: locationId,
            quantity: inventory,
        });

        const productErrors = productResult.productUpdate?.userErrors || [];
        const variantErrors = variantResult.productVariantsBulkUpdate?.userErrors || [];
        const skuErrors = skuResult.inventoryItemUpdate?.userErrors || [];
        const invErrors = invSet.inventorySetQuantities?.userErrors || [];
        const allErrors = [...productErrors, ...variantErrors, ...skuErrors, ...invErrors];

        if (allErrors.length > 0) {
            const errorMessages = allErrors.map(e => e.message).join(', ');
            const errorFields = allErrors.map(e => e.field?.join('.')).filter(Boolean) as string[];
            return { success: false, error: `Shopify errors: ${errorMessages}`, errorFields };
        }

        return { success: true, productId: productResult.productUpdate?.product?.id };

    } catch (e: any) {
        console.error("[updateProductAction Error]", e);
        return { success: false, error: e.message || "An unexpected error occurred while updating the product." };
    }
}
