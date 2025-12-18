
"use server";

import { generateCustomCandleBackgroundFlow } from '@/ai/flows/generate-custom-candle-background';
import { composeWithGalleryBackgroundFlow } from '@/ai/flows/compose-with-gallery-background';
import { adminAuth, adminStorage } from "@/lib/firebase-admin"; // USE CENTRAL ADMIN SDK
import { SecretManagerServiceClient } from '@google-cloud/secret-manager';
import { v4 as uuidv4 } from 'uuid';
import { adminDb } from '@/lib/firebase-admin';
import { GoogleGenerativeAI } from "@google/generative-ai";
import { APP_CONFIG, FIREBASE_CONFIG, GOOGLE_AI_CONFIG } from '@/lib/env-config';
import { fetchShopify } from '@/services/shopify';
import { z } from 'zod';
import { Part } from '@google/generative-ai';

function dataUrlToPart(dataUrl: string): Part {
    if (!dataUrl || typeof dataUrl !== 'string') {
        throw new Error('Invalid data URL: dataUrl is undefined or not a string');
    }
    
    const match = dataUrl.match(/^data:(.+);base64,(.+)$/);
    if (!match) {
        console.error('Invalid data URL format:', dataUrl.substring(0, 100) + '...');
        throw new Error('Invalid data URL format for generative part.');
    }
    return {
        inlineData: {
            data: match[2],
            mimeType: match[1]
        }
    };
}

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
  const envAuthorized = APP_CONFIG.AUTHORIZED_EMAILS;
  if (envAuthorized && envAuthorized.trim().length > 0) {
    console.log("[Auth Check] Using AUTHORIZED_EMAILS from environment variables.");
    rawAuthorizedEmails = envAuthorized;
  } else {
    // 2) Fallback to Secret Manager (for Firebase App Hosting)
    const projectId = FIREBASE_CONFIG.PROJECT_ID;
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

type GenerateImageInput = {
  background: string;
  angle1: string; // data URL
  angle2?: string; // data URL
}

export async function generateImageAction(input: GenerateImageInput): Promise<{ imageDataUri?: string; error?: string }> {
    try {
        const validated = imageGenSchema.safeParse(input);

        if (!validated.success) {
            return { error: validated.error.errors.map(e => e.message).join(', ') };
        }

        const { background, angle1, angle2, context } = validated.data;

        const imageDataUrl = await generateCustomCandleBackgroundFlow({
            background: background,
            contextualDetails: context,
            candleImage1: angle1,
            candleImage2: angle2,
        });

        if (!imageDataUrl) {
            return { error: 'The AI did not return a valid image.' };
        }

        // Extract the URL from the object returned by the AI flow
        const imageUrl = typeof imageDataUrl === 'string' ? imageDataUrl : imageDataUrl.url;
        const resultPart = dataUrlToPart(imageUrl);
        if (!resultPart?.inlineData) {
          return { error: 'The AI did not return a valid image.'}
        }

        return { imageDataUri: `data:${resultPart.inlineData.mimeType};base64,${resultPart.inlineData.data}` };
    } catch (error: any) {
        console.error("[generateImageAction Error]", error);
        if (error.message.includes('500') || error.message.includes('503')) {
            return { error: "The AI image service is temporarily unavailable. Please try again later." };
        }
        return { error: "An unexpected error occurred during image generation." };
    }
}

type ComposeWithGalleryInput = {
  galleryBackgroundUrl: string;
  angle1: string; // data URL
  angle2?: string; // data URL
  context?: string; // contextual details
}

// Helper function to convert Firebase Storage URL to data URL
async function firebaseUrlToDataUrl(url: string): Promise<string> {
    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Failed to fetch image: ${response.statusText}`);
        }
        const arrayBuffer = await response.arrayBuffer();
        
        // Convert to JPEG format for compatibility with gemini-2.5-flash-image-preview
        const jpegDataUrl = await convertToJpeg(arrayBuffer);
        
        return jpegDataUrl;
    } catch (error) {
        console.error('Error converting Firebase URL to data URL:', error);
        throw new Error(`Failed to convert Firebase URL to data URL: ${error}`);
    }
}

// Helper function to convert image data to JPEG format (server-side)
async function convertToJpeg(arrayBuffer: ArrayBuffer): Promise<string> {
    // For now, we'll just change the MIME type to JPEG
    // The actual image conversion would require a server-side image processing library
    // like 'sharp' or 'jimp', but for testing purposes, this should work
    const base64 = Buffer.from(arrayBuffer).toString('base64');
    return `data:image/jpeg;base64,${base64}`;
}

export async function composeWithGalleryAction(input: ComposeWithGalleryInput): Promise<{ imageDataUri?: string; error?: string }> {
    try {
        const { galleryBackgroundUrl, angle1, angle2, context } = input;

        // Convert Firebase Storage URL to data URL
        const galleryImageDataUrl = await firebaseUrlToDataUrl(galleryBackgroundUrl);

        const imageDataUrl = await composeWithGalleryBackgroundFlow({
            candleImage1: angle1,
            candleImage2: angle2,
            galleryImage: galleryImageDataUrl,
            contextualDetails: context,
        });

        if (!imageDataUrl) {
            return { error: 'The AI did not return a valid composite image.' };
        }
        
        // The AI flow returns a Part object with a url property
        if (!imageDataUrl.url) {
          return { error: 'The AI did not return a valid composite image.'}
        }

        const result = { imageDataUri: imageDataUrl.url };
        console.log('[composeWithGalleryAction] Returning success object with image data URI.');
        return result;

    } catch (error: any) {
        console.error("[composeWithGalleryAction Error]", error);
        return { error: `An unexpected error occurred during image composition: ${error.message}` };
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
    const mimeType = mimeMatch?.[1] || 'image/jpeg';
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

    // Note: CORS settings for Firebase Storage are configured through Firebase Console
    // or Google Cloud Storage API, not through the Firebase Admin SDK
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
    try {
        // Use the Admin SDK's configured default bucket (appspot.com) preference
        const bucket = adminStorage.bucket();
        console.log('[Gallery Action] Bucket name:', bucket.name);
        console.log('[Gallery Action] Expected bucket: threechicksandawick-admin.firebasestorage.app');
        console.log('[Gallery Action] Bucket match:', bucket.name === 'threechicksandawick-admin.firebasestorage.app');
        
        if (!bucket.name) {
            throw new Error("Admin bucket name is empty. Ensure FIREBASE_STORAGE_BUCKET_ADMIN or projectId is set.");
        }

        const prefix = 'gallery-backgrounds/';
        const [files] = await bucket.getFiles({ prefix });
        
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
                    console.error(`Failed to generate signed URL for ${file.name}:`, urlError.message);
                    return { name: file.name, url: 'error' };
                }
            })
        );
        
        const validImages = signedUrls.filter(img => img.url !== 'error');
        return { success: true, images: validImages, bucketName: bucket.name };

    } catch (error: any) {
        console.error("Failed to fetch gallery images:", error);
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

type GenerateProductInput = {
    imageDataUrl: string;
    price: string;
    creatorNotes: string;
    quantity: number;
    sourceImageUrls?: string[]; // Optional source image URLs from Image Studio
}

export async function generateProductFromImageAction(
    input: GenerateProductInput
): Promise<{ token?: string; error?: string }> {

    if (!GOOGLE_AI_CONFIG.API_KEY) {
        return { error: "Gemini API key is not configured." };
    }

    try {
        const genAI = new GoogleGenerativeAI(GOOGLE_AI_CONFIG.API_KEY);
        const model = genAI.getGenerativeModel({ 
            model: "gemini-3-flash-preview",
            generationConfig: { responseMimeType: "application/json" }
        });

        const { creatorNotes, price, imageDataUrl, quantity, sourceImageUrls } = input;

        if (!creatorNotes || !price || !imageDataUrl || quantity === undefined) {
            return { error: "Missing required fields for product generation." };
        }

        console.log("===== GENERATING PRODUCT FROM IMAGE =====");
        console.log("Creator Notes:", creatorNotes);
        console.log("Price:", price);
        console.log("Quantity:", quantity);

        const base64Data = imageDataUrl.match(/;base64,(.*)$/)?.[1];
        if (!base64Data) {
            throw new Error("Invalid image data URL format.");
        }

        const imagePart = {
            inlineData: {
                data: base64Data,
                mimeType: 'image/jpeg'
            }
        };

        const systemPrompt = `You are the brand voice and creative writer for "Three Chicks and a Wick," a boutique candle company.

**Your Persona:**
You are **The Creator** at heart, with a touch of **The Jester**. Your tone is warm, vibrant, and sophisticated, but also approachable and full of genuine delight. You write with the joy and pride of a dear friend showing off their latest, beautiful creation. You are an artist, not a marketer.

**Your Writing Principles:**
You transform simple product details into an evocative story that sparks joy and curiosity. To achieve this, you adhere to the following principles:

1.  **Principle of Immediacy:** Forget generic, fluffy introductions ("Are you looking for the perfect candle?"). Get straight to the heart of the scent, its soul, and the feeling it evokes. The first sentence should be an immediate hook.
2.  **Principle of Potency:** Condense descriptive imagery into impactful, memorable phrases. Instead of "This smells like a soft and cozy cashmere sweater," you write "It's the quiet confidence of cashmere."
3.  **Principle of Active Language:** Use strong, direct verbs and vivid, precise adjectives. Eliminate weak words and passive voice to make the description feel more dynamic and confident.
4.  **Principle of Flow:** Vary sentence structure and length to create a pleasing rhythm. Combine shorter sentences and streamline paragraphs to improve readability and reduce the overall word count efficiently.
5.  **Principle of Structured Highlights:** Always include a short, punchy bulleted list that captures the essence of the product. It must follow this structure:
    * **The Scent:** A pure, direct description of the fragrance notes.
    * **The Vibe:** The feeling, mood, or experience the scent creates.
    * **The Vessel:** A brief, elegant description of the physical candle holder.
6.  **Principle of Product Focus:** When analyzing the image, focus exclusively on the product itself. The photographic background, lighting, and studio setting are for aesthetic purposes only and **must not** influence the scent description. Base your writing on the candle, its vessel, and any visible ingredients (e.g., vanilla beans, flowers).

**Your Task:**
Transform raw data into a partial Shopify product listing, focusing only on the creative text fields. You must generate a single, valid JSON object that strictly adheres to the provided output structure. The "tags" field is mandatory.`;

        const userMessage = `
            Here is the data for a new candle:
            - **Creator's Notes:** "${creatorNotes}"
            - **Price:** ${price}

            Please generate only the creative text fields for the Shopify product JSON, strictly following the output structure, based on the provided image and notes.
        `;
        
        const result = await model.generateContent([
            systemPrompt,
            "**Output Structure:**\n```json\n{\n  \"title\": \"A creative and joyful title (5-7 words max)\",\n  \"body_html\": \"A rich, story-driven product description using simple HTML (<p>, <strong>, <ul>, <li>).\",\n  \"pivotReason\": \"A short note explaining any creative pivots or ingredient substitutions made based on the image (e.g., 'I saw vanilla beans so I emphasized the gourmand notes').\",\n  \"tags\": \"A string of up to 5 relevant, SEO-friendly tags, separated by commas.\",\n  \"sku\": \"Generate a simple, unique SKU based on the title (e.g., AHC-01).\",\n  \"image_alt\": \"A descriptive and accessible alt-text for the product image.\"\n}\n```",
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
            
            // Transform tags to Title Case for better presentation
            if (creativeData.tags && typeof creativeData.tags === 'string') {
                creativeData.tags = creativeData.tags
                    .split(',')
                    .map((tag: string) => tag.trim().split(' ').map(word => 
                        word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
                    ).join(' '))
                    .join(', ');
                console.log("===== TAGS TRANSFORMED TO TITLE CASE =====", creativeData.tags);
            }
        } catch (e: any) {
            console.error("===== FAILED TO PARSE AI RESPONSE =====");
            console.error("Raw Text:", text);
            console.error("Parsing Error:", e.message);
            throw new Error("The AI returned an invalid response. Please try again.");
        }
        
        console.log("===== STASHING AI GENERATED DATA =====");
        const stashResult = await stashAiGeneratedProductAction(creativeData, imageDataUrl, price, quantity, sourceImageUrls);
        console.log("===== STASH RESULT =====", stashResult);

        if (!stashResult.success || !stashResult.token) {
            console.error("===== STASH FAILED =====", stashResult.error);
            throw new Error(stashResult.error || "Failed to stash AI-generated data.");
        }

        console.log("===== RETURNING SUCCESS TOKEN =====", stashResult.token);
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
    price: string,
    quantity: number,
    sourceImageUrls?: string[],
): Promise<{ success: boolean; token?: string; error?: string }> {
    try {
        console.log("===== STASH FUNCTION START =====");
        console.log("Creative data:", creativeData);
        console.log("Price:", price);
        console.log("Quantity:", quantity);
        console.log("Image data URL length:", imageDataUrl.length);
        
        // Step 1: Upload the image to Firebase Storage to get a public URL
        const bucket = adminStorage.bucket();
        console.log("Using bucket:", bucket.name);
        
        const fileName = `product-images/ai-generated/${uuidv4()}.webp`;
        console.log("File name:", fileName);
        
        const imageBuffer = Buffer.from(imageDataUrl.split(',')[1], 'base64');
        console.log("Image buffer size:", imageBuffer.length);
        
        console.log("===== UPLOADING TO FIREBASE STORAGE =====");
        await bucket.file(fileName).save(imageBuffer, {
            metadata: { contentType: 'image/jpeg' },
            public: true,
        });
        console.log("===== UPLOAD SUCCESS =====");
        
        const publicImageUrl = `https://storage.googleapis.com/${bucket.name}/${fileName}`;
        console.log("Public image URL:", publicImageUrl);

        // Step 2: Stash the creative data and the public image URL in Firestore
        const token = uuidv4();
        console.log("Generated token:", token);
        
        const docRef = adminDb.collection('aiProductDrafts').doc(token);
        console.log("===== SAVING TO FIRESTORE =====");

        // Source images are already uploaded to Firebase Storage, just use the URLs
        console.log("[Actions] Source image URLs received:", sourceImageUrls?.length || 0, sourceImageUrls);

        await docRef.set({
            ...creativeData,
            price,
            quantity,
            publicImageUrl, // Stash the short URL, not the raw data
            sourceImageUrls: sourceImageUrls || [], // Store source image URLs
            createdAt: new Date(),
        });
        console.log("===== FIRESTORE SAVE SUCCESS =====");

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
            return { success: false, error: "No data found for this draft." };
        }

        // Firestore `Timestamp` is a class, not a plain object.
        // It cannot be passed from a Server Component to a Client Component.
        // We destructure it out, since the form doesn't need it anyway.
        const { createdAt, ...rest } = data;

        // Wrap the successful data in a consistent object shape
        return { success: true, data: rest };
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
    const mimeType = mimeMatch?.[1] || 'image/jpeg';
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

