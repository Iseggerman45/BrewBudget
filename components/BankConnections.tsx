"use client";

import { useCallback, useEffect, useState } from "react";
import { usePlaidLink, type PlaidLinkOnSuccess } from "react-plaid-link";
import { Landmark, Plus, RefreshCw, ShieldCheck, Wallet } from "lucide-react";

type Account = {
  id: string;
  name: string;
  institution: string | null;
  account_type: string;
  last_four: string | null;
  current_balance: number;
  currency_code: string;
  connection_source: string;
};

export default function BankConnections() {
  const [linkToken, setLinkToken] = useState<string | null>(null);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [receivedRedirectUri, setReceivedRedirectUri] = useState<string | undefined>(undefined);

  const loadAccounts = useCallback(async () => {
    const response = await fetch("/api/accounts", { cache: "no-store" });
    const result = await response.json();
    if (response.ok) setAccounts(result.accounts ?? []);
  }, []);

  useEffect(() => {
    void loadAccounts();
    const params = new URLSearchParams(window.location.search);
    if (params.has("oauth_state_id")) {
      const savedToken = window.localStorage.getItem("brewbudget_plaid_link_token");
      if (savedToken) {
        setLinkToken(savedToken);
        setReceivedRedirectUri(window.location.href);
      } else {
        setError("Your bank sign-in returned, but the secure connection session expired. Please try connecting again.");
      }
    }
  }, [loadAccounts]);

  const onSuccess = useCallback<PlaidLinkOnSuccess>(async (publicToken, metadata) => {
    if (!publicToken) { setError("Plaid did not return a bank connection token. Please try again."); return; }
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/plaid/exchange-public-token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ public_token: publicToken, institution_name: metadata.institution?.name ?? null }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Could not finish connecting this bank.");
      setNotice(`Connected successfully. ${result.accounts_added} account(s) added.`);
      window.localStorage.removeItem("brewbudget_plaid_link_token");
      window.history.replaceState({}, "", window.location.pathname);
      await loadAccounts();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not finish connecting this bank.");
    } finally {
      setBusy(false);
      setLinkToken(null);
      setReceivedRedirectUri(undefined);
    }
  }, [loadAccounts]);

  const { open, ready } = usePlaidLink({
    token: linkToken,
    receivedRedirectUri,
    onSuccess,
    onExit: () => { setLinkToken(null); setReceivedRedirectUri(undefined); window.localStorage.removeItem("brewbudget_plaid_link_token"); setBusy(false); },
  });

  useEffect(() => {
    if (linkToken && ready) open();
  }, [linkToken, ready, open]);

  async function connectBank() {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const response = await fetch("/api/plaid/create-link-token", { method: "POST" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Bank connection is not available.");
      window.localStorage.setItem("brewbudget_plaid_link_token", result.link_token);
      setLinkToken(result.link_token);
    } catch (caught) {
      setBusy(false);
      setError(caught instanceof Error ? caught.message : "Could not start bank connection.");
    }
  }

  return (
    <div className="bank-connections">
      <div className="bank-security-note"><ShieldCheck size={17}/><span>Bank login happens directly inside Plaid Link. BrewBudget never sees or stores your bank password. Connection tokens stay server-side and are encrypted before storage.</span></div>
      {notice && <div className="bank-notice">{notice}</div>}
      {error && <div className="bank-error">{error}</div>}
      <div className="bank-accounts">
        {accounts.map(account => (
          <section className="glass-card account-card" key={account.id}>
            <div className="account-logo"><Landmark size={21}/></div>
            <div><strong>{account.name}</strong><p>{account.institution || "Connected bank"} · {account.account_type}{account.last_four ? ` •• ${account.last_four}` : ""}</p></div>
            <div className="account-balance">{new Intl.NumberFormat("en-US", { style: "currency", currency: account.currency_code || "USD" }).format(account.current_balance ?? 0)}</div>
          </section>
        ))}
        {!accounts.length && <section className="glass-card bank-empty"><div className="debt-empty-icon"><Wallet size={24}/></div><h2>Your accounts start here.</h2><p>Connect a checking, savings, or credit account securely through Plaid. Your accounts will appear here once linked.</p></section>}
      </div>
      <button className="connect-card" onClick={connectBank} disabled={busy || (Boolean(linkToken) && !ready)}>
        {busy ? <RefreshCw size={17} className="bank-spinner"/> : <Plus size={18}/>}
        {busy ? "Preparing secure connection…" : "Connect a bank account"}
      </button>
      <p className="bank-footnote">Powered by Plaid · You choose which accounts to share and can revoke access.</p>
    </div>
  );
}
