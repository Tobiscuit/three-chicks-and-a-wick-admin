import { configure } from "genkit";
import { firebase } from "@genkit-ai/firebase";
import { googleAI } from "@genkit-ai/googleai";

export default configure({
  plugins: [
    firebase(),
    googleAI({
      apiVersion: "v1beta",
    }),
  ],
  logSinker: "firebase",
  enableTracing: true,
  traceStore: "firebase",
});
