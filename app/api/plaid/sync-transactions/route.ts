import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { syncPlaidOwnerItems } from "@/lib/plaid/sync-transactions";
import { guardSensitiveApi } from "@/lib/security/api";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return NextResponse.json({ error: "Please sign in first." }, { status: 401 });

  const blocked = await guardSensitiveApi(request, user.id, "plaid-transaction-sync", 6, 600);
  if (blocked) return blocked;

  try {
    const result = await syncPlaidOwnerItems(user.id);
    return NextResponse.json({ synced: true, ...result }, { headers: { "Cache-Control": "private, no-store" } });
  } catch {
    return NextResponse.json({ error: "Transactions could not be synced. Please try again shortly." }, { status: 502 });
  }
}
