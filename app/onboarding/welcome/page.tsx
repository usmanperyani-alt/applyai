// Onboarding 1 — dark forest hero with logo + 3-step preview.
// Server component: fetches user, calls server action on submit.
import { redirect } from "next/navigation";
import { getCurrentUser, getServerClient } from "@/lib/supabase/server";
import { advanceToStep } from "../actions";

export default async function WelcomePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const supabase = await getServerClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", user.id)
    .maybeSingle();

  const firstName = (profile?.full_name || "").split(" ")[0] || "there";

  async function startOnboarding() {
    "use server";
    await advanceToStep(1);
  }

  return (
    <div className="min-h-screen bg-forest-900 text-white relative overflow-hidden">
      <div className="flex flex-col lg:flex-row min-h-screen">
        {/* Left — copy */}
        <div className="flex-1 flex flex-col justify-between p-10 lg:p-16">
          <div className="flex items-center gap-3">
            <span className="w-3.5 h-3.5 rounded-full bg-brand-500" />
            <span className="text-lg font-bold tracking-tight">applyai</span>
          </div>

          <div className="space-y-6 max-w-xl">
            <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-forest-800 text-brand-500 text-[11px] font-bold tracking-[0.13em]">
              LET'S SET UP YOUR AGENT
            </span>
            <h1 className="text-[64px] xl:text-[76px] leading-[1.02] tracking-[-0.04em] font-bold">
              Welcome, {firstName}.
            </h1>
            <p className="text-[18px] leading-[1.5] text-warm-400">
              Three steps and about 4 minutes — and the agent starts hunting for you.
            </p>

            <form action={startOnboarding}>
              <button
                type="submit"
                className="inline-flex items-center gap-2.5 h-[54px] px-7 rounded-full bg-brand-500 text-forest-900 text-[15px] font-bold hover:bg-brand-300 transition-colors"
              >
                Let's do it
                <ArrowRightIcon className="w-4 h-4" />
              </button>
            </form>
          </div>

          <p className="text-ink-700 text-xs">Skip onboarding (not recommended)</p>
        </div>

        {/* Right — step preview */}
        <div className="lg:w-[480px] flex flex-col justify-center gap-3 p-10 lg:pr-16">
          <Step n={1} title="Upload your CV" sub="2 min — we'll extract your skills, roles, and experience." active />
          <Step n={2} title="Set your preferences" sub="1 min — target roles, location, salary." />
          <Step n={3} title="First scan" sub="30 sec — agent scans 1,000+ jobs and ranks matches." />
        </div>
      </div>
    </div>
  );
}

function Step({ n, title, sub, active }: { n: number; title: string; sub: string; active?: boolean }) {
  return (
    <div className={`flex items-start gap-4 p-5 rounded-2xl border ${active ? "bg-forest-800 border-brand-500/30" : "bg-forest-950/40 border-forest-800"}`}>
      <div className={`shrink-0 w-9 h-9 rounded-full flex items-center justify-center text-[14px] font-bold ${active ? "bg-brand-500 text-forest-900" : "bg-forest-800 text-warm-400"}`}>
        {n}
      </div>
      <div>
        <div className="text-[15px] font-semibold text-white">{title}</div>
        <div className="text-[12px] text-warm-400 mt-0.5 leading-relaxed">{sub}</div>
      </div>
    </div>
  );
}

function ArrowRightIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M5 12h14M12 5l7 7-7 7" />
    </svg>
  );
}
