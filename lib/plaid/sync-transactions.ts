import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { decryptPlaidAccessToken, plaidRequest } from "@/lib/plaid/server";

type PlaidTxn = {
  transaction_id: string;
  account_id: string;
  amount: number;
  date: string;
  name: string;
  merchant_name?: string | null;
  pending?: boolean;
  pending_transaction_id?: string | null;
  personal_finance_category?: { primary?: string; detailed?: string } | null;
  category?: string[] | null;
};
type SyncPage = {
  added: PlaidTxn[];
  modified: PlaidTxn[];
  removed: Array<{ transaction_id: string; account_id: string }>;
  next_cursor: string;
  has_more: boolean;
};

function isTransfer(txn: PlaidTxn) {
  const primary = txn.personal_finance_category?.primary?.toUpperCase() ?? "";
  const text = `${txn.name} ${txn.merchant_name ?? ""}`.toLowerCase();
  return primary.startsWith("TRANSFER") ||
    /\b(credit card payment|card payment|autopay payment|payment thank you|online payment|payment to .*card|thank you payment)\b/.test(text);
}

function categoryName(txn: PlaidTxn) {
  const primary = txn.personal_finance_category?.primary?.toUpperCase() ?? "";
  const text = `${txn.name} ${txn.merchant_name ?? ""} ${(txn.category ?? []).join(" ")}`.toLowerCase();
  if (/grocery|supermarket/.test(text) || primary.includes("FOOD_AND_DRINK") && /grocery/.test(text)) return "Groceries";
  if (/restaurant|coffee|fast food|food and drink/.test(text) || primary === "FOOD_AND_DRINK") return "Restaurants";
  if (/gas station|fuel/.test(text) || primary === "TRANSPORTATION") return "Gas & fuel";
  if (/rent|mortgage/.test(text) || primary === "RENT_AND_UTILITIES") return "Mortgage / rent";
  if (/electric/.test(text)) return "Electricity";
  if (/natural gas|gas bill/.test(text)) return "Natural gas";
  if (/water|sewer/.test(text)) return "Water & sewer";
  if (/internet/.test(text)) return "Internet";
  if (/phone|wireless/.test(text)) return "Phone";
  if (/utility/.test(text) || primary === "RENT_AND_UTILITIES") return "Electricity";
  if (/medical|pharmacy|doctor|health/.test(text) || primary === "MEDICAL") return "Health & medical";
  if (/airline|hotel|travel/.test(text) || primary === "TRAVEL") return "Travel";
  if (/subscription|streaming/.test(text) || primary === "ENTERTAINMENT") return "Entertainment";
  if (/shopping|store|retail/.test(text) || primary === "GENERAL_MERCHANDISE") return "Shopping";
  return null;
}

export async function syncPlaidOwnerItems(ownerId: string) {
  const admin = createAdminClient();
  const { data: items, error: itemError } = await admin.from("plaid_items")
    .select("id,owner_id,institution_name,encrypted_access_token,transaction_cursor").eq("owner_id", ownerId);
  if (itemError) throw itemError;
  let addedCount = 0;
  for (const item of items ?? []) {
    const accessToken = decryptPlaidAccessToken(item.encrypted_access_token);
    const balanceData = await plaidRequest<{ accounts: Array<{ account_id: string; name: string; official_name?: string | null; type: string; subtype?: string | null; mask?: string | null; balances: { current?: number | null; limit?: number | null; iso_currency_code?: string | null } }> }>("/accounts/get", { access_token: accessToken });
    const refreshedAccounts = (balanceData.accounts ?? []).map(account => ({
      owner_id: ownerId,
      name: account.official_name || account.name,
      institution: item.institution_name,
      account_type: account.type === "depository" ? (account.subtype === "savings" ? "savings" : "checking") : account.type === "credit" ? "credit_card" : account.type === "investment" ? "investment" : account.type === "loan" ? "loan" : "other",
      last_four: /^\\d{4}$/.test(account.mask ?? "") ? account.mask : null,
      current_balance: account.balances?.current ?? 0,
      credit_limit: account.type === "credit" ? account.balances?.limit ?? null : null,
      currency_code: account.balances?.iso_currency_code || "USD",
      connection_source: "plaid",
      provider_account_id: account.account_id,
    }));
    if (refreshedAccounts.length) {
      const { error: balanceError } = await admin.from("accounts").upsert(refreshedAccounts, { onConflict: "owner_id,provider_account_id" });
      if (balanceError) throw balanceError;
    }
    const { data: accounts, error: accountError } = await admin.from("accounts")
      .select("id,provider_account_id").eq("owner_id", ownerId).eq("connection_source", "plaid");
    if (accountError) throw accountError;
    const accountIds = new Map((accounts ?? []).map((account: any) => [account.provider_account_id, account.id]));
    const { data: categories, error: categoryError } = await admin.from("categories")
      .select("id,name").eq("owner_id", ownerId).eq("category_type", "expense");
    if (categoryError) throw categoryError;
    const categoryIds = new Map((categories ?? []).map((category: any) => [category.name.toLowerCase(), category.id]));

    const originalCursor = item.transaction_cursor ?? undefined;
    let cursor = originalCursor;
    let hasMore = true;
    let pages = 0;
    const added: PlaidTxn[] = [];
    const modified: PlaidTxn[] = [];
    const removed: SyncPage["removed"] = [];
    while (hasMore) {
      if (++pages > 30) throw new Error("Plaid returned too many transaction pages. Please sync again.");
      const page = await plaidRequest<SyncPage>("/transactions/sync", {
        access_token: accessToken,
        ...(cursor ? { cursor } : {}),
        count: 500,
      });
      added.push(...(page.added ?? []));
      modified.push(...(page.modified ?? []));
      removed.push(...(page.removed ?? []));
      cursor = page.next_cursor;
      hasMore = page.has_more;
    }

    for (const txn of [...added, ...modified]) {
      const accountId = accountIds.get(txn.account_id);
      if (!accountId) continue;
      const transfer = isTransfer(txn);
      const income = txn.amount < 0 && !transfer;
      const mappedCategory = categoryName(txn);
      const categoryId = !transfer && !income && mappedCategory
        ? categoryIds.get(mappedCategory.toLowerCase()) ?? null : null;
      const { error } = await admin.from("transactions").upsert({
        owner_id: ownerId,
        account_id: accountId,
        category_id: categoryId,
        description: txn.merchant_name || txn.name,
        merchant: txn.merchant_name || null,
        amount: Math.abs(Number(txn.amount)),
        transaction_type: transfer ? "transfer" : income ? "income" : "expense",
        transaction_date: txn.date,
        source: "plaid",
        external_transaction_id: txn.transaction_id,
        notes: txn.pending ? "Pending transaction" : null,
      }, { onConflict: "account_id,external_transaction_id" });
      if (error) throw error;
      if (added.some(row => row.transaction_id === txn.transaction_id)) addedCount++;
    }
    for (const txn of removed) {
      const accountId = accountIds.get(txn.account_id);
      if (!accountId) continue;
      const { error } = await admin.from("transactions").delete()
        .eq("owner_id", ownerId).eq("account_id", accountId)
        .eq("external_transaction_id", txn.transaction_id);
      if (error) throw error;
    }
    const { error: cursorError } = await admin.from("plaid_items")
      .update({ transaction_cursor: cursor ?? null, updated_at: new Date().toISOString() })
      .eq("id", item.id).eq("owner_id", ownerId);
    if (cursorError) throw cursorError;
  }
  return { items_synced: items?.length ?? 0, transactions_added: addedCount };
}
