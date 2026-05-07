"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { getBrowserClient } from "@/lib/supabase/browser";
import { AuthShell } from "@/components/auth/AuthShell";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);

    const supabase = getBrowserClient();
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?next=/auth/reset`,
    });

    if (error) {
      setError(error.message);
      setBusy(false);
      return;
    }

    router.push(`/auth/check-email?email=${encodeURIComponent(email)}`);
  }

  return (
    <AuthShell
      badgeText="ACCOUNT RECOVERY"
      headline="Forgot your password?"
      subline="Happens. Pop in your email and we'll send a reset link — usually arrives in under a minute."
      footerText="Tools we trust handle this for us. Your reset link expires in 30 minutes."
    >
      <a
        href="/login"
        className="inline-flex items-center gap-1.5 text-[12px] font-medium text-ink-700 hover:text-forest-900 mb-5"
      >
        <ArrowLeftIcon className="w-3.5 h-3.5" />
        Back to sign in
      </a>

      <div className="mb-6">
        <h2 className="text-[26px] font-bold text-forest-900 -tracking-[0.025em]">
          Reset password
        </h2>
        <p className="text-[13px] text-ink-700 mt-1">
          Enter your account email below.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3.5">
        <div>
          <label className="block text-[10px] font-semibold tracking-[0.12em] text-ink-700 mb-1.5">
            EMAIL
          </label>
          <div className="flex items-center gap-2.5 h-[46px] px-4 rounded-xl bg-cream-100 focus-within:bg-white focus-within:ring-1 focus-within:ring-brand-500">
            <MailIcon className="w-3.5 h-3.5 text-warm-400 shrink-0" />
            <input
              type="email"
              required
              autoComplete="email"
              autoFocus
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@company.com"
              className="flex-1 bg-transparent text-[13px] font-medium text-forest-900 placeholder-warm-400 outline-none"
            />
          </div>
        </div>

        {error && (
          <div className="text-[12px] text-red-700 bg-red-50 border border-red-200 rounded-xl px-3.5 py-2.5">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={busy}
          className="w-full h-[54px] flex items-center justify-center gap-2.5 rounded-full bg-forest-900 text-white text-[15px] font-semibold disabled:opacity-50 hover:bg-forest-800 transition-colors mt-2"
        >
          {busy ? "Sending…" : (<>Send reset link <ArrowRightIcon className="w-4 h-4" /></>)}
        </button>
      </form>

      <p className="text-[11px] text-warm-400 text-center mt-5">
        You'll receive an email with a link to reset, valid for 30 minutes.
      </p>
    </AuthShell>
  );
}

type IconProps = { className?: string };
const MailIcon = ({ className }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <rect x="2" y="4" width="20" height="16" rx="2" />
    <path d="m22 7-10 5L2 7" />
  </svg>
);
const ArrowRightIcon = ({ className }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M5 12h14M12 5l7 7-7 7" />
  </svg>
);
const ArrowLeftIcon = ({ className }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M19 12H5M12 19l-7-7 7-7" />
  </svg>
);
