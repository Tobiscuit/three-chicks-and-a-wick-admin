import { GoogleGenerativeAI } from '@google/genai';

// This function uses the modern, built-in File API from the @google/genai SDK.
// It handles uploading a file (provided as a buffer) and returns the API's
// response, which includes the all-important `fileUri` for use in prompts.
export async function uploadFileToGoogleAI(fileBuffer: Buffer, mimeType: string) {
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY as string);
  const fileApi = genAI.getGenerativeModel({ model: "gemini-pro" }).files; // Use a basic model just to access the API

  const result = await fileApi.uploadFile({
    file: {
      contents: fileBuffer,
      mimeType: mimeType,
    },
    // Optional: a display name for the file
    displayName: `product-image-${Date.now()}`,
  });
  
  return result;
}
