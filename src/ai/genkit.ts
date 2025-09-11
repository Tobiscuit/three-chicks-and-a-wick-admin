import { configure } from "genkit";
import { firebasePlugin } from "@genkit-ai/firebase";
import { googleAI } from "@genkit-ai/googleai";

export default configure({
  plugins: [
    firebasePlugin(),
    googleAI({
      apiVersion: "v1beta",
    }),
  ],
  logSinker: "firebase",
  enableTracing: true,
  traceStore: "firebase",
});
