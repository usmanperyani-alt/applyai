"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import TopBar from "@/components/layout/TopBar";
import MetricCard from "@/components/dashboard/MetricCard";
import JobRow from "@/components/dashboard/JobRow";
import PipelinePanel from "@/components/dashboard/PipelinePanel";
import CVPanel from "@/components/dashboard/CVPanel";
import Badge from "@/components/ui/Badge";
import TailorModal from "@/components/dashboard/TailorModal";
import ApplyConfirmModal from "@/components/dashboard/ApplyConfirmModal";
import { Job, MetricData, PipelineStage, CVContent } from "@/types";
import {
  getProfile,
  getAppliedIds,
  addAppliedId,
  addLocalApplication,
  getOrCreateUserId,
  type StoredProfile,
} from "@/lib/localStore";

const allSources = [
  { name: "Greenhouse", key: "greenhouse", available: true },
  { name: "LinkedIn", key: "linkedin", available: false },
  { name: "Indeed", key: "indeed", available: false },
  { name: "Lever", key: "lever", available: false },
];

const greenHouseCompanies = ["stripe", "figma", "notion", "linear", "vercel"];

export default function DashboardPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeSources, setActiveSources] = useState<string[]>(["greenhouse"]);
  const [paused, setPaused] = useState(false);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [appliedIds, setAppliedIds] = useState<Set<string>>(new Set());
  const [visibleCount, setVisibleCount] = useState(6);
  const [profile, setProfile] = useState<StoredProfile | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [tailorJob, setTailorJob] = useState<Job | null>(null);
  const [confirmJob, setConfirmJob] = useState<Job | null>(null);
  const [masterCV, setMasterCV] = useState<CVContent | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  // Load saved profile, applied IDs, and CV from localStorage
  useEffect(() => {
    const loadProfile = () => {
      setProfile(getProfile());
      // CV is stored under a different key (set by CV editor)
      const cvRaw = localStorage.getItem("masterCV");
      if (cvRaw) {
        try { setMasterCV(JSON.parse(cvRaw)); } catch { /* ignore */ }
      }
    };
    loadProfile();
    setAppliedIds(getAppliedIds());
    window.addEventListener("profileUpdated", loadProfile);
    return () => window.removeEventListener("profileUpdated", loadProfile);
  }, []);

  const fetchJobs = useCallback(async () => {
    if (paused) return;
    setLoading(true);
    try {
      if (activeSources.includes("greenhouse")) {
        const params = new URLSearchParams();
        params.append("source", "greenhouse");
        greenHouseCompanies.forEach((c) => params.append("company", c));
        const res = await fetch(`/api/jobs/discover?${params}`);
        const data = await res.json();
        let jobList = data.jobs || [];

        if (profile && profile.skills.length > 0) {
          const matchRes = await fetch("/api/jobs/match-profile", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ profile, jobs: jobList }),
          });
          const matchData = await matchRes.json();
          if (matchData.jobs) jobList = matchData.jobs;
        } else {
          jobList.sort((a: Job, b: Job) => b.match_score - a.match_score);
        }

        setJobs(jobList);
      } else {
        setJobs([]);
      }
    } catch {
      setJobs([]);
    } finally {
      setLoading(false);
    }
  }, [activeSources, paused, profile]);

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  const toggleSource = (key: string) => {
    const source = allSources.find((s) => s.key === key);
    if (source && !source.available && !activeSources.includes(key)) {
      showToast(`${source.name} scraper coming soon. Only Greenhouse is active.`);
      return;
    }
    setActiveSources((prev) =>
      prev.includes(key) ? prev.filter((s) => s !== key) : [...prev, key]
    );
  };

  /**
   * Record an application — both locally and via API.
   * If Supabase is configured, the API persists; otherwise the local store
   * is the source of truth and the API just acks.
   */
  const recordApply = useCallback(async (job: Job, autoApplied = false) => {
    const userId = getOrCreateUserId();

    // 1. Optimistic local write (always)
    const next = addAppliedId(job.id);
    setAppliedIds(new Set(next));
    addLocalApplication({
      id: job.id,
      job_id: job.id,
      cv_id: null,
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

    // 2. Server write (best-effort)
    try {
      await fetch("/api/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          jobId: job.id,
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
    } catch {
      // Local copy is the truth either way
    }
  }, []);

  const topJobs = jobs.slice(0, visibleCount);
  const totalJobs = jobs.length;
  const appliedCount = appliedIds.size;

  const metrics: MetricData[] = [
    { label: "Jobs found", value: String(totalJobs), sub: profile ? `Matched to ${profile.name || "your profile"}` : "Live from Greenhouse" },
    { label: "Top matches (90%+)", value: String(jobs.filter((j) => j.match_score >= 90).length), sub: "Ready to review" },
    { label: "Remote jobs", value: String(jobs.filter((j) => j.remote).length), sub: `${totalJobs > 0 ? Math.round((jobs.filter((j) => j.remote).length / totalJobs) * 100) : 0}% of total` },
    { label: "Applied", value: String(appliedCount), sub: appliedCount > 0 ? "Tracked locally" : "None yet" },
  ];

  const pipeline: PipelineStage[] = [
    { label: "Discovered", count: totalJobs, max: Math.max(totalJobs, 1), color: "#1D9E75" },
    { label: "Matched", count: jobs.filter((j) => j.match_score >= 70).length, max: Math.max(totalJobs, 1), color: "#5DCAA5" },
    { label: "Review", count: jobs.filter((j) => j.match_score >= 80).length, max: Math.max(totalJobs, 1), color: "#FAC775" },
    { label: "Ready", count: jobs.filter((j) => j.match_score >= 90).length, max: Math.max(totalJobs, 1), color: "#EF9F27" },
    { label: "Applied", count: appliedCount, max: Math.max(totalJobs, 1), color: "#BA7517" },
  ];

  return (
    <>
      <TopBar
        title="Dashboard"
        subtitle={
          loading
            ? "Scanning job boards..."
            : paused
            ? "Agent paused"
            : `${totalJobs} jobs discovered · Just now`
        }
        actions={
          <>
            <button
              onClick={() => setPaused(!paused)}
              className={`py-[7px] px-3.5 rounded-lg text-[13px] cursor-pointer border transition-colors ${
                paused
                  ? "border-brand-500 bg-brand-500 text-white hover:bg-brand-700"
                  : "border-card-border bg-card-bg text-text-primary hover:bg-page-bg"
              }`}
            >
              {paused ? "Resume agent" : "Pause agent"}
            </button>
            <Link
              href="/preferences"
              className="py-[7px] px-3.5 rounded-lg text-[13px] cursor-pointer border border-brand-500 bg-brand-500 text-white hover:bg-brand-700 transition-colors"
            >
              + Add preferences
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

        <div className="grid grid-cols-4 gap-2.5 mb-4">
          {metrics.map((m) => (
            <MetricCard key={m.label} {...m} />
          ))}
        </div>

        <div className="grid grid-cols-[1fr_340px] gap-3">
          <div className="flex flex-col gap-3">
            <div className="bg-card-bg border border-card-border rounded-xl overflow-hidden">
              <div className="px-3.5 py-3 border-b border-card-border flex items-center justify-between">
                <span className="text-[13px] font-medium">
                  Top matches · waiting for review
                </span>
                {topJobs.length > 0 && (
                  <Badge variant="amber">{Math.min(topJobs.length, totalJobs)} new</Badge>
                )}
              </div>

              <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-brand-50 rounded-lg mx-3.5 mt-2.5">
                {paused ? (
                  <>
                    <div className="w-[7px] h-[7px] rounded-full bg-amber-dark shrink-0" />
                    <span className="text-[11px] text-amber-badge-text">Agent paused</span>
                  </>
                ) : (
                  <>
                    <div className="w-[7px] h-[7px] rounded-full bg-brand-500 shrink-0 animate-pulse-dot" />
                    <span className="text-[11px] text-brand-700">
                      {loading
                        ? "Agent scanning Greenhouse boards..."
                        : `Agent found ${totalJobs} jobs across ${new Set(jobs.map((j) => j.company)).size} companies`}
                    </span>
                  </>
                )}
              </div>

              <div className="flex flex-wrap gap-1.5 px-3.5 py-2 pb-2.5">
                {allSources.map((s) => {
                  const active = activeSources.includes(s.key);
                  return (
                    <button
                      key={s.key}
                      onClick={() => toggleSource(s.key)}
                      className={`px-2.5 py-1 rounded-full text-[11px] border cursor-pointer transition-colors ${
                        active
                          ? "bg-brand-50 text-brand-700 border-brand-300"
                          : "bg-card-bg text-text-dim border-card-border hover:bg-page-bg"
                      }`}
                    >
                      {s.name}
                      {!s.available && !active && " ⏳"}
                    </button>
                  );
                })}
              </div>

              {loading && (
                <div className="px-3.5 py-8 text-center text-[12px] text-text-secondary">
                  Scanning job boards...
                </div>
              )}
              {!loading && topJobs.length === 0 && (
                <div className="px-3.5 py-8 text-center text-[12px] text-text-secondary">
                  {activeSources.length === 0
                    ? "No sources selected. Click a source tab above to start scanning."
                    : "No jobs discovered yet. Configure your preferences to start scanning."}
                </div>
              )}
              {topJobs.map((job) => (
                <JobRow
                  key={job.id}
                  job={job}
                  status={appliedIds.has(job.id) ? "applied" : undefined}
                  onClick={() => setSelectedJob(job)}
                  onApply={() => setConfirmJob(job)}
                />
              ))}

              {!loading && visibleCount < totalJobs && (
                <button
                  onClick={() => setVisibleCount((v) => v + 10)}
                  className="w-full py-2.5 text-[12px] text-brand-700 hover:bg-brand-50 transition-colors cursor-pointer border-t border-card-border"
                >
                  Load more ({totalJobs - visibleCount} remaining)
                </button>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <PipelinePanel stages={pipeline} />
            <CVPanel
              matchedSkills={profile?.skills?.slice(0, 6) || []}
              missingSkills={[]}
            />
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
