import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/google-genai';
import { googleCloud } from '@genkit-ai/google-cloud';

export const ai = genkit({
  plugins: [
    googleCloud(),
    googleAI(),
  ],
  logSinks: ["googleCloud"],
  enableTracingAndMetrics: true,
  traceStore: "googleCloud",
});

