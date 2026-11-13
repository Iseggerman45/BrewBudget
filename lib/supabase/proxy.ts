import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!url || !key) {
    if (request.nextUrl.pathname.startsWith("/login") || request.nextUrl.pathname.startsWith("/auth")) {
      return NextResponse.next();
    }
    return NextResponse.redirect(new URL("/login?setup=supabase", request.url));
  }

  let response = NextResponse.next({ request });
  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  const { data } = await supabase.auth.getClaims();
  const user = data?.claims;

  if (!user && !request.nextUrl.pathname.startsWith("/login") && !request.nextUrl.pathname.startsWith("/auth")) {
    const redirect = NextResponse.redirect(new URL("/login", request.url));
    response.cookies.getAll().forEach(cookie => redirect.cookies.set(cookie));
    redirect.headers.set("Cache-Control", "private, no-store");
    return redirect;
  }

  if (user && request.nextUrl.pathname.startsWith("/login")) {
    const redirect = NextResponse.redirect(new URL("/dashboard", request.url));
    response.cookies.getAll().forEach(cookie => redirect.cookies.set(cookie));
    redirect.headers.set("Cache-Control", "private, no-store");
    return redirect;
  }

  response.headers.set("Cache-Control", "private, no-store");
  return response;
}
