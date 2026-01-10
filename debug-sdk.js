import dotenv from "dotenv";
dotenv.config();
import { GoogleGenAI } from "@google/genai";

async function test(modelName, forceVertexFalse) {
    console.log(`\nTesting ${modelName} with vertexai: ${forceVertexFalse ? 'false' : 'undefined'}...`);
    try {
        const ai = new GoogleGenAI({
            apiKey: process.env.GOOGLE_API_KEY,
            vertexai: forceVertexFalse ? false : undefined
        });

        const response = await ai.models.generateContent({
            model: modelName,
            contents: [{ role: "user", parts: [{ text: "Hello" }] }],
        });
        console.log("✅ Success:", response.text);
    } catch (error) {
        console.error("❌ Error:", error.message);
        if (error.body) console.error("Error Body:", error.body);
    }
}

async function run() {
    await test("gemini-1.5-flash", false);
    await test("gemini-1.5-flash", true);
    await test("gemini-2.5-flash", true);
}

run();
