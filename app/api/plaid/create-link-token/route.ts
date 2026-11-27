import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { plaidIsConfigured, plaidRequest } from "@/lib/plaid/server";
import { guardSensitiveApi } from "@/lib/security/api";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return NextResponse.json({ error: "Please sign in to connect a bank." }, { status: 401 });

  const blocked = await guardSensitiveApi(request, user.id, "plaid-link-token", 8, 900);
  if (blocked) return blocked;

  if (!plaidIsConfigured() || !process.env.SUPABASE_SECRET_KEY || !process.env.PLAID_TOKEN_ENCRYPTION_KEY) {
    return NextResponse.json({ error: "Secure bank connections are not fully configured yet." }, { status: 503 });
  }

  try {
    const result = await plaidRequest<{ link_token: string }>("/link/token/create", {
      user: { client_user_id: user.id },
      client_name: "BrewBudget",
      products: ["transactions"],
      country_codes: ["US"],
      language: "en",
      transactions: { days_requested: 365 },
    });
    return NextResponse.json({ link_token: result.link_token }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "Could not start the secure bank connection. Please try again." }, { status: 502 });
  }
}
