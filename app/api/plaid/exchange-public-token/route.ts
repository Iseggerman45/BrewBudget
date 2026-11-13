import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { encryptPlaidAccessToken, plaidIsConfigured, plaidRequest } from "@/lib/plaid/server";

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
    balances: { current?: number | null; iso_currency_code?: string | null };
  }>;
};

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return NextResponse.json({ error: "Please sign in first." }, { status: 401 });
  if (!plaidIsConfigured() || !process.env.SUPABASE_SECRET_KEY || !process.env.PLAID_TOKEN_ENCRYPTION_KEY) {
    return NextResponse.json({ error: "The secure bank connection service is not fully configured yet." }, { status: 503 });
  }

  const body = await request.json().catch(() => null);
  const publicToken = typeof body?.public_token === "string" ? body.public_token : "";
  const institutionName = typeof body?.institution_name === "string" ? body.institution_name.slice(0, 120) : null;
  if (!publicToken || publicToken.length > 4096) return NextResponse.json({ error: "A valid one-time Plaid public token is required." }, { status: 400 });

  try {
    const exchanged = await plaidRequest<ExchangeResult>("/item/public_token/exchange", { public_token: publicToken });
    const accountData = await plaidRequest<AccountsResult>("/accounts/get", { access_token: exchanged.access_token });
    const admin = createAdminClient();

    const { error: itemError } = await admin.from("plaid_items").insert({
      owner_id: user.id,
      item_id: exchanged.item_id,
      institution_name: institutionName,
      encrypted_access_token: encryptPlaidAccessToken(exchanged.access_token),
      updated_at: new Date().toISOString(),
    });
    if (itemError) throw itemError;

    const rows = accountData.accounts.map(account => ({
      owner_id: user.id,
      name: account.official_name || account.name,
      institution: institutionName,
      account_type: account.type === "depository" ? (account.subtype === "savings" ? "savings" : "checking") : account.type === "credit" ? "credit_card" : account.type === "investment" ? "investment" : account.type === "loan" ? "loan" : "other",
      last_four: /^\d{4}$/.test(account.mask ?? "") ? account.mask : null,
      current_balance: account.balances?.current ?? 0,
      currency_code: account.balances?.iso_currency_code || "USD",
      connection_source: "plaid",
      provider_account_id: account.account_id,
    }));
    if (rows.length) {
      const { error: accountError } = await admin.from("accounts").upsert(rows, { onConflict: "owner_id,provider_account_id" });
      if (accountError) throw accountError;
    }

    return NextResponse.json({ connected: true, accounts_added: rows.length }, { headers: { "Cache-Control": "no-store" } });
  } catch (caught) {
    const message = caught instanceof Error ? caught.message : "The bank connection could not be completed.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
