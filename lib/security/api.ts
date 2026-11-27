import "server-only";

import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export function hasValidSameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) return false;

  try {
    const parsedOrigin = new URL(origin);
    const forwardedHost = request.headers.get("x-forwarded-host")?.split(",")[0]?.trim();
    const requestHost = forwardedHost || new URL(request.url).host;
    const forwardedProto = request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim();
    const requestProto = forwardedProto || new URL(request.url).protocol.replace(":", "");
    return parsedOrigin.origin === `${requestProto}://${requestHost}`;
  } catch {
    return false;
  }
}

export async function guardSensitiveApi(
  request: Request,
  userId: string,
  action: string,
  limit: number,
  windowSeconds: number,
) {
  if (!hasValidSameOrigin(request)) {
    return NextResponse.json({ error: "This request could not be verified." }, { status: 403 });
  }

  try {
    const admin = createAdminClient();
    const { data, error } = await admin.rpc("consume_api_rate_limit", {
      p_rate_key: `user:${userId}:${action}`,
      p_limit: limit,
      p_window_seconds: windowSeconds,
    });

    if (error || data !== true) {
      return NextResponse.json(
        { error: error ? "This service is temporarily unavailable. Please try again shortly." : "Too many requests. Please wait before trying again." },
        { status: error ? 503 : 429, headers: { "Retry-After": String(windowSeconds) } },
      );
    }
    return null;
  } catch {
    return NextResponse.json({ error: "This service is temporarily unavailable. Please try again shortly." }, { status: 503 });
  }
}

export async function readJsonBody(request: Request, maxBytes = 16_384): Promise<unknown | null> {
  const contentType = request.headers.get("content-type")?.split(";")[0].trim().toLowerCase();
  if (contentType !== "application/json") return null;

  const declaredLength = Number(request.headers.get("content-length") ?? "0");
  if (declaredLength > maxBytes) return null;
  if (!request.body) return null;

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      totalBytes += value.byteLength;
      if (totalBytes > maxBytes) {
        await reader.cancel();
        return null;
      }
      chunks.push(value);
    }
  } catch {
    return null;
  }

  const combined = new Uint8Array(totalBytes);
  let offset = 0;
  for (const chunk of chunks) {
    combined.set(chunk, offset);
    offset += chunk.byteLength;
  }

  try {
    return JSON.parse(new TextDecoder().decode(combined));
  } catch {
    return null;
  }
}
