import { GoogleGenAI } from "@google/genai";

// DEBUGGING: Check if key exists (Do not share logs with real keys)
console.log("API Key available:", !!process.env.GOOGLE_API_KEY);



export async function analyzePerformance(payload) {

    if (process.env.NODE_ENV !== "test") {

        if (!process.env.GOOGLE_API_KEY) {
            console.error("❌ FATAL: GOOGLE_API_KEY is missing from process.env");
            process.exit(1);
        }
        if (process.env.NODE_ENV !== "test") {

            if (!process.env.GOOGLE_API_KEY) {
                console.error("❌ FATAL: GOOGLE_API_KEY is missing from process.env");
                process.exit(1);
            }

        }
    }

    // ✅ Return mock response during tests
    if (process.env.NODE_ENV === "test") {
        return JSON.stringify({
            issues: ["Mock issue for test"],
            recommendations: ["Mock recommendation"],
            severity: "low",
        });
    }

    // 1. Initialize INSIDE the function
    const ai = new GoogleGenAI({
        apiKey: process.env.GOOGLE_API_KEY,
        vertexai: false, // optional, false is default for this SDK usually
    });


    const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: [
            {
                role: "user",
                parts: [
                    {
                        text: `
You are a senior mobile performance engineer.

Analyze the following Flutter app performance metrics.

Return ONLY valid JSON:
{
  "issues": [],
  "recommendations": [],
  "severity": "low | medium | high"
}

Metrics:
${JSON.stringify(payload, null, 2)}

If no issues are found, return empty arrays.
Do not add explanations outside JSON.
Do not include markdown.
            `,
                    },
                ],
            },
        ],
    });

    return response.text;
}
