import "server-only";
import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

function plaidBaseUrl() {
  const environment = process.env.PLAID_ENV ?? "sandbox";
  if (environment === "sandbox") return "https://sandbox.plaid.com";
  if (environment === "development") return "https://development.plaid.com";
  if (environment === "production") return "https://production.plaid.com";
  throw new Error("PLAID_ENV must be sandbox, development, or production.");
}

export function plaidIsConfigured() {
  return Boolean(process.env.PLAID_CLIENT_ID && process.env.PLAID_SECRET);
}

export async function plaidRequest<T>(path: string, body: Record<string, unknown>): Promise<T> {
  const clientId = process.env.PLAID_CLIENT_ID;
  const secret = process.env.PLAID_SECRET;
  if (!clientId || !secret) throw new Error("Plaid server credentials are not configured.");
  const response = await fetch(`${plaidBaseUrl()}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "PLAID-CLIENT-ID": clientId,
      "PLAID-SECRET": secret,
    },
    body: JSON.stringify(body),
    cache: "no-store",
  });
  const payload = await response.json();
  if (!response.ok) {
    const message = payload?.error_message ?? "Plaid could not complete the request.";
    throw new Error(message);
  }
  return payload as T;
}

export function encryptPlaidAccessToken(accessToken: string) {
  const rawKey = process.env.PLAID_TOKEN_ENCRYPTION_KEY;
  if (!rawKey) throw new Error("Plaid token encryption key is not configured.");
  const key = Buffer.from(rawKey, "base64");
  if (key.length !== 32) throw new Error("PLAID_TOKEN_ENCRYPTION_KEY must be a base64-encoded 32-byte key.");

  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(accessToken, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [iv.toString("base64"), tag.toString("base64"), encrypted.toString("base64")].join(".");
}

export function decryptPlaidAccessToken(payload: string) {
  const rawKey = process.env.PLAID_TOKEN_ENCRYPTION_KEY;
  if (!rawKey) throw new Error("Plaid token encryption key is not configured.");
  const key = Buffer.from(rawKey, "base64");
  if (key.length !== 32) throw new Error("PLAID_TOKEN_ENCRYPTION_KEY must be a base64-encoded 32-byte key.");
  const [ivText, tagText, encryptedText] = payload.split(".");
  if (!ivText || !tagText || !encryptedText) throw new Error("Stored Plaid token is malformed.");
  const decipher = createDecipheriv("aes-256-gcm", key, Buffer.from(ivText, "base64"));
  decipher.setAuthTag(Buffer.from(tagText, "base64"));
  return Buffer.concat([
    decipher.update(Buffer.from(encryptedText, "base64")),
    decipher.final(),
  ]).toString("utf8");
}
