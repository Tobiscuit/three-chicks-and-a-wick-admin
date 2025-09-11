import { genkit } from "genkit";
import { googleAI } from "@genkit-ai/googleai";

// We no longer need the complex async initialization, as the telemetry
// feature causing the credential error has been removed.
export const ai = genkit({
  plugins: [
    googleAI({
      apiVersion: "v1beta",
    }),
  ],
  // We can leave these configured; they will gracefully do nothing
  // without the Firebase plugin being fully initialized.
  logSinker: "firebase",
  enableTracing: true,
  traceStore: "firebase",
});
