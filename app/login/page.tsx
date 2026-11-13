"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Coffee, Eye, EyeOff, LockKeyhole, Mail, ShieldCheck, UserRound } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type OAuthProvider = "google" | "apple";

export default function LoginPage() {
  const router = useRouter();
  const [setupNeeded, setSetupNeeded] = useState(false);
  const [confirmationError, setConfirmationError] = useState(false);
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setSetupNeeded(params.get("setup") === "supabase");
    setConfirmationError(params.get("error") === "confirmation");
  }, []);
  const [mode, setMode] = useState<"signin" | "signup">("signup");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [oauthBusy, setOauthBusy] = useState<OAuthProvider | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function signInWithProvider(provider: OAuthProvider) {
    setOauthBusy(provider);
    setError("");
    setMessage("");
    try {
      const supabase = createClient();
      const { error: authError } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${window.location.origin}/auth/callback?next=/dashboard`,
        },
      });
      if (authError) throw authError;
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : `Unable to continue with ${provider === "google" ? "Google" : "Apple"}.`);
      setOauthBusy(null);
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setMessage("");

    try {
      const supabase = createClient();
      if (mode === "signup") {
        const { data, error: authError } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            data: { display_name: name.trim() },
            emailRedirectTo: `${window.location.origin}/auth/callback?next=/dashboard`,
          },
        });
        if (authError) throw authError;
        if (data.session && data.user) {
          await supabase.from("profiles").upsert({ id: data.user.id, display_name: name.trim() }, { onConflict: "id" });
          router.replace("/dashboard");
          router.refresh();
        } else {
          setMessage("Your account is created. Check your email for a confirmation link, then come back to sign in.");
          setMode("signin");
        }
      } else {
        const { data, error: authError } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (authError) throw authError;
        if (data.user) {
          const displayName = data.user.user_metadata?.display_name ?? "";
          await supabase.from("profiles").upsert({ id: data.user.id, display_name: displayName || null }, { onConflict: "id" });
        }
        router.replace("/dashboard");
        router.refresh();
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  const authBusy = busy || oauthBusy !== null;

  return (
    <main className="auth-shell">
      <div className="auth-orb auth-orb-one" />
      <div className="auth-orb auth-orb-two" />
      <section className="auth-card">
        <div className="auth-brand">
          <div className="auth-brand-mark"><Coffee size={26} /></div>
          <div><div className="auth-brand-name">brew<span>budget</span></div><p>A better daily grind.</p></div>
        </div>
        <div className="auth-eyebrow"><span /> YOUR MONEY, YOUR SPACE</div>
        <h1>{mode === "signup" ? "Make room for clarity." : "Welcome back."}</h1>
        <p className="auth-intro">{mode === "signup" ? "Create your private workspace and start building a better relationship with your money." : "Sign in to pick up right where you left off."}</p>

        {setupNeeded && <div className="auth-alert">BrewBudget needs its Supabase environment variables added in Vercel before accounts can be activated.</div>}
        {confirmationError && <div className="auth-alert">That confirmation link could not be completed. Please try creating your account again or sign in.</div>}
        {message && <div className="auth-success">{message}</div>}
        {error && <div className="auth-error" role="alert">{error}</div>}

        <div className="auth-social-buttons">
          <button type="button" className="auth-social-button" onClick={() => signInWithProvider("google")} disabled={authBusy || setupNeeded}>
            <svg viewBox="0 0 48 48" aria-hidden="true"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5Z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.76 7.18l7.73 6C44.42 37.98 46.98 31.92 46.98 24.55Z"/><path fill="#FBBC05" d="M10.53 28.59A14.4 14.4 0 0 1 9.75 24c0-1.59.27-3.13.76-4.59l-7.98-6.19A23.9 23.9 0 0 0 0 24c0 3.87.93 7.53 2.56 10.78l7.97-6.19Z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.91-5.8l-7.73-6c-2.14 1.44-4.88 2.3-8.18 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48Z"/></svg>
            {oauthBusy === "google" ? "Connecting..." : "Continue with Google"}
          </button>
          <button type="button" className="auth-social-button" onClick={() => signInWithProvider("apple")} disabled={authBusy || setupNeeded}>
            <svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M16.37 12.21c.02 2.2 1.93 2.93 1.95 2.94-.02.05-.3 1.03-1 2.04-.6.86-1.22 1.72-2.2 1.74-.96.02-1.27-.56-2.37-.56s-1.44.54-2.35.58c-.94.04-1.65-.93-2.25-1.78-1.23-1.77-2.17-5-.9-7.18.63-1.08 1.75-1.77 2.96-1.79.92-.02 1.79.62 2.36.62.57 0 1.64-.77 2.77-.66.47.02 1.8.19 2.65 1.43-.07.04-1.58.92-1.62 2.62ZM14.55 5.97c.5-.6.83-1.44.74-2.27-.72.03-1.6.48-2.12 1.08-.47.54-.88 1.39-.77 2.2.8.06 1.64-.41 2.15-1.01Z"/></svg>
            {oauthBusy === "apple" ? "Connecting..." : "Continue with Apple"}
          </button>
        </div>

        <div className="auth-divider"><span /> <span>or use your email</span> <span /></div>

        <form className="auth-form" onSubmit={submit}>
          {mode === "signup" && <label><span>Your name</span><div className="auth-input-wrap"><UserRound size={17}/><input value={name} onChange={event => setName(event.target.value)} placeholder="How should we call you?" autoComplete="name" required /></div></label>}
          <label><span>Email address</span><div className="auth-input-wrap"><Mail size={17}/><input type="email" value={email} onChange={event => setEmail(event.target.value)} placeholder="you@example.com" autoComplete="email" required /></div></label>
          <label><span>Password</span><div className="auth-input-wrap"><LockKeyhole size={17}/><input type={showPassword ? "text" : "password"} value={password} onChange={event => setPassword(event.target.value)} placeholder="At least 8 characters" autoComplete={mode === "signup" ? "new-password" : "current-password"} minLength={8} required/><button type="button" className="auth-show-password" onClick={() => setShowPassword(value => !value)} aria-label={showPassword ? "Hide password" : "Show password"}>{showPassword ? <EyeOff size={17}/> : <Eye size={17}/>}</button></div></label>
          <button className="auth-submit" disabled={authBusy || setupNeeded}>{busy ? "Please wait..." : mode === "signup" ? "Create my account" : "Sign in"} <span>→</span></button>
        </form>

        <div className="auth-switch">{mode === "signup" ? "Already have an account?" : "New to BrewBudget?"} <button onClick={() => { setMode(mode === "signup" ? "signin" : "signup"); setError(""); setMessage(""); }}>{mode === "signup" ? "Sign in" : "Create an account"}</button></div>
        <div className="auth-security"><ShieldCheck size={16}/><span>Your account and financial data are protected by encrypted sessions and account-level database permissions.</span></div>
      </section>
      <p className="auth-footer"><Coffee size={13}/> A calmer way to handle the daily grind.</p>
    </main>
  );
}
