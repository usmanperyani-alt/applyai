"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { getBrowserClient } from "@/lib/supabase/browser";

type Mode = "signin" | "signup";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") || "/dashboard";

  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setInfo(null);
    setBusy(true);

    const supabase = getBrowserClient();
    try {
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
          },
        });
        if (error) {
          setError(error.message);
        } else if (data.user && !data.session) {
          setInfo("Account created. Check your email for a confirmation link, then sign in.");
          setMode("signin");
        } else {
          router.push(next);
          router.refresh();
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) setError(error.message);
        else { router.push(next); router.refresh(); }
      }
    } finally {
      setBusy(false);
    }
  }

  async function handleOAuth(provider: "google" | "linkedin_oidc") {
    setError(null);
    setInfo(null);
    setBusy(true);
    const supabase = getBrowserClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
      },
    });
    if (error) {
      setError(error.message);
      setBusy(false);
    }
    // On success the browser navigates to the provider; nothing else to do here.
  }

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-cream-100">
      {/* LEFT — editorial hero (hidden on small screens) */}
      <div className="hidden lg:flex lg:w-[54%] xl:w-[55%] bg-forest-900 text-white relative overflow-hidden">
        {/* Floating CV mock — only on xl+ where the dark column has room.
            On lg the column is ~554px wide; the 300px mock collided with the
            editorial copy. xl+ gives enough horizontal space for both. */}
        <div className="pointer-events-none hidden xl:block absolute right-10 bottom-16 w-[280px] h-[360px] -rotate-6">
          {/* Soft green glow behind */}
          <span
            aria-hidden
            className="absolute -inset-12 rounded-full bg-brand-500 opacity-[0.08] blur-2xl"
          />
          {/* Stack shadow */}
          <div className="absolute inset-0 rounded-2xl bg-brand-700 opacity-20 translate-x-3 translate-y-3 rotate-[3deg]" />
          {/* Card */}
          <div className="relative h-full bg-cream-50 rounded-2xl border border-cream-300 p-6 flex flex-col gap-2.5 shadow-2xl">
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-forest-900 self-start">
              <SparklesIcon className="w-2.5 h-2.5 text-brand-500" />
              <span className="text-[8px] font-bold tracking-[0.1em] text-brand-500">AI TAILORED</span>
            </span>
            <div>
              <div className="text-lg font-bold text-forest-900 -tracking-[0.015em]">
                Muhammad Usman
              </div>
              <div className="text-[10px] font-medium text-brand-700">
                Senior Account Executive · API-first SaaS
              </div>
            </div>
            <div className="h-px bg-cream-300" />
            <div>
              <div className="text-[7px] font-bold tracking-[0.13em] text-brand-700">SUMMARY</div>
              <p className="text-[9px] leading-[1.5] text-ink-700 mt-1">
                Enterprise AE selling API-first SaaS to engineering buyers — closed $14.2M ARR
                with usage-based pricing.
              </p>
            </div>
            <div>
              <div className="text-[7px] font-bold tracking-[0.13em] text-brand-700">EXPERIENCE</div>
              <div className="text-[9px] font-semibold text-forest-900 mt-1">
                Senior AE — Stripe   2021–Present
              </div>
              <p className="text-[8px] leading-[1.5] text-ink-700 mt-0.5">
                • Closed $14.2M ARR across 47 enterprise AI-first accounts.
              </p>
              <p className="text-[8px] leading-[1.5] text-ink-700">
                • Built outbound playbook adopted by 6 AEs.
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-col justify-between p-14 xl:p-16 w-full relative">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <span className="w-3.5 h-3.5 rounded-full bg-brand-500" />
            <span className="text-lg font-bold tracking-tight">applyai</span>
          </div>

          {/* Editorial copy */}
          <div className="space-y-6 max-w-md">
            <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-forest-800">
              <SparklesIcon className="w-3 h-3 text-brand-500" />
              <span className="text-[11px] font-bold tracking-[0.13em] text-brand-500">
                YOUR AI JOB AGENT
              </span>
            </span>
            <h1 className="text-[60px] xl:text-[68px] leading-[1.02] tracking-[-0.04em] font-bold">
              Apply with intention.
            </h1>
            <p className="text-[17px] leading-[1.5] text-warm-400 -tracking-[0.01em]">
              Not 100 generic applications. One tailored CV per role — written from your real
              work, generated in seconds, saved against the job so you never lose track.
            </p>

            <div className="grid grid-cols-3 gap-4 pt-6">
              <Stat n="1,124" label="jobs scanned today" />
              <Stat n="33%" label="avg response rate" />
              <Stat n="18s" label="average tailor time" />
            </div>
          </div>

          {/* Footer trust */}
          <div className="flex items-center gap-2.5 text-ink-700 text-xs font-medium">
            <ShieldIcon className="w-3.5 h-3.5" />
            Your CV stays yours. Encrypted at rest, never shared.
          </div>
        </div>

      </div>

      {/* RIGHT — form */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 lg:p-10 bg-cream-100 min-h-screen lg:min-h-0">
        {/* Mobile-only inline brand row */}
        <div className="lg:hidden flex items-center gap-2.5 self-start mb-8">
          <span className="w-3 h-3 rounded-full bg-brand-500" />
          <span className="text-[15px] font-bold tracking-tight text-forest-900">applyai</span>
        </div>

        <div className="w-full max-w-[420px] bg-white border border-cream-300 rounded-3xl p-8 lg:p-9 shadow-sm">
          {/* Tab toggle */}
          <div className="flex p-1 bg-cream-100 rounded-full mb-6">
            <button
              type="button"
              onClick={() => { setMode("signin"); setError(null); setInfo(null); }}
              className={`flex-1 h-9 rounded-full text-[13px] font-semibold transition-colors ${
                mode === "signin"
                  ? "bg-white text-forest-900 border border-cream-300"
                  : "text-ink-700 font-medium"
              }`}
            >
              Sign in
            </button>
            <button
              type="button"
              onClick={() => { setMode("signup"); setError(null); setInfo(null); }}
              className={`flex-1 h-9 rounded-full text-[13px] font-semibold transition-colors ${
                mode === "signup"
                  ? "bg-white text-forest-900 border border-cream-300"
                  : "text-ink-700 font-medium"
              }`}
            >
              Create account
            </button>
          </div>

          {/* Heading */}
          <div className="mb-6">
            <h2 className="text-[26px] font-bold text-forest-900 -tracking-[0.025em]">
              {mode === "signin" ? "Welcome back" : "Get started"}
            </h2>
            <p className="text-[13px] text-ink-700 mt-1">
              {mode === "signin"
                ? "Sign in to your job agent."
                : "Three steps and the agent starts hunting for you."}
            </p>
          </div>

          {/* OAuth row */}
          <div className="flex gap-2 mb-5">
            <button
              type="button"
              onClick={() => handleOAuth("google")}
              disabled={busy}
              className="flex-1 h-[46px] flex items-center justify-center gap-2.5 rounded-full bg-white border border-cream-300 text-[13px] font-medium text-forest-900 hover:bg-cream-100 transition-colors disabled:opacity-50"
            >
              <GoogleIcon className="w-3.5 h-3.5" />
              Continue with Google
            </button>
            <button
              type="button"
              onClick={() => handleOAuth("linkedin_oidc")}
              disabled={busy}
              className="w-[46px] h-[46px] flex items-center justify-center rounded-full bg-white border border-cream-300 hover:bg-cream-100 transition-colors disabled:opacity-50"
              aria-label="Continue with LinkedIn"
            >
              <LinkedInIcon className="w-4 h-4 text-ink-700" />
            </button>
          </div>

          {/* Divider */}
          <div className="flex items-center gap-3.5 mb-5">
            <div className="flex-1 h-px bg-cream-300" />
            <span className="text-[10px] font-semibold tracking-[0.14em] text-warm-400">
              OR EMAIL
            </span>
            <div className="flex-1 h-px bg-cream-300" />
          </div>

          {/* Form */}
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
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@company.com"
                  className="flex-1 bg-transparent text-[13px] font-medium text-forest-900 placeholder-warm-400 outline-none"
                />
              </div>
            </div>

            <div>
              <div className="flex items-baseline justify-between mb-1.5">
                <label className="block text-[10px] font-semibold tracking-[0.12em] text-ink-700">
                  PASSWORD
                </label>
                {mode === "signin" && (
                  <a
                    href="/auth/forgot"
                    className="text-[10px] font-semibold tracking-wider text-brand-700 hover:text-brand-900"
                  >
                    Forgot?
                  </a>
                )}
              </div>
              <div className="flex items-center gap-2.5 h-[46px] px-4 rounded-xl bg-white border border-brand-500 focus-within:ring-1 focus-within:ring-brand-500">
                <LockIcon className="w-3.5 h-3.5 text-warm-400 shrink-0" />
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  minLength={6}
                  autoComplete={mode === "signin" ? "current-password" : "new-password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={mode === "signup" ? "At least 6 characters" : "••••••••"}
                  className="flex-1 bg-transparent text-[14px] font-bold tracking-[0.05em] text-forest-900 placeholder-warm-400 placeholder:font-normal placeholder:tracking-normal outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="text-warm-400 hover:text-ink-700 transition-colors"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOffIcon className="w-4 h-4" /> : <EyeIcon className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {error && (
              <div className="text-[12px] text-red-700 bg-red-50 border border-red-200 rounded-xl px-3.5 py-2.5">
                {error}
              </div>
            )}
            {info && (
              <div className="text-[12px] text-brand-700 bg-brand-soft border border-brand-100 rounded-xl px-3.5 py-2.5">
                {info}
              </div>
            )}

            <button
              type="submit"
              disabled={busy}
              className="w-full h-[54px] flex items-center justify-center gap-2.5 rounded-full bg-forest-900 text-white text-[15px] font-semibold disabled:opacity-50 hover:bg-forest-800 transition-colors mt-2"
            >
              {busy
                ? mode === "signin" ? "Signing in…" : "Creating account…"
                : (
                  <>
                    {mode === "signin" ? "Sign in" : "Create account"}
                    <ArrowRightIcon className="w-4 h-4" />
                  </>
                )}
            </button>
          </form>

          <p className="text-[11px] text-warm-400 text-center mt-5 leading-relaxed">
            By signing in, you agree to the{" "}
            <a href="#" className="text-ink-700 hover:text-forest-900 underline underline-offset-2">Terms</a>{" "}
            and{" "}
            <a href="#" className="text-ink-700 hover:text-forest-900 underline underline-offset-2">Privacy Policy</a>.
          </p>
        </div>
      </div>
    </div>
  );
}

function Stat({ n, label }: { n: string; label: string }) {
  return (
    <div>
      <div className="text-[32px] font-bold text-cream-50 -tracking-[0.03em]">{n}</div>
      <div className="text-[11px] font-medium tracking-[0.04em] text-warm-400">{label}</div>
    </div>
  );
}

/* ---- Inline icons (no extra dependency) ---- */
type IconProps = { className?: string };
const SparklesIcon = ({ className }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M9.94 14.06 12 20l2.06-5.94L20 12l-5.94-2.06L12 4l-2.06 5.94L4 12z" />
    <path d="M19 4v3M5.5 18.5l1.5-1.5M19 21v-3" />
  </svg>
);
const ShieldIcon = ({ className }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    <path d="m9 12 2 2 4-4" />
  </svg>
);
const MailIcon = ({ className }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <rect x="2" y="4" width="20" height="16" rx="2" />
    <path d="m22 7-10 5L2 7" />
  </svg>
);
const LockIcon = ({ className }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <rect x="3" y="11" width="18" height="11" rx="2" />
    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </svg>
);
const EyeIcon = ({ className }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);
const EyeOffIcon = ({ className }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
    <path d="M10.73 5.08A11 11 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" />
    <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" />
    <line x1="2" y1="2" x2="22" y2="22" />
  </svg>
);
const ArrowRightIcon = ({ className }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M5 12h14M12 5l7 7-7 7" />
  </svg>
);
const LinkedInIcon = ({ className }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M20.45 20.45h-3.55v-5.57c0-1.33-.03-3.04-1.85-3.04-1.86 0-2.14 1.45-2.14 2.95v5.66H9.36V9h3.41v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.45v6.29zM5.34 7.43a2.06 2.06 0 1 1 0-4.13 2.06 2.06 0 0 1 0 4.13zm1.78 13.02H3.56V9h3.56v11.45zM22.22 0H1.77C.79 0 0 .77 0 1.72v20.56C0 23.23.79 24 1.77 24h20.45c.98 0 1.78-.77 1.78-1.72V1.72C24 .77 23.2 0 22.22 0z" />
  </svg>
);
const GoogleIcon = ({ className }: IconProps) => (
  <svg viewBox="0 0 24 24" className={className}>
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
  </svg>
);

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
