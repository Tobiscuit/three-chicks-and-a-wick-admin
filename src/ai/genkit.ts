import { genkit } from 'genkit';
import { firebase } from "@genkit-ai/firebase";
import { googleAI } from '@genkit-ai/google-genai';


export const ai = genkit({
  plugins: [
    firebase(),
    googleAI(),
  ],
  logSinks: ["firebase"],
  enableTracingAndMetrics: true,
});

