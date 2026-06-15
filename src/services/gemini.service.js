import { GoogleGenAI } from "@google/genai";

export async function analyzePerformance(payload) {

    // Return a mock response during tests so the AI flow can be exercised
    // without a real API key.
    if (process.env.NODE_ENV === "test") {
        return JSON.stringify({
            issues: ["Mock issue for test"],
            recommendations: ["Mock recommendation"],
            severity: "low",
        });
    }

    if (!process.env.GOOGLE_API_KEY) {
        throw new Error("GOOGLE_API_KEY is not configured");
    }

    const ai = new GoogleGenAI({
        apiKey: process.env.GOOGLE_API_KEY,
        vertexai: false,
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
