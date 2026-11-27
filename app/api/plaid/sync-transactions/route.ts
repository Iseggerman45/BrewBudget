import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { syncPlaidOwnerItems } from "@/lib/plaid/sync-transactions";

export const runtime = "nodejs";

export async function POST() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return NextResponse.json({ error: "Please sign in first." }, { status: 401 });
  try {
    const result = await syncPlaidOwnerItems(user.id);
    return NextResponse.json({ synced: true, ...result }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (caught) {
    const message = caught instanceof Error ? caught.message : "Transactions could not be synced.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
