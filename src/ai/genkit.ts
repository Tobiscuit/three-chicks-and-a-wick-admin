import { genkit } from "genkit";
import { googleAI } from "@genkit-ai/googleai";
import { enableFirebaseTelemetry } from "@genkit-ai/firebase";

// This is an async function to properly initialize telemetry.
async function initializeGenkit() {
  // Explicitly provide the project ID to the new telemetry system.
  await enableFirebaseTelemetry({
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  });

  return genkit({
    plugins: [
      googleAI({
        apiVersion: "v1beta",
      }),
    ],
    logSinker: "firebase",
    enableTracing: true,
    traceStore: "firebase",
  });
}

// We immediately invoke the async function and export the resulting promise.
// Genkit is designed to handle this pattern.
export const ai = initializeGenkit();
