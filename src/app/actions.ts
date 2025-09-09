
"use server";

import { composeCandleWithGeneratedBackground } from "@/ai/flows/compose-candle-with-generated-background";
import { generateCustomCandleBackground } from "@/ai/flows/generate-custom-candle-background";
import { adminApp, adminAuth, adminStorage } from "@/lib/firebase-admin"; // USE CENTRAL ADMIN SDK
import { SecretManagerServiceClient } from '@google-cloud/secret-manager';
import { v4 as uuidv4 } from 'uuid';
import { adminDb } from './lib/firebase-admin';
import { GoogleGenerativeAI } from "@google/generative-ai";
import { fetchShopify } from '@/services/shopify';


type ActionResult = {
  success: boolean;
  imageDataUri?: string;
  error?: string;
};


// This function now fetches the secret from Secret Manager directly.
export async function checkAuthorization(idToken: string | null) {
  if (!idToken) {
    console.log("[Auth Check] No ID token provided to server action.");
    return { isAuthorized: false, error: "No ID token provided." };
  }

  let decodedToken;
  try {
    // adminAuth is already initialized from the central file
    console.log('[Auth Check] Verifying ID token...');
    decodedToken = await adminAuth.verifyIdToken(idToken);
    console.log('[Auth Check] ID token verified. UID:', decodedToken.uid, 'Email:', decodedToken.email);
  } catch (error) {
    console.error("[Auth Check] Error verifying ID token:", error);
    return { isAuthorized: false, error: "Invalid or expired ID token." };
  }

  const userEmail = decodedToken.email;
  if (!userEmail) {
      console.warn("[Auth Check] Token is valid but does not contain an email address.");
      return { isAuthorized: false, error: "Token is missing email." };
  }

  const secretName = "AUTHORIZED_EMAILS";
  let rawAuthorizedEmails: string | undefined;

  // 1) Prefer environment variable (works on Vercel): AUTHORIZED_EMAILS="a@x.com,b@y.com"
  const envAuthorized = process.env.AUTHORIZED_EMAILS;
  if (envAuthorized && envAuthorized.trim().length > 0) {
    console.log("[Auth Check] Using AUTHORIZED_EMAILS from environment variables.");
    rawAuthorizedEmails = envAuthorized;
  } else {
    // 2) Fallback to Secret Manager (for Firebase App Hosting)
    const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
    if (!projectId) {
      console.error("[Auth Check] Project ID not set and AUTHORIZED_EMAILS env missing. Cannot fetch secrets.");
      return { isAuthorized: false, error: "Server configuration error." };
    }

    try {
      console.log("[Auth Check] AUTHORIZED_EMAILS env missing; fetching from Secret Manager...");
      const client = new SecretManagerServiceClient();
      const name = `projects/${projectId}/secrets/${secretName}/versions/latest`;
      const [version] = await client.accessSecretVersion({ name });
      rawAuthorizedEmails = version.payload?.data?.toString();
      if (!rawAuthorizedEmails) {
        console.error(`[Auth Check] Secret '${secretName}' is empty.`);
        return { isAuthorized: false, error: "Authorization list is empty." };
      }
    } catch (error: any) {
      console.error(`[Auth Check] Failed to fetch secret '${secretName}' from Secret Manager:`, error?.message || error);
      return { isAuthorized: false, error: "Could not retrieve authorization list." };
    }
  }

  const authorizedEmails = rawAuthorizedEmails.split(',').map(email => email.trim().toLowerCase());
  const lowercasedUserEmail = userEmail.toLowerCase();
  
  console.log(`[Auth Check] Verifying user against authorized list. Found ${authorizedEmails.length} authorized emails.`);
  console.log(`[Auth Check] Authorized list from secret: [${authorizedEmails.join(", ")}]`);

  const isAuthorized = authorizedEmails.includes(lowercasedUserEmail);

  if (isAuthorized) {
    console.log(`[Auth Check] SUCCESS: Authorized access for user: ${userEmail}`);
  } else {
    console.warn(`[Auth Check] DENIED: Unauthorized access attempt by user: ${userEmail}`);
    console.warn(`[Auth Check] Reason: The user's email was not found in the authorized list.`);
  }

  return { isAuthorized, error: isAuthorized ? undefined : `User ${userEmail} is not in the authorized list.` };
}

const toDataURL = (buffer: Buffer, mimeType: string) => `data:${mimeType};base64,${buffer.toString("base64")}`;

export async function generateImageAction(formData: FormData): Promise<ActionResult> {
  const primaryProductImage = formData.get('primaryProductImage') as File | null;
  const secondaryProductImage = formData.get('secondaryProductImage') as File | null;
  const backgroundType = formData.get('backgroundType') as 'gallery' | 'generate' | null;
  const backgroundPrompt = formData.get('backgroundPrompt') as string | null;
  const selectedBackgroundUrl = formData.get('selectedBackgroundUrl') as string | null;
  const contextualDetails = formData.get('contextualDetails') as string | null;

  if (!primaryProductImage) {
    return { success: false, error: "Primary product image is missing." };
  }
  if (!backgroundType) {
    return { success: false, error: "Background type is missing." };
  }

  try {
    const primaryProductPhotoDataUri = toDataURL(Buffer.from(await primaryProductImage.arrayBuffer()), primaryProductImage.type);
    let secondaryProductPhotoDataUri: string | undefined = undefined;
    if (secondaryProductImage) {
        secondaryProductPhotoDataUri = toDataURL(Buffer.from(await secondaryProductImage.arrayBuffer()), secondaryProductImage.type);
    }


    if (backgroundType === 'generate') {
      if (!backgroundPrompt) {
        return { success: false, error: "Background prompt is required for generation." };
      }

      const result = await generateCustomCandleBackground({
        primaryProductPhotoDataUri,
        secondaryProductPhotoDataUri,
        backgroundPrompt,
        ...(contextualDetails && { contextualDetails }),
      });

      if (!result.compositeImageDataUri) {
         throw new Error("AI failed to generate a composite image.");
      }

      return { success: true, imageDataUri: result.compositeImageDataUri };

    } else if (backgroundType === 'gallery') {
      if (!selectedBackgroundUrl) {
        return { success: false, error: "A gallery background must be selected." };
      }

      const result = await composeCandleWithGeneratedBackground({
        primaryCandleImage: primaryProductPhotoDataUri,
        secondaryCandleImage: secondaryProductPhotoDataUri,
        generatedBackground: selectedBackgroundUrl,
        ...(contextualDetails && { contextualDetails }),
      });

      if (!result.compositeImage) {
         throw new Error("AI failed to compose the image.");
      }

      return { success: true, imageDataUri: result.compositeImage };

    } else {
      return { success: false, error: "Invalid background type specified." };
    }

  } catch (e: any) {
    console.error("[generateImageAction Error]", e);
    return { success: false, error: e.message || "An unexpected error occurred during image generation." };
  }
}

type PrefillTokenResult = {
  success: boolean;
  token?: string;
  error?: string;
}

export async function stashProductPrefillImage(dataUri: string): Promise<PrefillTokenResult> {
  try {
    if (!dataUri?.startsWith('data:')) {
      return { success: false, error: 'Invalid image data.' };
    }
    const [meta, base64] = dataUri.split(',');
    const mimeMatch = /data:(.*?);base64/.exec(meta || '');
    const mimeType = mimeMatch?.[1] || 'image/webp';
    const ext = mimeType.split('/')[1] || 'webp';
    const token = uuidv4();
    const fileName = `prefill-product-images/${token}.${ext}`;
    const buffer = Buffer.from(base64, 'base64');

    const bucket = adminStorage.bucket();
    const file = bucket.file(fileName);
    await file.save(buffer, { contentType: mimeType, resumable: false, public: false });

    // Auto-expire via lifecycle rules is ideal; for now we rely on periodic cleanup
    return { success: true, token };
  } catch (e: any) {
    console.error('[stashProductPrefillImage Error]', e);
    return { success: false, error: e.message || 'Failed to stash prefill image.' };
  }
}

type ResolvePrefillResult = {
  success: boolean;
  url?: string;
  error?: string;
}

export async function resolveProductPrefillImage(token: string): Promise<ResolvePrefillResult> {
  try {
    if (!token) return { success: false, error: 'Missing token.' };
    const bucket = adminStorage.bucket();
    const [files] = await bucket.getFiles({ prefix: `prefill-product-images/${token}` });
    const file = files[0];
    if (!file) return { success: false, error: 'Token not found or expired.' };
    const [url] = await file.getSignedUrl({ action: 'read', expires: Date.now() + 15 * 60 * 1000 });
    return { success: true, url };
  } catch (e: any) {
    console.error('[resolveProductPrefillImage Error]', e);
    return { success: false, error: e.message || 'Failed to resolve prefill image.' };
  }
}

type CreateUploadUrlResult = {
  success: boolean;
  token?: string;
  uploadUrl?: string;
  error?: string;
}

export async function createPrefillUploadUrl(contentType: string): Promise<CreateUploadUrlResult> {
  try {
    const ext = (contentType.split('/')[1] || 'webp').toLowerCase();
    const token = uuidv4();
    const fileName = `prefill-product-images/${token}.${ext}`;
    const bucket = adminStorage.bucket();

    // Ensure CORS allows browser PUTs from our admin app origin
    try {
      const meta = await bucket.getMetadata();
      const currentCors = meta[0].cors || [];
      const origin = process.env.NEXT_PUBLIC_APP_ORIGIN || 'https://three-chicks-and-a-wick-admin.vercel.app';
      const needRule = !currentCors.some((r:any)=> (r.origin || []).includes(origin) && (r.method || []).includes('PUT'));
      if (needRule) {
        const updated = [
          ...currentCors,
          { origin: [origin, 'http://localhost:3000'], method: ['PUT','GET','HEAD','OPTIONS'], responseHeader: ['Content-Type','x-goog-resumable'], maxAgeSeconds: 3600 },
        ];
        await bucket.setCors(updated);
      }
    } catch (e) {
      console.warn('[createPrefillUploadUrl] CORS ensure warning:', (e as any)?.message || e);
    }
    const file = bucket.file(fileName);
    const [url] = await file.getSignedUrl({
      action: 'write',
      expires: Date.now() + 15 * 60 * 1000,
      contentType,
    });
    return { success: true, token, uploadUrl: url };
  } catch (e: any) {
    console.error('[createPrefillUploadUrl Error]', e);
    return { success: false, error: e.message || 'Failed to create upload URL.' };
  }
}
type GalleryActionResult = {
    success: boolean;
    images?: { name: string; url: string }[];
    error?: string;
    bucketName?: string;
};


export async function getGalleryImagesAction(): Promise<GalleryActionResult> {
    console.log("--------------------------------------------------");
    console.log("[getGalleryImagesAction] START: Using central Firebase Admin SDK.");

    try {
        // Use the Admin SDK's configured default bucket (appspot.com) preference
        const bucket = adminStorage.bucket();
        console.log('[getGalleryImagesAction] Bucket diagnostics:', {
            bucketName: bucket.name,
        });
        if (!bucket.name) {
            throw new Error("Admin bucket name is empty. Ensure FIREBASE_STORAGE_BUCKET_ADMIN or projectId is set.");
        }

        const prefix = 'gallery-backgrounds/';
        const [files] = await bucket.getFiles({ prefix });
        console.log(`[getGalleryImagesAction] Found ${files.length} files with prefix '${prefix}'.`);
        
        const imageFiles = files.filter(file => !file.name.endsWith('/'));

        const signedUrls = await Promise.all(
            imageFiles.map(async (file) => {
                try {
                    const [url] = await file.getSignedUrl({
                        action: 'read',
                        expires: Date.now() + 15 * 60 * 1000, // 15 minutes
                    });
                    return { name: file.name, url: url };
                } catch (urlError: any) {
                    console.error(`    FAILED to generate signed URL for ${file.name}:`, urlError.message);
                    return { name: file.name, url: 'error' };
                }
            })
        );
        
        console.log("[getGalleryImagesAction] END: Operation complete.");
        console.log("--------------------------------------------------");
        return { success: true, images: signedUrls.filter(img => img.url !== 'error'), bucketName: bucket.name };

    } catch (error: any) {
        console.error("[getGalleryImagesAction] FATAL: An uncaught error occurred:", error);
        console.log("[getGalleryImagesAction] END: Operation failed.");
        console.log("--------------------------------------------------");
        return { success: false, error: error.message || "An unknown error occurred.", bucketName: (adminStorage as any)?._bucket?.name };
    }
}

const CREATE_PRODUCT_MUTATION = `
  mutation productCreate($input: ProductInput!) {
    productCreate(input: $input) {
      product {
        id
      }
      userErrors {
        field
        message
      }
    }
  }
`;

type ProductCreateResponse = {
    productCreate: {
        product: { 
            id: string;
        } | null;
        userErrors: {
            field: string[];
            message: string;
        }[];
    };
};


export async function generateProductFromImageAction(
    { imageDataUrl, price, creatorNotes }: { imageDataUrl: string, price: string, creatorNotes: string }
): Promise<{ success: boolean; productId?: string; error?: string }> {

    if (!process.env.GEMINI_API_KEY) {
        return { success: false, error: "Gemini API key is not configured." };
    }

    try {
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({ 
            model: "gemini-1.5-pro",
            generationConfig: { responseMimeType: "application/json" }
        });

        const systemPrompt = `You are the brand voice and creative writer for "Three Chicks and a Wick," a boutique candle company. Your persona is a blend of The Creator and The Jester. Your tone is warm, vibrant, playful, and sophisticated. You write with the joy and pride of a dear friend showing off their latest, beautiful creation. You never use generic marketing language. Instead, you write about scent as an experience, a memory, or a feeling. You turn simple product details into an evocative story that sparks joy and curiosity.
        
Your task is to transform raw data into a partial Shopify product listing, focusing only on the creative text fields. You must generate a single, valid JSON object that strictly adheres to the provided output structure. The "tags" field is mandatory.`;

        const userMessage = `
            Here is the data for a new candle:
            - **Creator's Notes:** "${creatorNotes}"
            - **Price:** ${price}
            - **Image URL:** ${imageDataUrl}
            - **Image Analysis (Placeholder):** "A beautifully rendered, professional product shot of a handcrafted candle. The container is a clean, white ceramic jar. The lighting is soft and warm, creating a cozy and inviting mood."

            Please generate only the creative text fields for the Shopify product JSON, strictly following the output structure.
        `;
        
        const result = await model.generateContent([
            systemPrompt,
            "**Output Structure:**\n```json\n{\n  \"title\": \"A creative and joyful title (5-7 words max)\",\n  \"body_html\": \"A rich, story-driven product description using simple HTML (<p>, <strong>, <ul>, <li>).\",\n  \"tags\": \"A string of 5-7 relevant, SEO-friendly tags, separated by commas.\",\n  \"sku\": \"Generate a simple, unique SKU based on the title (e.g., AHC-01).\",\n  \"image_alt\": \"A descriptive and accessible alt-text for the product image.\"\n}\n```",
            userMessage
        ]);
        const response = await result.response;
        const text = response.text();
        console.log("===== AI RESPONSE TEXT =====", text);

        let creativeData;
        try {
            creativeData = JSON.parse(text);
            console.log("===== PARSED CREATIVE DATA =====", creativeData);
        } catch (e: any) {
            console.error("===== FAILED TO PARSE AI RESPONSE =====");
            console.error("Raw Text:", text);
            console.error("Parsing Error:", e.message);
            throw new Error("The AI returned an invalid response. Please try again.");
        }
        
        const stashResult = await stashAiGeneratedProductAction(creativeData, imageDataUrl, price);

        if (!stashResult.success || !stashResult.token) {
            throw new Error(stashResult.error || "Failed to stash AI-generated data.");
        }

        return { success: true, token: stashResult.token };

    } catch (error: any) {
        console.error("[generateProductFromImageAction Error]", error);
        return { success: false, error: error.message || "An unexpected error occurred." };
    }
}


export async function stashAiGeneratedProductAction(
    creativeData: any,
    imageDataUrl: string,
    price: string
): Promise<{ success: boolean; token?: string; error?: string }> {
    try {
        const token = uuidv4();
        const docRef = adminDb.collection('aiProductDrafts').doc(token);

        await docRef.set({
            ...creativeData,
            price,
            imageDataUrl,
            createdAt: new Date(),
        });

        return { success: true, token };

    } catch (error: any) {
        console.error("[stashAiGeneratedProductAction Error]", error);
        return { success: false, error: "Failed to save AI-generated product data." };
    }
}

export async function resolveAiGeneratedProductAction(
    token: string
): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
        if (!token) return { success: false, error: "Missing token." };
        const docRef = adminDb.collection('aiProductDrafts').doc(token);
        const doc = await docRef.get();

        if (!doc.exists) {
            return { success: false, error: "Draft not found or expired." };
        }

        // Delete the draft after reading it to ensure one-time use
        await docRef.delete();

        return { success: true, data: doc.data() };

    } catch (error: any) {
        console.error("[resolveAiGeneratedProductAction Error]", error);
        return { success: false, error: "Failed to resolve AI-generated product data." };
    }
}
