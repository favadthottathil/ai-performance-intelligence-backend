import dotenv from "dotenv";
dotenv.config();

console.log("Checking Environment Variables...");
if (process.env.GOOGLE_API_KEY) {
    console.log("✅ GOOGLE_API_KEY is loaded.");
    console.log("Key length:", process.env.GOOGLE_API_KEY.length);
    console.log("First 4 chars:", process.env.GOOGLE_API_KEY.substring(0, 4));
} else {
    console.log("❌ GOOGLE_API_KEY is NOT loaded (undefined).");
}
