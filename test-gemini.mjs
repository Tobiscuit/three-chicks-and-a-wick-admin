// This script is a simple 'Hello World' to test your Gemini API key.
// It loads your API key from a .env.local file, connects to the Gemini API,
// and sends a basic text prompt.

import 'dotenv/config'; // Load environment variables from .env.local
import { GoogleGenerativeAI } from '@google/genai';

async function runTest() {
  console.log("--- Starting Gemini API Key Test ---");

  // 1. Check for API Key
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error("🔴 ERROR: GEMINI_API_KEY not found in your environment.");
    console.error("Please make sure you have a .env.local file in the root of your project with your key.");
    return;
  }
  console.log(`✅ Found API Key ending in: ...${apiKey.slice(-4)}`);

  try {
    // 2. Initialize the SDK
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-pro" });
    console.log("✅ Initialized Gemini SDK with gemini-pro model.");

    // 3. Send the prompt
    console.log("\nSending prompt: 'Hello Gemini'...");
    const result = await model.generateContent("Hello Gemini");
    const response = await result.response;
    const text = response.text();

    // 4. Print the response
    console.log("\n--- Gemini Response ---");
    console.log(text);
    console.log("-----------------------\n");
    console.log("✅ SUCCESS: Your API key is working correctly.");

  } catch (error) {
    console.error("\n🔴 ERROR: The API call failed.");
    console.error("This could be due to an invalid key, incorrect billing setup, or a quota issue.");
    console.error("\n--- Full Error Details ---");
    console.error(error);
    console.error("--------------------------\n");
  } finally {
    console.log("--- Test Finished ---");
  }
}

runTest();
