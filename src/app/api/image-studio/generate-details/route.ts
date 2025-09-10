import { NextResponse } from 'next/server';
import { adminAuth, adminDb, adminStorage } from '@/lib/firebase-admin';
import { uploadFileToGoogleAI } from '@/lib/google-ai';
import { GoogleGenerativeAI } from '@google/genai';
import { v4 as uuidv4 } from 'uuid';

// This is a helper function to verify the Firebase Auth token
// It's a simplified version of what might be in actions.ts
async function isAuthorized(request: Request): Promise<boolean> {
    const idToken = request.headers.get('Authorization')?.split('Bearer ')[1];
    if (!idToken) {
        return false;
    }
    try {
        await adminAuth.verifyIdToken(idToken);
        return true;
    } catch (error) {
        console.error("Token verification failed:", error);
        return false;
    }
}

export async function POST(request: Request) {
    if (!await isAuthorized(request)) {
        return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const formData = await request.formData();
        const imageFile = formData.get('imageFile') as File | null;
        const creatorNotes = formData.get('creatorNotes') as string | null;
        const price = formData.get('price') as string | null;

        if (!imageFile || !creatorNotes || !price) {
            return NextResponse.json({ success: false, error: 'Missing required fields.' }, { status: 400 });
        }

        const imageBuffer = Buffer.from(await imageFile.arrayBuffer());
        
        // --- Step 1: Parallel Uploads ---
        console.log("[API Route] Starting parallel uploads...");
        const [googleAiUploadResponse, firebaseStoragePath] = await Promise.all([
            uploadFileToGoogleAI(imageBuffer, imageFile.type),
            (async () => {
                const tempPath = `tmp-product-images/${uuidv4()}.${imageFile.name.split('.').pop() || 'webp'}`;
                const file = adminStorage.bucket().file(tempPath);
                await file.save(imageBuffer, { contentType: imageFile.type });
                console.log(`[API Route] Uploaded to Firebase Storage at: ${tempPath}`);
                return tempPath;
            })()
        ]);
        console.log("[API Route] Parallel uploads complete.");
        
        const fileUri = googleAiUploadResponse.file.uri;
        if (!fileUri) {
            throw new Error("Failed to get file URI from Google AI File API.");
        }
        console.log(`[API Route] Got Google AI File URI: ${fileUri}`);

        // --- Step 2: Call Gemini with the File URI ---
        console.log("[API Route] Calling Gemini 2.5 Pro with file reference...");
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY as string);
        const model = genAI.getGenerativeModel({ 
            model: "gemini-2.5-pro",
            systemInstruction: `You are the brand voice and creative writer for "Three Chicks and a Wick," a boutique candle company... (Your full system prompt here)`,
            generationConfig: { responseMimeType: "application/json" }
        });

        const textPart = `
            Here is the data for a new candle. Please analyze the provided image (via file reference) and use the creator's notes to generate the creative text fields for the Shopify product JSON.

            - **Creator's Notes:** "${creatorNotes}"
            - **Price:** ${price}

            **Output Structure:**
            \`\`\`json
            {
              "title": "A creative and joyful title (5-7 words max)",
              "body_html": "A rich, story-driven product description using simple HTML (<p>, <strong>, <ul>, <li>).",
              "tags": "A string of 5-7 relevant, SEO-friendly tags, separated by commas.",
              "sku": "Generate a simple, unique SKU based on the title (e.g., AHC-01).",
              "image_alt": "A descriptive and accessible alt-text for the product image."
            }
            \`\`\`
        `;
        
        const filePart = { fileData: { mimeType: imageFile.type, fileUri } };

        const result = await model.generateContent([textPart, filePart]);
        const responseText = result.response.text();
        console.log("[API Route] Gemini response received.");
        
        let creativeData;
        try {
            creativeData = JSON.parse(responseText);
        } catch (e) {
            console.error("Failed to parse Gemini JSON response:", responseText);
            throw new Error("AI returned invalid JSON.");
        }

        // --- Step 3: Stash Data in Firestore with TTL ---
        const token = uuidv4();
        const docRef = adminDb.collection('aiProductDrafts').doc(token);
        
        await docRef.set({
            ...creativeData,
            price,
            tempImagePath: firebaseStoragePath,
            createdAt: new Date(), // Firestore Timestamps are fine here on the server
        });
        console.log(`[API Route] Stashed data in Firestore with token: ${token}`);

        // Note: TTL policy on the 'aiProductDrafts' collection should be set in Firestore console
        // to automatically delete documents based on the 'createdAt' field.

        return NextResponse.json({ success: true, token });

    } catch (error: any) {
        console.error("[/api/image-studio/generate-details POST Error]", error);
        return NextResponse.json({ success: false, error: error.message || 'An unexpected error occurred.' }, { status: 500 });
    }
}
