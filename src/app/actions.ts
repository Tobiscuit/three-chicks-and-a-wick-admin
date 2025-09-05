
"use server";

import { composeCandleWithGeneratedBackground } from "@/ai/flows/compose-candle-with-generated-background";
import { generateCustomCandleBackground } from "@/ai/flows/generate-custom-candle-background";
import { adminApp, adminAuth, adminStorage } from "@/lib/firebase-admin"; // USE CENTRAL ADMIN SDK
import { SecretManagerServiceClient } from '@google-cloud/secret-manager';
import { v4 as uuidv4 } from 'uuid';


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
