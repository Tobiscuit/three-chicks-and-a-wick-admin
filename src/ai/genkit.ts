import { genkit } from 'genkit';
import { vertexAI } from '@genkit-ai/google-genai';

// Stripping configuration down to the absolute minimum to prevent server crashes.
// The firebase/google-cloud plugins are causing fatal, unresolvable errors.
export const ai = genkit({
  plugins: [
    vertexAI({ location: 'us-central1' }),
  ],
  logSinks: [],
  enableTracingAndMetrics: false,
  traceStore: undefined, // Explicitly disable trace store
});

