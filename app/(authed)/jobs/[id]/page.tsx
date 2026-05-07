import Link from "next/link";
import { notFound } from "next/navigation";
import { getServerClient } from "@/lib/supabase/server";
import JobActions from "./JobActions";

type RouteParams = { params: Promise<{ id: string }> };

// Server-rendered job detail. Hero on the left, match analysis on the right,
// sticky Tailor + Apply footer (rendered by JobActions client island so it can
// open the existing TailorModal and ApplyConfirmModal on the dashboard).
export default async function JobDetailPage({ params }: RouteParams) {
  const { id } = await params;

  const supabase = await getServerClient();
  const { data: job, error } = await supabase
    .from("jobs")
    .select("id, source, external_id, title, company, location, remote, salary_min, salary_max, description, description_text, url, match_score, matched_skills, missing_skills, discovered_at, all_sources, all_urls")
    .eq("id", id)
    .maybeSingle();

  if (error || !job) notFound();

  const score = Math.max(0, Math.min(100, job.match_score || 0));
  const tone = score >= 85 ? "text-brand-700" : score >= 70 ? "text-amber-darkest" : "text-warm-400";
  const salary =
    job.salary_min && job.salary_max
      ? `$${(job.salary_min / 1000).toFixed(0)}k–$${(job.salary_max / 1000).toFixed(0)}k`
      : "Salary not listed";
  const allSources = (job.all_sources?.length ? job.all_sources : [job.source]) as string[];

  return (
    <>
      {/* Breadcrumb / topbar (custom — TopBar is metric-heavy, not appropriate here) */}
      <header className="px-8 py-5 border-b border-card-border flex items-center justify-between">
        <div className="flex items-center gap-2 text-[12px] text-text-secondary">
          <Link href="/jobs" className="hover:text-text-primary">Jobs</Link>
          <span>·</span>
          <span className="text-forest-900 font-medium truncate max-w-[400px]">
            {job.company} — {job.title}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {job.url && (
            <a
              href={job.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[12px] text-text-dim hover:text-forest-900 inline-flex items-center gap-1"
            >
              View original posting <ExternalIcon className="w-3 h-3" />
            </a>
          )}
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6 p-8 pb-32 max-w-[1280px]">
        {/* Left — content */}
        <div className="space-y-5">
          {/* Hero */}
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-xl bg-page-bg border border-card-border flex items-center justify-center text-[14px] font-semibold text-text-dim shrink-0">
              {job.company.slice(0, 2)}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[13px] text-text-secondary">{job.company}</span>
                {job.remote && (
                  <span className="text-[10px] text-brand-700 bg-brand-50 px-2 py-0.5 rounded-full">
                    Remote
                  </span>
                )}
                <span className="text-[10px] text-text-secondary">
                  · Posted {timeAgo(job.discovered_at)}
                </span>
              </div>
              <h1 className="text-[32px] lg:text-[36px] font-bold text-forest-900 -tracking-[0.025em] leading-tight mt-1">
                {job.title}
              </h1>
              <div className="flex items-center gap-3 mt-2 text-[12px] text-text-secondary">
                <span>{job.location || "Location not listed"}</span>
                <span>·</span>
                <span>{salary}</span>
                {allSources.length > 1 && (
                  <>
                    <span>·</span>
                    <span>Also on {allSources.filter((s) => s !== job.source).join(", ")}</span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Description */}
          <article className="bg-card-bg rounded-2xl border border-card-border p-7">
            <h2 className="text-[14px] font-semibold tracking-[0.05em] uppercase text-text-muted mb-3">
              About the role
            </h2>
            {job.description ? (
              <div
                className="prose prose-sm max-w-none text-[14px] text-forest-900 leading-relaxed [&_h1]:text-[16px] [&_h2]:text-[15px] [&_h3]:text-[14px] [&_p]:my-2 [&_ul]:my-2 [&_ul]:pl-5 [&_li]:my-1"
                dangerouslySetInnerHTML={{ __html: job.description }}
              />
            ) : (
              <p className="text-[13px] text-text-secondary italic">
                No description was returned by the source. View the original posting for details.
              </p>
            )}
          </article>
        </div>

        {/* Right — match analysis */}
        <aside className="space-y-3 lg:sticky lg:top-6 self-start">
          <div className="bg-card-bg rounded-2xl border border-card-border p-5">
            <div className="flex items-baseline justify-between">
              <span className="text-[10px] font-bold tracking-[0.13em] uppercase text-text-muted">
                Match analysis
              </span>
              <span className="text-[10px] text-text-secondary">
                {(job.matched_skills?.length || 0) + (job.missing_skills?.length || 0)} keywords
              </span>
            </div>
            <div className={`mt-2 text-[48px] font-bold -tracking-[0.025em] leading-none ${tone}`}>
              {score}%
            </div>
            <div className="text-[11px] text-text-secondary mt-1">
              against your master CV
            </div>

            <div className="mt-5">
              <div className="text-[10px] font-semibold tracking-[0.13em] uppercase text-text-muted mb-1.5">
                Strong matches
              </div>
              <div className="flex flex-wrap gap-1">
                {(job.matched_skills?.length ? job.matched_skills : ["No matches detected — try uploading your CV"]).slice(0, 12).map((s: string) => (
                  <span key={s} className="px-2 py-0.5 rounded-full text-[10px] bg-brand-50 text-brand-700 border border-brand-300">
                    {s}
                  </span>
                ))}
              </div>
            </div>

            {(job.missing_skills?.length || 0) > 0 && (
              <div className="mt-4">
                <div className="text-[10px] font-semibold tracking-[0.13em] uppercase text-text-muted mb-1.5">
                  Gaps
                </div>
                <div className="flex flex-wrap gap-1">
                  {(job.missing_skills as string[]).slice(0, 8).map((s) => (
                    <span key={s} className="px-2 py-0.5 rounded-full text-[10px] bg-amber-badge-bg text-amber-badge-text border border-amber-bar">
                      + {s}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </aside>
      </div>

      {/* Sticky footer — Tailor + Apply (client island) */}
      <JobActions job={job} />
    </>
  );
}

function timeAgo(iso: string | null | undefined): string {
  if (!iso) return "recently";
  const diff = Date.now() - new Date(iso).getTime();
  const d = Math.floor(diff / (1000 * 60 * 60 * 24));
  if (d <= 0) return "today";
  if (d === 1) return "1d ago";
  if (d < 30) return `${d}d ago`;
  return `${Math.floor(d / 30)}mo ago`;
}

function ExternalIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14 21 3" />
    </svg>
  );
}
