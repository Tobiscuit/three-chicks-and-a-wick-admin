import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/googleai';

if (process.env.GEMINI_API_KEY) {
    console.log(`[Genkit Init] Initializing Google AI plugin with API Key ending in: ...${process.env.GEMINI_API_KEY.slice(-4)}`);
}

export const ai = genkit({
  plugins: [googleAI()],
  model: 'googleai/gemini-2.5-flash',
});
