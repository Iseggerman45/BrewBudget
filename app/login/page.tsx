"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Coffee, Eye, EyeOff, LockKeyhole, Mail, ShieldCheck, UserRound } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

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
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

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
        {error && <div className="auth-error">{error}</div>}

        <form className="auth-form" onSubmit={submit}>
          {mode === "signup" && <label><span>Your name</span><div className="auth-input-wrap"><UserRound size={17}/><input value={name} onChange={event => setName(event.target.value)} placeholder="How should we call you?" autoComplete="name" required /></div></label>}
          <label><span>Email address</span><div className="auth-input-wrap"><Mail size={17}/><input type="email" value={email} onChange={event => setEmail(event.target.value)} placeholder="you@example.com" autoComplete="email" required /></div></label>
          <label><span>Password</span><div className="auth-input-wrap"><LockKeyhole size={17}/><input type={showPassword ? "text" : "password"} value={password} onChange={event => setPassword(event.target.value)} placeholder="At least 8 characters" autoComplete={mode === "signup" ? "new-password" : "current-password"} minLength={8} required/><button type="button" className="auth-show-password" onClick={() => setShowPassword(value => !value)} aria-label={showPassword ? "Hide password" : "Show password"}>{showPassword ? <EyeOff size={17}/> : <Eye size={17}/>}</button></div></label>
          <button className="auth-submit" disabled={busy || setupNeeded}>{busy ? "Please wait..." : mode === "signup" ? "Create my account" : "Sign in"} <span>→</span></button>
        </form>

        <div className="auth-switch">{mode === "signup" ? "Already have an account?" : "New to BrewBudget?"} <button onClick={() => { setMode(mode === "signup" ? "signin" : "signup"); setError(""); setMessage(""); }}>{mode === "signup" ? "Sign in" : "Create an account"}</button></div>
        <div className="auth-security"><ShieldCheck size={16}/><span>Your account and financial data are protected by encrypted sessions and account-level database permissions.</span></div>
      </section>
      <p className="auth-footer"><Coffee size={13}/> A calmer way to handle the daily grind.</p>
    </main>
  );
}
