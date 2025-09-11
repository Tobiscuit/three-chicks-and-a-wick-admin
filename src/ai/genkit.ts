import { configure } from "genkit";
import { googleAI } from "@genkit-ai/googleai";
import { enableFirebaseTelemetry } from "@genkit-ai/firebase";

// This is an async function to properly initialize telemetry.
async function initializeGenkit() {
  await enableFirebaseTelemetry();

  return configure({
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
