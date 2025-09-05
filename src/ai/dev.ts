
import { config } from 'dotenv';
config({ path: process.cwd() + '/.env' });

import '@/ai/flows/generate-custom-candle-background.ts';
import '@/ai/flows/compose-candle-with-generated-background.ts';
import '@/ai/flows/refine-generated-background-with-context.ts';
import '@/ai/flows/generate-business-strategy.ts';
