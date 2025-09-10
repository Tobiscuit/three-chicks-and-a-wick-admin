import { VertexAI } from '@google-cloud/vertex-ai';

// This is the modern, recommended way to interact with the Google AI File API.
// It handles uploading a file (provided as a buffer) and returns the API's
// response, which includes the all-important `fileUri` for use in prompts.
export async function uploadFileToGoogleAI(fileBuffer: Buffer, mimeType: string) {
  const vertexAI = new VertexAI({
    project: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || '',
    location: 'us-central1' 
  });

  const generativeModel = vertexAI.getGenerativeModel({
    model: 'gemini-2.5-pro',
  });

  const filePart = {
    inlineData: {
      data: fileBuffer.toString('base64'),
      mimeType,
    },
  };

  // The Vertex AI SDK's `uploadFile` is a convenience method that handles
  // the REST API calls for uploading and provides the file resource object back.
  const result = await generativeModel.uploadFile(filePart);
  
  return result;
}
