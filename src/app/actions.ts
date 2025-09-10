
"use server";

import { composeCandleWithGeneratedBackground } from "@/ai/flows/compose-candle-with-generated-background";
import { generateCustomCandleBackground } from "@/ai/flows/generate-custom-candle-background";
import { adminApp, adminAuth, adminStorage } from "@/lib/firebase-admin"; // USE CENTRAL ADMIN SDK
import { SecretManagerServiceClient } from '@google-cloud/secret-manager';
import { v4 as uuidv4 } from 'uuid';
import { adminDb } from '@/lib/firebase-admin';
import { GoogleGenerativeAI } from "@google/generative-ai";
import { fetchShopify } from '@/services/shopify';
import { z } from 'zod';


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

export async function generateImageAction(prevState: any, formData: FormData): Promise<{ imageDataUrl?: string; error?: string }> {
    try {
        const validated = imageGenSchema.safeParse({
            background: formData.get('background'),
            angle1: formData.get('angle1'),
            angle2: formData.get('angle2'),
            context: formData.get('context') || undefined,
        });

        if (!validated.success) {
            return { error: validated.error.errors.map(e => e.message).join(', ') };
        }

        const { background, angle1, angle2, context } = validated.data;

        const result = await generateCustomCandleBackground({
            primaryProductPhotoDataUri: angle1,
            secondaryProductPhotoDataUri: angle2,
            backgroundPrompt: background,
            contextualDetails: context,
        });

        return { imageDataUrl: result.compositeImageDataUri };
    } catch (error: any) {
        console.error("[generateImageAction Error]", error);
        if (error.message.includes('500') || error.message.includes('503')) {
            return { error: "The AI image service is temporarily unavailable. Please try again later." };
        }
        return { error: "An unexpected error occurred during image generation." };
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
    prevState: any,
    formData: FormData
): Promise<{ token?: string; error?: string }> {

    if (!process.env.GEMINI_API_KEY) {
        return { error: "Gemini API key is not configured." };
    }

    try {
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({ 
            model: "gemini-2.5-pro",
            generationConfig: { responseMimeType: "application/json" }
        });

        const creatorNotes = formData.get('creatorNotes') as string;
        const price = formData.get('price') as string;
        const imageDataUrl = formData.get('imageDataUrl') as string;

        if (!creatorNotes || !price || !imageDataUrl) {
            return { error: "Missing required fields for product generation." };
        }

        console.log("===== GENERATING PRODUCT FROM IMAGE =====");
        console.log("Creator Notes:", creatorNotes);
        console.log("Price:", price);

        const base64Data = imageDataUrl.match(/;base64,(.*)$/)?.[1];
        if (!base64Data) {
            throw new Error("Invalid image data URL format.");
        }

        const imagePart = {
            inlineData: {
                data: base64Data,
                mimeType: 'image/webp'
            }
        };

        const systemPrompt = `You are the brand voice and creative writer for "Three Chicks and a Wick," a boutique candle company. Your persona is a blend of The Creator and The Jester. Your tone is warm, vibrant, playful, and sophisticated. You write with the joy and pride of a dear friend showing off their latest, beautiful creation. You never use generic marketing language. Instead, you write about scent as an experience, a memory, or a feeling. You turn simple product details into an evocative story that sparks joy and curiosity.
        
Your task is to transform raw data into a partial Shopify product listing, focusing only on the creative text fields. You must generate a single, valid JSON object that strictly adheres to the provided output structure. The "tags" field is mandatory.`;

        const userMessage = `
            Here is the data for a new candle:
            - **Creator's Notes:** "${creatorNotes}"
            - **Price:** ${price}

            Please generate only the creative text fields for the Shopify product JSON, strictly following the output structure, based on the provided image and notes.
        `;
        
        const result = await model.generateContent([
            systemPrompt,
            "**Output Structure:**\n```json\n{\n  \"title\": \"A creative and joyful title (5-7 words max)\",\n  \"body_html\": \"A rich, story-driven product description using simple HTML (<p>, <strong>, <ul>, <li>).\",\n  \"tags\": \"A string of 5-7 relevant, SEO-friendly tags, separated by commas.\",\n  \"sku\": \"Generate a simple, unique SKU based on the title (e.g., AHC-01).\",\n  \"image_alt\": \"A descriptive and accessible alt-text for the product image.\"\n}\n```",
            imagePart,
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

        return { token: stashResult.token };

    } catch (error: any) {
        console.error("[generateProductFromImageAction Error]", error);

        if (error.message.includes('503')) {
            return { error: "The AI service is temporarily unavailable. Please try again later." };
        }
        
        if (error.message.includes('token')) {
            return { error: "The image is too large to be processed by the AI. Please try a smaller image." };
        }

        return { error: "An unexpected error occurred while generating the product." };
    }
}


export async function stashAiGeneratedProductAction(
    creativeData: any,
    imageDataUrl: string,
    price: string
): Promise<{ success: boolean; token?: string; error?: string }> {
    try {
        // Step 1: Upload the image to Firebase Storage to get a public URL
        const bucket = adminStorage.bucket();
        const fileName = `product-images/ai-generated/${uuidv4()}.webp`;
        const imageBuffer = Buffer.from(imageDataUrl.split(',')[1], 'base64');
        
        await bucket.file(fileName).save(imageBuffer, {
            metadata: { contentType: 'image/webp' },
            public: true,
        });
        const publicImageUrl = `https://storage.googleapis.com/${bucket.name}/${fileName}`;

        // Step 2: Stash the creative data and the public image URL in Firestore
        const token = uuidv4();
        const docRef = adminDb.collection('aiProductDrafts').doc(token);

        await docRef.set({
            ...creativeData,
            price,
            publicImageUrl, // Stash the short URL, not the raw data
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
            throw new Error("Draft not found or already used.");
        }

        const data = doc.data();

        await docRef.delete();

        if (!data) {
            return null;
        }

        // Firestore `Timestamp` is a class, not a plain object.
        // It cannot be passed from a Server Component to a Client Component.
        // We destructure it out, since the form doesn't need it anyway.
        const { createdAt, ...rest } = data;

        return rest;
    } catch (error: any) {
        console.error("[resolveAiGeneratedProductAction Error]", error);
        return { success: false, error: "Failed to resolve AI-generated product data." };
    }
}

export async function uploadImageAction(imageDataUrl: string): Promise<string | null> {
    try {
        const token = uuidv4();
        const publicImageUrl = await uploadImageToFirebase(imageDataUrl, token);
        return publicImageUrl;
    } catch (error) {
        console.error("[uploadImageAction Error]", error);
        return null;
    }
}

async function uploadImageToFirebase(imageDataUrl: string, token: string): Promise<string> {
    const bucket = adminStorage.bucket();
    const fileName = `product-images/${token}-upload.webp`;
    const [meta, base64] = imageDataUrl.split(',');
    const mimeMatch = /data:(.*?);base64/.exec(meta || '');
    const mimeType = mimeMatch?.[1] || 'image/webp';
    const buffer = Buffer.from(base64, 'base64');

    await bucket.file(fileName).save(buffer, {
        contentType: mimeType,
        resumable: false,
        public: true,
    });
    return `https://storage.googleapis.com/${bucket.name}/${fileName}`;
}

const imageGenSchema = z.object({
    background: z.string().min(1, { message: 'Background prompt is required.' }),
    angle1: z.string().min(1, { message: 'Primary candle image is required.' }),
    angle2: z.string().optional(),
    context: z.string().optional(),
});
