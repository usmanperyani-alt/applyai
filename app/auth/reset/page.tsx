"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { getBrowserClient } from "@/lib/supabase/browser";
import { AuthShell } from "@/components/auth/AuthShell";

type Strength = { score: 0 | 1 | 2 | 3 | 4; label: string; tone: string };

// 0 = empty, 1 = weak, 2 = okay, 3 = strong, 4 = excellent.
// Heuristic: length, mixed case, digits, symbols.
function scorePassword(p: string): Strength {
  if (!p) return { score: 0, label: "", tone: "" };
  let s = 0;
  if (p.length >= 8) s++;
  if (p.length >= 12) s++;
  if (/[A-Z]/.test(p) && /[a-z]/.test(p)) s++;
  if (/\d/.test(p) && /[^A-Za-z0-9]/.test(p)) s++;
  const score = Math.min(4, s) as Strength["score"];
  const labels = ["", "Weak", "Okay", "Strong", "Excellent"];
  const tones = ["", "text-red-700", "text-amber-darkest", "text-brand-700", "text-brand-700"];
  return { score, label: labels[score], tone: tones[score] };
}

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sessionReady, setSessionReady] = useState(false);

  // Without a recovery session, updateUser will fail. Verify before allowing submit.
  useEffect(() => {
    const supabase = getBrowserClient();
    supabase.auth.getUser().then(({ data }) => {
      setSessionReady(Boolean(data.user));
    });
  }, []);

  const strength = useMemo(() => scorePassword(password), [password]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords don't match.");
      return;
    }

    setBusy(true);
    const supabase = getBrowserClient();
    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      setError(error.message);
      setBusy(false);
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  return (
    <AuthShell
      badgeText="ALMOST THERE"
      headline="Set a new password."
      subline="Once it's saved we'll log you back in and you can keep applying."
      footerText="This link expires in 30 min."
    >
      <div className="mb-6">
        <h2 className="text-[26px] font-bold text-forest-900 -tracking-[0.025em]">
          New password
        </h2>
        <p className="text-[13px] text-ink-700 mt-1">
          At least 8 characters. Mix in numbers and symbols for more strength.
        </p>
      </div>

      {!sessionReady && (
        <div className="text-[12px] text-amber-darkest bg-amber-badge-bg border border-amber-bar rounded-xl px-3.5 py-2.5 mb-4">
          Verifying your reset link… If this stays, the link may have expired.{" "}
          <a href="/auth/forgot" className="underline underline-offset-2 font-semibold">
            Request a new one
          </a>.
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-3.5">
        <div>
          <label className="block text-[10px] font-semibold tracking-[0.12em] text-ink-700 mb-1.5">
            NEW PASSWORD
          </label>
          <div className="flex items-center gap-2.5 h-[46px] px-4 rounded-xl bg-cream-100 focus-within:bg-white focus-within:ring-1 focus-within:ring-brand-500">
            <LockIcon className="w-3.5 h-3.5 text-warm-400 shrink-0" />
            <input
              type={show ? "text" : "password"}
              required
              minLength={8}
              autoComplete="new-password"
              autoFocus
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="flex-1 bg-transparent text-[14px] font-bold tracking-[0.05em] text-forest-900 placeholder-warm-400 outline-none"
            />
            <button
              type="button"
              onClick={() => setShow((v) => !v)}
              className="text-warm-400 hover:text-ink-700 transition-colors"
              aria-label={show ? "Hide password" : "Show password"}
            >
              {show ? <EyeOffIcon className="w-4 h-4" /> : <EyeIcon className="w-4 h-4" />}
            </button>
          </div>

          {/* Strength indicator: 4 segments fill based on score */}
          {password && (
            <div className="mt-2 flex items-center gap-2">
              <div className="flex-1 grid grid-cols-4 gap-1">
                {[1, 2, 3, 4].map((seg) => (
                  <div
                    key={seg}
                    className={`h-1 rounded-full transition-colors ${
                      strength.score >= seg
                        ? strength.score >= 3
                          ? "bg-brand-500"
                          : strength.score === 2
                          ? "bg-amber-dark"
                          : "bg-red-700"
                        : "bg-cream-300"
                    }`}
                  />
                ))}
              </div>
              <span className={`text-[10px] font-semibold tracking-wider ${strength.tone}`}>
                {strength.label}
              </span>
            </div>
          )}
        </div>

        <div>
          <label className="block text-[10px] font-semibold tracking-[0.12em] text-ink-700 mb-1.5">
            CONFIRM
          </label>
          <div className="flex items-center gap-2.5 h-[46px] px-4 rounded-xl bg-cream-100 focus-within:bg-white focus-within:ring-1 focus-within:ring-brand-500">
            <LockIcon className="w-3.5 h-3.5 text-warm-400 shrink-0" />
            <input
              type={show ? "text" : "password"}
              required
              minLength={8}
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className="flex-1 bg-transparent text-[14px] font-bold tracking-[0.05em] text-forest-900 placeholder-warm-400 outline-none"
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
          disabled={busy || !sessionReady}
          className="w-full h-[54px] flex items-center justify-center gap-2.5 rounded-full bg-forest-900 text-white text-[15px] font-semibold disabled:opacity-50 hover:bg-forest-800 transition-colors mt-2"
        >
          {busy ? "Saving…" : (<>Save and sign in <ArrowRightIcon className="w-4 h-4" /></>)}
        </button>
      </form>
    </AuthShell>
  );
}

type IconProps = { className?: string };
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
