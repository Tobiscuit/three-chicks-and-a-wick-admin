import { NextResponse } from 'next/server';
import { adminDb, adminStorage } from '@/lib/firebase-admin';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { v4 as uuidv4 } from 'uuid';
import { uploadFileToGoogleAI } from '@/lib/google-ai';
import { checkAuthorization } from '@/app/actions';

// This API route will handle the "Generate and Pre-fill" workflow.
export async function POST(req: Request) {
    // 1. Authorization
    const authHeader = req.headers.get('Authorization');
    const idToken = authHeader?.split('Bearer ')[1];
    const { isAuthorized, error: authError } = await checkAuthorization(idToken || null);
    if (!isAuthorized) {
        return NextResponse.json({ success: false, error: authError || "Unauthorized" }, { status: 401 });
    }

    try {
        const formData = await req.formData();
        const imageFile = formData.get('image') as File | null;
        const creatorNotes = formData.get('creatorNotes') as string | null;
        const price = formData.get('price') as string | null;

        if (!imageFile || !creatorNotes || !price) {
            return NextResponse.json({ success: false, error: 'Missing required fields.' }, { status: 400 });
        }

        // 2. Convert File to buffer for uploads
        const imageBuffer = Buffer.from(await imageFile.arrayBuffer());
        const tempImageId = uuidv4();

        // 3. Perform uploads in parallel for efficiency
        const [firebaseUploadResult, googleAiUploadResult] = await Promise.all([
            // Task A: Upload to Firebase Storage for temporary preview
            adminStorage.bucket().file(`tmp-product-images/${tempImageId}.webp`).save(imageBuffer, {
                contentType: 'image/webp',
            }),

            // Task B: Upload to Google AI File API for Gemini to analyze
            uploadFileToGoogleAI(imageBuffer, 'image/webp')
        ]);
        
        const googleAiFileUri = googleAiUploadResult.file.uri;

        // 4. Call Gemini to generate the text content
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY as string);
        const model = genAI.getGenerativeModel({ 
            model: "gemini-2.5-pro",
            systemInstruction: `You are the brand voice... [Your system prompt here] ...`, // Abridged for brevity
            generationConfig: { responseMimeType: "application/json" }
        });

        const filePart = { fileData: { mimeType: 'image/webp', fileUri: googleAiFileUri }};
        const textPart = `
            Creator's Notes: "${creatorNotes}"
            Price: ${price}
            ... [Your text prompt structure here] ...
        `;
        
        const result = await model.generateContent([textPart, filePart]);
        const creativeData = JSON.parse(result.response.text());

        // 5. Stash results in a Firestore document
        const draftToken = uuidv4();
        const docRef = adminDb.collection('aiProductDrafts').doc(draftToken);
        await docRef.set({
            ...creativeData,
            price,
            tempImagePath: `tmp-product-images/${tempImageId}.webp`,
            createdAt: new Date(), // For TTL policy
        });
        
        // 6. Return the unique token for the client to use
        return NextResponse.json({ success: true, token: draftToken });

    } catch (error: any) {
        console.error("[generate-details API Error]", error);
        return NextResponse.json({ success: false, error: error.message || "An unexpected error occurred." }, { status: 500 });
    }
}
