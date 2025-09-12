import { configure } from 'genkit';
import { googleAI } from '@genkit-ai/googleai';

export const ai = configure({
  plugins: [googleAI({ apiVersion: 'v1beta' })],
  logSinker: 'dev',
  enableTracing: true,
});
