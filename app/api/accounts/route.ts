import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return NextResponse.json({ error: "Please sign in." }, { status: 401 });

  const { data, error } = await supabase
    .from("accounts")
    .select("id,name,institution,account_type,last_four,current_balance,currency_code,connection_source")
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: "Could not load your accounts." }, { status: 500 });
  return NextResponse.json({ accounts: data ?? [] }, { headers: { "Cache-Control": "private, no-store" } });
}
