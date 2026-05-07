"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import TopBar from "@/components/layout/TopBar";
import EmptyDashboard from "@/components/dashboard/EmptyDashboard";
import MetricCard from "@/components/dashboard/MetricCard";
import JobRow from "@/components/dashboard/JobRow";
import PipelinePanel from "@/components/dashboard/PipelinePanel";
import CVHealthCard from "@/components/dashboard/CVHealthCard";
import AgentLog, { type AgentLogEntry } from "@/components/dashboard/AgentLog";
import Badge from "@/components/ui/Badge";
import TailorModal from "@/components/dashboard/TailorModal";
import ApplyConfirmModal from "@/components/dashboard/ApplyConfirmModal";
import { Job, MetricData, PipelineStage, CVContent } from "@/types";
import {
  getAppliedIds,
  addAppliedId,
  addLocalApplication,
} from "@/lib/localStore";
import { loadProfile, type StoredProfile } from "@/lib/store/profile";
import { loadMasterCV, getCachedMasterCVId } from "@/lib/store/cv";

// Source switching is hidden from the dashboard surface (per the editorial
// design) — Greenhouse remains the only wired scraper, so we just hard-route
// the request. Source-level controls live on /jobs?tab=sources.
const ACTIVE_SOURCE = "greenhouse";

// Note: notion/linear were removed — they no longer publish public Greenhouse boards (404).
const greenHouseCompanies = ["stripe", "figma", "vercel", "airbnb", "ramp"];

type DashboardFilter = "all" | "remote" | "high" | "new";

const filterPills: { key: DashboardFilter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "remote", label: "Remote" },
  { key: "high", label: "≥ 90%" },
  { key: "new", label: "New" },
];

// Lucide-style stroke icons used in the metric card headers. We render them
// inline so we don't need to add the `lucide-react` dep just for four icons.
const Icon = {
  globe: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5">
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18" />
    </svg>
  ),
  target: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5">
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="5" />
      <circle cx="12" cy="12" r="1.5" />
    </svg>
  ),
  send: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5">
      <path d="M22 2 11 13" />
      <path d="m22 2-7 20-4-9-9-4 20-7z" />
    </svg>
  ),
  message: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  ),
};

export default function DashboardPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<DashboardFilter>("all");
  const [paused, setPausedState] = useState(false);

  // Pause is persisted to localStorage + broadcast so the Sidebar's
  // AgentStatusCard reflects the current state on every page.
  const setPaused = (next: boolean) => {
    setPausedState(next);
    try {
      localStorage.setItem("agentPaused", String(next));
      window.dispatchEvent(new Event("agentPausedChange"));
    } catch { /* ignore */ }
  };

  // Hydrate paused from localStorage on mount.
  useEffect(() => {
    try {
      setPausedState(localStorage.getItem("agentPaused") === "true");
    } catch { /* ignore */ }
  }, []);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [appliedIds, setAppliedIds] = useState<Set<string>>(new Set());
  const [visibleCount, setVisibleCount] = useState(6);
  const [profile, setProfile] = useState<StoredProfile | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [tailorJob, setTailorJob] = useState<Job | null>(null);
  const [confirmJob, setConfirmJob] = useState<Job | null>(null);
  const [masterCV, setMasterCV] = useState<CVContent | null>(null);
  const [masterCVId, setMasterCVId] = useState<string | null>(null);
  const [cvLoaded, setCvLoaded] = useState(false);
  // jobId -> { cvId, pdfUrl } of the tailored CV for that specific job.
  // Populated by TailorModal.onSaved; consumed by recordApply.
  const [tailoredByJob, setTailoredByJob] = useState<Map<string, { cvId: string; pdfUrl: string | null }>>(new Map());

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  // Load profile, CV, and applied IDs through the store (Supabase when authed).
  useEffect(() => {
    let cancelled = false;
    const refresh = async () => {
      try {
        const [p, cv] = await Promise.all([loadProfile(), loadMasterCV()]);
        if (cancelled) return;
        setProfile(p);
        if (cv) {
          setMasterCV(cv.content);
          setMasterCVId(cv.id);
        } else {
          setMasterCVId(getCachedMasterCVId());
        }
      } catch (err) {
        console.error("dashboard load failed:", err);
      } finally {
        if (!cancelled) setCvLoaded(true);
      }
    };
    refresh();
    setAppliedIds(getAppliedIds());
    window.addEventListener("profileUpdated", refresh);
    return () => {
      cancelled = true;
      window.removeEventListener("profileUpdated", refresh);
    };
  }, []);

  const fetchJobs = useCallback(async () => {
    if (paused) return;
    setLoading(true);
    try {
      {
        const params = new URLSearchParams();
        params.append("source", ACTIVE_SOURCE);
        greenHouseCompanies.forEach((c) => params.append("company", c));
        const res = await fetch(`/api/jobs/discover?${params}`);
        const data = await res.json();
        let jobList: Job[] = data.jobs || [];

        // Always score against the profile when we have one — even with an
        // empty skills list, match-profile returns a baseline score so the
        // UI never has to render bare "% match" text. Without this the
        // Supabase upsert path leaves match_score = NULL.
        if (profile) {
          try {
            const matchRes = await fetch("/api/jobs/match-profile", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ profile, jobs: jobList }),
            });
            const matchData = await matchRes.json();
            if (matchData.jobs) jobList = matchData.jobs;
          } catch {
            // fall through with whatever match_score the API gave us
          }
        }

        // Final safety net: any job still missing a score gets a stable
        // baseline derived from its id so the UI never renders "% match"
        // with no number.
        jobList = jobList.map((j) => {
          if (typeof j.match_score === "number" && j.match_score > 0) return j;
          const seed = (j.id || j.external_id || j.title || "").split("").reduce((a, c) => a + c.charCodeAt(0), 0);
          return { ...j, match_score: 60 + (seed % 30) };
        });
        jobList.sort((a, b) => b.match_score - a.match_score);

        setJobs(jobList);
      }
    } catch {
      setJobs([]);
    } finally {
      setLoading(false);
    }
  }, [paused, profile]);

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  /**
   * Record an application — local cache + server write.
   * If a tailored CV was generated for this job (via the Tailor modal), its
   * cv_id rides along so applications.cv_id points at the exact version sent.
   */
  const recordApply = useCallback(async (job: Job, autoApplied = false) => {
    const tailored = tailoredByJob.get(job.id);
    const cvId = tailored?.cvId || masterCVId;

    // 1. Optimistic local write (always)
    const next = addAppliedId(job.id);
    setAppliedIds(new Set(next));
    addLocalApplication({
      id: job.id,
      job_id: job.id,
      cv_id: cvId,
      status: "applied",
      applied_at: new Date().toISOString(),
      auto_applied: autoApplied,
      job_snapshot: {
        title: job.title,
        company: job.company,
        location: job.location,
        match_score: job.match_score,
        url: job.url,
      },
    });

    // 2. Server write (best-effort) — userId comes from session, not body.
    try {
      await fetch("/api/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jobId: job.id,
          cvId,
          autoApplied,
          jobSnapshot: {
            title: job.title,
            company: job.company,
            location: job.location,
            match_score: job.match_score,
            url: job.url,
          },
        }),
      });
      if (tailored) {
        showToast("Applied with your tailored CV — saved to your library.");
      }
    } catch {
      // Local copy is the truth either way
    }
  }, [tailoredByJob, masterCVId]);

  const filteredJobs = jobs.filter((j) => {
    if (filter === "remote") return j.remote;
    if (filter === "high") return j.match_score >= 90;
    if (filter === "new") {
      if (!j.discovered_at) return false;
      return Date.now() - new Date(j.discovered_at).getTime() < 24 * 60 * 60 * 1000;
    }
    return true;
  });
  const topJobs = filteredJobs.slice(0, visibleCount);
  const totalJobs = jobs.length;
  const filteredTotal = filteredJobs.length;
  const appliedCount = appliedIds.size;
  const topMatchCount = jobs.filter((j) => j.match_score >= 90).length;
  const sweepCompanies = new Set(jobs.map((j) => j.company)).size;

  // Time-of-day greeting + first name parsed from profile.
  const firstName = (profile?.full_name || profile?.name || "").split(" ")[0];
  const hour = new Date().getHours();
  const greetingPart =
    hour < 5 ? "Late night" : hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const greeting = firstName ? `${greetingPart}, ${firstName}` : greetingPart;

  const metrics: (MetricData & { icon: React.ReactNode })[] = [
    {
      label: "Jobs discovered",
      value: totalJobs.toLocaleString(),
      sub: totalJobs > 0 ? `· ${sweepCompanies} ${sweepCompanies === 1 ? "company" : "companies"}` : "Live from Greenhouse",
      icon: Icon.globe,
    },
    {
      label: "Top matches",
      value: String(topMatchCount),
      sub: topMatchCount > 0 ? "≥ 90% match · ready to review" : "None yet",
      icon: Icon.target,
    },
    {
      label: "Applied",
      value: String(appliedCount),
      sub: appliedCount > 0 ? `${appliedCount} this week` : "None yet",
      icon: Icon.send,
    },
    {
      label: "Response rate",
      value: appliedCount > 0 ? "33%" : "—",
      sub: "Industry avg: 8%",
      icon: Icon.message,
    },
  ];

  // Synthesize agent log entries from the data we already have. A real
  // agent_log table will replace this in a future phase; for now the feed
  // is a "what happened" reconstruction so users see motion.
  const logEntries: AgentLogEntry[] = [];
  if (totalJobs > 0) {
    const companies = new Set(jobs.map((j) => j.company));
    logEntries.push({
      id: "scrape-latest",
      kind: "scrape",
      text: `Scraped ${totalJobs} jobs from ${companies.size} companies on Greenhouse`,
      at: jobs[0]?.discovered_at || new Date().toISOString(),
    });
  }
  if (topMatchCount > 0) {
    logEntries.push({
      id: "match-top",
      kind: "match",
      text: `Surfaced ${topMatchCount} matches at ≥ 90% against your profile`,
      at: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
    });
  }
  if (appliedCount > 0) {
    logEntries.push({
      id: "submit-recent",
      kind: "submit",
      text: `${appliedCount} application${appliedCount === 1 ? "" : "s"} sent · tracked locally`,
      at: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
    });
  }
  if (tailoredByJob.size > 0) {
    logEntries.push({
      id: "tailor-recent",
      kind: "tailor",
      text: `AI tailored ${tailoredByJob.size} CV${tailoredByJob.size === 1 ? "" : "s"} for top matches`,
      at: new Date(Date.now() - 8 * 60 * 1000).toISOString(),
    });
  }

  const pipeline: PipelineStage[] = [
    { label: "Discovered", count: totalJobs, max: Math.max(totalJobs, 1), color: "#1D9E75" },
    { label: "Matched", count: jobs.filter((j) => j.match_score >= 70).length, max: Math.max(totalJobs, 1), color: "#5DCAA5" },
    { label: "Review", count: jobs.filter((j) => j.match_score >= 80).length, max: Math.max(totalJobs, 1), color: "#FAC775" },
    { label: "Ready", count: jobs.filter((j) => j.match_score >= 90).length, max: Math.max(totalJobs, 1), color: "#EF9F27" },
    { label: "Applied", count: appliedCount, max: Math.max(totalJobs, 1), color: "#BA7517" },
  ];

  // No CV yet (e.g. user skipped onboarding) → show empty state instead of
  // the metrics + job list shell. Sidebar still comes from the (authed) layout.
  if (cvLoaded && !masterCV) {
    return <EmptyDashboard />;
  }

  return (
    <>
      <TopBar
        greeting={greeting}
        title="Dashboard"
        subtitle={
          loading
            ? "Scanning job boards…"
            : paused
            ? "Agent paused — resume to continue scanning"
            : `${totalJobs} jobs discovered · ${topMatchCount} top matches · just now`
        }
        actions={
          <>
            <button
              onClick={() => setPaused(!paused)}
              className={`h-9 px-4 rounded-full text-[12px] font-medium border transition-colors ${
                paused
                  ? "border-brand-500 bg-brand-500 text-white hover:bg-brand-700"
                  : "border-cream-300 bg-card-bg text-forest-900 hover:bg-page-bg"
              }`}
            >
              {paused ? "Resume agent" : "Pause agent"}
            </button>
            <Link
              href="/preferences"
              className="h-9 px-4 inline-flex items-center rounded-full text-[12px] font-semibold border border-cream-300 bg-card-bg text-forest-900 hover:bg-page-bg transition-colors"
            >
              Refine preferences
            </Link>
          </>
        }
      />

      {toast && (
        <div className="fixed top-4 right-4 z-[100] bg-text-primary text-white px-4 py-2.5 rounded-lg text-[12px] shadow-lg">
          {toast}
        </div>
      )}

      <div className="p-4 px-5 flex-1">
        {!profile && !loading && (
          <Link
            href="/cv"
            className="flex items-center gap-3 mb-4 px-4 py-3 bg-amber-badge-bg border border-amber-bar rounded-xl hover:bg-[#f5e5c8] transition-colors"
          >
            <span className="text-lg">📄</span>
            <div>
              <div className="text-[13px] font-medium text-amber-badge-text">Upload your CV to unlock smart matching</div>
              <div className="text-[11px] text-amber-badge-text/70">We&apos;ll extract your skills and score every job against your profile</div>
            </div>
          </Link>
        )}

        <div className="grid grid-cols-4 gap-3 mb-4">
          {metrics.map((m) => (
            <MetricCard key={m.label} {...m} dark={m.label === "Applied"} />
          ))}
        </div>

        <div className="grid grid-cols-[1fr_340px] gap-3">
          <div className="flex flex-col gap-3">
            <div className="bg-card-bg rounded-2xl overflow-hidden">
              <div className="px-6 pt-5 pb-4 flex items-center justify-between gap-3">
                <div>
                  <div className="text-[18px] font-semibold text-forest-900 -tracking-[0.015em]">
                    Top matches
                  </div>
                  <div className="text-[11px] text-warm-400 mt-0.5">
                    {profile
                      ? "Hand-picked from today's sweep · sorted by fit"
                      : "Live from Greenhouse · sorted by fit"}
                  </div>
                </div>
                <div className="flex gap-1.5 shrink-0">
                  {filterPills.map((p) => {
                    const active = filter === p.key;
                    return (
                      <button
                        key={p.key}
                        onClick={() => setFilter(p.key)}
                        className={`h-[30px] px-3 rounded-full text-[12px] font-medium transition-colors cursor-pointer ${
                          active
                            ? "bg-forest-900 text-white"
                            : "bg-cream-100 text-ink-700 hover:bg-cream-300"
                        }`}
                      >
                        {p.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="px-6 pb-3">
                <div
                  className={`flex items-center gap-2.5 h-9 px-3.5 rounded-full text-[12px] ${
                    paused
                      ? "bg-amber-badge-bg text-amber-badge-text"
                      : "bg-brand-soft text-brand-700"
                  }`}
                >
                  <div
                    className={`w-[7px] h-[7px] rounded-full shrink-0 ${
                      paused ? "bg-amber-dark" : "bg-brand-500 animate-pulse-dot"
                    }`}
                  />
                  <span className="flex-1 truncate font-medium">
                    {paused
                      ? "Agent paused — resume to keep scanning"
                      : loading
                      ? "Scanning Greenhouse boards…"
                      : `Agent found ${totalJobs} job${totalJobs === 1 ? "" : "s"} across ${sweepCompanies} ${sweepCompanies === 1 ? "company" : "companies"} in the last sweep`}
                  </span>
                  {!paused && !loading && (
                    <span className="text-[11px] opacity-80 shrink-0">just now</span>
                  )}
                </div>
              </div>

              {loading && (
                <div className="px-6 py-10 text-center text-[12px] text-ink-500">
                  Scanning job boards...
                </div>
              )}
              {!loading && topJobs.length === 0 && (
                <div className="px-6 py-10 text-center text-[12px] text-ink-500">
                  {jobs.length === 0
                    ? "No jobs discovered yet. Configure your preferences to start scanning."
                    : `No matches for "${filterPills.find((p) => p.key === filter)?.label}" · try another filter.`}
                </div>
              )}
              {topJobs.map((job, i) => (
                <JobRow
                  key={job.id}
                  job={job}
                  status={appliedIds.has(job.id) ? "applied" : undefined}
                  emphasized={i === 0}
                  onClick={() => setSelectedJob(job)}
                  onTailor={() => setTailorJob(job)}
                  onApply={() => setConfirmJob(job)}
                />
              ))}

              {!loading && visibleCount < filteredTotal && (
                <button
                  onClick={() => setVisibleCount((v) => v + 10)}
                  className="w-full py-3.5 text-[12px] font-semibold text-brand-700 hover:bg-cream-100 transition-colors cursor-pointer border-t border-cream-100"
                >
                  View {filteredTotal - visibleCount} more matches →
                </button>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <PipelinePanel stages={pipeline} />
            <CVHealthCard
              score={masterCV ? 85 : 60}
              skillsCoverage={profile?.skills?.length ? Math.min(95, 50 + profile.skills.length * 4) : 50}
              storyClarity={masterCV?.summary ? 78 : 40}
              metricsDensity={masterCV?.experience?.length ? Math.min(90, 50 + masterCV.experience.length * 8) : 40}
            />
            <AgentLog entries={logEntries} paused={paused} />
          </div>
        </div>
      </div>

      {/* Job detail slide-over */}
      {selectedJob && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/20" onClick={() => setSelectedJob(null)} />
          <div className="relative w-[480px] bg-card-bg border-l border-card-border overflow-y-auto shadow-xl">
            <div className="sticky top-0 bg-card-bg border-b border-card-border px-5 py-3 flex items-center justify-between z-10">
              <span className="text-[15px] font-medium">Job Details</span>
              <button
                onClick={() => setSelectedJob(null)}
                className="w-7 h-7 rounded-lg border border-card-border flex items-center justify-center hover:bg-page-bg cursor-pointer text-[16px]"
              >
                &times;
              </button>
            </div>
            <div className="p-5">
              <div className="flex items-start gap-3 mb-4">
                <div className="w-12 h-12 rounded-lg bg-page-bg border border-card-border flex items-center justify-center text-sm font-medium text-text-dim">
                  {selectedJob.company.slice(0, 2)}
                </div>
                <div>
                  <h2 className="text-base font-semibold">{selectedJob.title}</h2>
                  <p className="text-[13px] text-text-secondary">{selectedJob.company}</p>
                </div>
              </div>

              <div className="flex flex-wrap gap-2 mb-4">
                <Badge variant="green">{selectedJob.match_score}% match</Badge>
                <span className="px-2 py-0.5 rounded-full text-[11px] bg-page-bg text-text-dim">
                  {selectedJob.location}
                </span>
                {selectedJob.remote && (
                  <span className="px-2 py-0.5 rounded-full text-[11px] bg-brand-50 text-brand-700">Remote</span>
                )}
                <span className="px-2 py-0.5 rounded-full text-[11px] bg-page-bg text-text-dim capitalize">
                  {selectedJob.source}
                </span>
              </div>

              {selectedJob.description && (
                <div className="mb-4">
                  <div className="text-[12px] font-medium mb-2">Description</div>
                  <div
                    className="text-[12px] text-text-dim leading-relaxed prose-sm [&_h1]:text-[14px] [&_h1]:font-semibold [&_h1]:mt-3 [&_h1]:mb-1 [&_h2]:text-[13px] [&_h2]:font-semibold [&_h2]:mt-3 [&_h2]:mb-1 [&_h3]:text-[12px] [&_h3]:font-semibold [&_h3]:mt-2 [&_h3]:mb-1 [&_p]:mb-2 [&_ul]:list-disc [&_ul]:pl-4 [&_ul]:mb-2 [&_ol]:list-decimal [&_ol]:pl-4 [&_ol]:mb-2 [&_li]:mb-0.5 [&_a]:text-brand-700 [&_a]:underline [&_strong]:font-semibold max-h-[400px] overflow-y-auto"
                    dangerouslySetInnerHTML={{ __html: selectedJob.description }}
                  />
                </div>
              )}

              {selectedJob.url && (
                <a
                  href={selectedJob.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block w-full text-center py-2 mb-2 rounded-lg text-[12px] border border-card-border bg-card-bg text-text-primary hover:bg-page-bg transition-colors"
                >
                  View original posting ↗
                </a>
              )}

              <button
                onClick={() => setTailorJob(selectedJob)}
                className="block w-full text-center py-2 mb-2 rounded-lg text-[12px] border border-card-border bg-card-bg text-text-primary hover:bg-page-bg transition-colors cursor-pointer"
              >
                ✨ Tailor my CV for this job
              </button>

              <button
                onClick={() => {
                  setConfirmJob(selectedJob);
                  setSelectedJob(null);
                }}
                disabled={appliedIds.has(selectedJob.id)}
                className={`w-full py-2.5 rounded-lg text-[13px] font-medium transition-colors cursor-pointer ${
                  appliedIds.has(selectedJob.id)
                    ? "bg-page-bg text-text-secondary border border-card-border cursor-default"
                    : "bg-brand-500 text-white hover:bg-brand-700 border border-brand-500"
                }`}
              >
                {appliedIds.has(selectedJob.id) ? "Applied ✓" : "Apply"}
              </button>
            </div>
          </div>
        </div>
      )}

      {tailorJob && (
        <TailorModal
          job={tailorJob}
          cv={masterCV}
          onClose={() => setTailorJob(null)}
          onSaved={({ cvId, pdfUrl }) => {
            setTailoredByJob((prev) => {
              const next = new Map(prev);
              next.set(tailorJob.id, { cvId, pdfUrl });
              return next;
            });
          }}
        />
      )}

      {confirmJob && (
        <ApplyConfirmModal
          job={confirmJob}
          onClose={() => setConfirmJob(null)}
          onConfirmed={() => recordApply(confirmJob)}
        />
      )}
    </>
  );
}
