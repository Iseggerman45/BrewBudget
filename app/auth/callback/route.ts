import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const requestedNext = requestUrl.searchParams.get("next") ?? "/dashboard";

  if (code) {
    const cookieStore = await cookies();
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

    if (!supabaseUrl || !publishableKey) {
      return NextResponse.redirect(new URL("/login?error=configuration", requestUrl.origin));
    }

    const supabase = createServerClient(supabaseUrl, publishableKey, {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (cookiesToSet) => {
          try {
            cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
          } catch {
            // The callback route can write cookies; this is defensive for read-only contexts.
          }
        },
      },
    });

    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error && data.user) {
      const displayName = typeof data.user.user_metadata?.display_name === "string"
        ? data.user.user_metadata.display_name.slice(0, 80)
        : "";

      if (displayName) {
        await supabase.from("profiles").upsert(
          { id: data.user.id, display_name: displayName },
          { onConflict: "id" },
        );
      }

      // Resolve the destination against our own origin to reject protocol-relative
      // and other cross-origin redirects.
      let safePath = "/dashboard";
      try {
        const destination = new URL(requestedNext, requestUrl.origin);
        if (destination.origin === requestUrl.origin && destination.pathname.startsWith("/") &&
            !destination.pathname.startsWith("//") && !destination.pathname.includes("\\")) {
          safePath = `${destination.pathname}${destination.search}${destination.hash}`;
        }
      } catch {
        // Keep the safe default.
      }

      const response = NextResponse.redirect(new URL(safePath, requestUrl.origin));
      response.headers.set("Cache-Control", "no-store");
      response.headers.set("Referrer-Policy", "no-referrer");
      return response;
    }
  }

  const response = NextResponse.redirect(new URL("/login?error=confirmation", requestUrl.origin));
  response.headers.set("Cache-Control", "no-store");
  response.headers.set("Referrer-Policy", "no-referrer");
  return response;
}
