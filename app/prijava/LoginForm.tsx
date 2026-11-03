"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function LoginForm({ next }: { next: string }) {
  const router = useRouter();
  const supabase = createClient();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<"email" | "code">("email");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function sendCode(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: {
        shouldCreateUser: true,
        emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
      },
    });
    setBusy(false);
    if (error) setError("Slanje nije uspelo. Proveri email i probaj ponovo za minut.");
    else setStep("code");
  }

  async function verify(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const { error } = await supabase.auth.verifyOtp({
      email: email.trim(),
      token: code.trim(),
      type: "email",
    });
    setBusy(false);
    if (error) {
      setError("Kod nije tačan ili je istekao.");
      return;
    }
    router.replace(next);
    router.refresh();
  }

  if (step === "code") {
    return (
      <form onSubmit={verify} className="card stack">
        <span>
          Poslali smo kod na <strong>{email}</strong>. Upiši ga ovde (ili klikni na link iz mejla
          u istom browseru).
        </span>
        <label className="field">
          Kod iz mejla
          <input
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            required
          />
        </label>
        {error && <div className="notice notice-error">{error}</div>}
        <button className="btn btn-block" type="submit" disabled={busy}>
          {busy ? "Proveravam…" : "Prijavi me"}
        </button>
        <button className="btn btn-ghost btn-sm" type="button" onClick={() => setStep("email")}>
          Promeni email
        </button>
      </form>
    );
  }

  return (
    <form onSubmit={sendCode} className="card stack">
      <label className="field">
        Email
        <input
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
      </label>
      {error && <div className="notice notice-error">{error}</div>}
      <button className="btn btn-block" type="submit" disabled={busy}>
        {busy ? "Šaljem…" : "Pošalji kod"}
      </button>
    </form>
  );
}
