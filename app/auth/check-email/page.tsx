"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { getBrowserClient } from "@/lib/supabase/browser";
import { AuthShell } from "@/components/auth/AuthShell";

function CheckEmailInner() {
  const searchParams = useSearchParams();
  const email = searchParams.get("email") || "";

  const [seconds, setSeconds] = useState(45);
  const [resendBusy, setResendBusy] = useState(false);
  const [resendInfo, setResendInfo] = useState<string | null>(null);
  const [resendError, setResendError] = useState<string | null>(null);

  useEffect(() => {
    if (seconds <= 0) return;
    const id = setTimeout(() => setSeconds((s) => s - 1), 1000);
    return () => clearTimeout(id);
  }, [seconds]);

  async function handleResend() {
    if (seconds > 0 || !email) return;
    setResendBusy(true);
    setResendInfo(null);
    setResendError(null);

    const supabase = getBrowserClient();
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?next=/auth/reset`,
    });
    setResendBusy(false);

    if (error) {
      setResendError(error.message);
      return;
    }
    setResendInfo("Sent. Check your inbox.");
    setSeconds(45);
  }

  return (
    <AuthShell
      badgeText="EMAIL ON THE WAY"
      headline="Check your inbox."
      subline={
        email
          ? `We sent a reset link to ${email} — click it and you're back in.`
          : "We sent you a reset link. Click it from your inbox and you're back in."
      }
      footerText="Didn't get it? Check spam, then resend below."
    >
      <div className="flex flex-col items-center text-center">
        <div className="w-14 h-14 rounded-full bg-brand-soft flex items-center justify-center mb-5">
          <MailIcon className="w-6 h-6 text-brand-700" />
        </div>

        <h2 className="text-[26px] font-bold text-forest-900 -tracking-[0.025em]">
          Email sent
        </h2>
        <p className="text-[13px] text-ink-700 mt-2 max-w-[300px]">
          Click the link in your email to reset your password. The link expires in 30 minutes.
        </p>

        <a
          href="https://mail.google.com"
          target="_blank"
          rel="noopener noreferrer"
          className="w-full h-[54px] flex items-center justify-center gap-2.5 rounded-full bg-forest-900 text-white text-[15px] font-semibold hover:bg-forest-800 transition-colors mt-7"
        >
          Open Gmail
          <ExternalIcon className="w-3.5 h-3.5" />
        </a>

        <button
          type="button"
          onClick={handleResend}
          disabled={seconds > 0 || resendBusy || !email}
          className="text-[12px] font-medium text-ink-700 hover:text-forest-900 mt-4 disabled:opacity-60 disabled:hover:text-ink-700"
        >
          {seconds > 0
            ? `Didn't get it? Resend in 0:${seconds.toString().padStart(2, "0")}`
            : resendBusy ? "Resending…" : "Didn't get it? Resend now"}
        </button>

        {resendInfo && (
          <p className="text-[12px] text-brand-700 mt-3">{resendInfo}</p>
        )}
        {resendError && (
          <p className="text-[12px] text-red-700 mt-3">{resendError}</p>
        )}

        <a
          href="/login"
          className="text-[12px] font-medium text-warm-400 hover:text-ink-700 mt-6"
        >
          Back to sign in
        </a>
      </div>
    </AuthShell>
  );
}

export default function CheckEmailPage() {
  return (
    <Suspense fallback={null}>
      <CheckEmailInner />
    </Suspense>
  );
}

type IconProps = { className?: string };
const MailIcon = ({ className }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <rect x="2" y="4" width="20" height="16" rx="2" />
    <path d="m22 7-10 5L2 7" />
  </svg>
);
const ExternalIcon = ({ className }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
    <path d="M15 3h6v6" />
    <path d="M10 14 21 3" />
  </svg>
);
