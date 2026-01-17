import crypto from "crypto";

export function generateApiKey() {
  return `app_live_${crypto.randomBytes(16).toString("hex")}`;
}
