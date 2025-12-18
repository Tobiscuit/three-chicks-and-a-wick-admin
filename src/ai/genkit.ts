import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/google-genai';

// Using googleAI plugin for gemini-2.5-flash-image and gemini-3-flash-preview
export const ai = genkit({
  plugins: [
    googleAI(),
  ],
});

