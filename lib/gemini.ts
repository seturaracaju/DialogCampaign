import { GoogleGenAI } from "@google/genai";

const API_KEY = process.env.API_KEY;

let geminiClient: GoogleGenAI | null = null;

if (!API_KEY) {
    console.warn("Google Gemini API Key is not set. AI features will be disabled. Please provide the API_KEY environment variable.");
} else {
    try {
        geminiClient = new GoogleGenAI({ apiKey: API_KEY });
    } catch (error) {
        console.error("Failed to initialize Google Gemini client:", error);
    }
}

export const ai = geminiClient;
