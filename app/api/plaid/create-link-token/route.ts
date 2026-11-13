import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { plaidIsConfigured, plaidRequest } from "@/lib/plaid/server";

export const runtime = "nodejs";

export async function POST() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return NextResponse.json({ error: "Please sign in to connect a bank." }, { status: 401 });
  if (!plaidIsConfigured()) return NextResponse.json({ error: "Secure bank connections are not enabled yet. Plaid credentials must be added by the app owner." }, { status: 503 });

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
  } catch (caught) {
    const message = caught instanceof Error ? caught.message : "Could not start the secure bank connection.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
