import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { encryptPlaidAccessToken, plaidIsConfigured, plaidRequest } from "@/lib/plaid/server";
import { syncPlaidOwnerItems } from "@/lib/plaid/sync-transactions";
import { guardSensitiveApi, readJsonBody } from "@/lib/security/api";

export const runtime = "nodejs";

type ExchangeResult = { access_token: string; item_id: string };
type AccountsResult = {
  accounts: Array<{
    account_id: string;
    name: string;
    official_name?: string | null;
    type: string;
    subtype?: string | null;
    mask?: string | null;
    balances: { current?: number | null; limit?: number | null; iso_currency_code?: string | null };
  }>;
};

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return NextResponse.json({ error: "Please sign in first." }, { status: 401 });

  const blocked = await guardSensitiveApi(request, user.id, "plaid-token-exchange", 5, 900);
  if (blocked) return blocked;

  if (!plaidIsConfigured() || !process.env.SUPABASE_SECRET_KEY || !process.env.PLAID_TOKEN_ENCRYPTION_KEY) {
    return NextResponse.json({ error: "The secure bank connection service is not fully configured yet." }, { status: 503 });
  }

  const body = await readJsonBody(request);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "A valid request body is required." }, { status: 400 });
  }
  const publicToken = "public_token" in body && typeof body.public_token === "string" ? body.public_token : "";
  const institutionName = "institution_name" in body && typeof body.institution_name === "string"
    ? body.institution_name.slice(0, 120)
    : null;
  if (!publicToken || publicToken.length > 4096) {
    return NextResponse.json({ error: "A valid one-time Plaid public token is required." }, { status: 400 });
  }

  let exchanged: ExchangeResult | null = null;
  let admin: ReturnType<typeof createAdminClient> | null = null;
  let itemStored = false;

  try {
    exchanged = await plaidRequest<ExchangeResult>("/item/public_token/exchange", { public_token: publicToken });
    const accountData = await plaidRequest<AccountsResult>("/accounts/get", { access_token: exchanged.access_token });
    admin = createAdminClient();

    const { error: itemError } = await admin.from("plaid_items").insert({
      owner_id: user.id,
      item_id: exchanged.item_id,
      institution_name: institutionName,
      encrypted_access_token: encryptPlaidAccessToken(exchanged.access_token),
      updated_at: new Date().toISOString(),
    });
    if (itemError) throw itemError;
    itemStored = true;

    const rows = accountData.accounts.map(account => ({
      owner_id: user.id,
      name: account.official_name || account.name,
      institution: institutionName,
      account_type: account.type === "depository" ? (account.subtype === "savings" ? "savings" : "checking") : account.type === "credit" ? "credit_card" : account.type === "investment" ? "investment" : account.type === "loan" ? "loan" : "other",
      last_four: /^\d{4}$/.test(account.mask ?? "") ? account.mask : null,
      current_balance: account.balances?.current ?? 0,
      credit_limit: account.type === "credit" ? account.balances?.limit ?? null : null,
      currency_code: account.balances?.iso_currency_code || "USD",
      connection_source: "plaid",
      provider_account_id: account.account_id,
    }));
    if (rows.length) {
      const { error: accountError } = await admin.from("accounts").upsert(rows, { onConflict: "owner_id,provider_account_id" });
      if (accountError) throw accountError;
    }

    let transactionSync: { items_synced: number; transactions_added: number } | null = null;
    try {
      transactionSync = await syncPlaidOwnerItems(user.id);
    } catch {
      // First transaction availability can lag behind a successful bank connection.
    }

    return NextResponse.json(
      { connected: true, accounts_added: rows.length, transactions_added: transactionSync?.transactions_added ?? 0 },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    // If the token was stored but the account setup failed, remove the partial
    // connection and revoke it with Plaid so no orphaned credential remains.
    if (itemStored && exchanged && admin) {
      await admin.from("plaid_items").delete()
        .eq("owner_id", user.id)
        .eq("item_id", exchanged.item_id);
      try {
        await plaidRequest("/item/remove", { access_token: exchanged.access_token });
      } catch {
        // The database record is already removed; a failed revoke is not exposed.
      }
    }
    return NextResponse.json({ error: "The bank connection could not be completed. Please try again." }, { status: 502 });
  }
}
