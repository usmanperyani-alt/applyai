"use client";

import { useState, useEffect } from "react";
import TopBar from "@/components/layout/TopBar";
import { Job } from "@/types";

export default function AnalyticsPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [appliedCount, setAppliedCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Load applied IDs from localStorage (synced from dashboard)
    const savedApplied = localStorage.getItem("appliedIds");
    if (savedApplied) {
      try { setAppliedCount(JSON.parse(savedApplied).length); } catch { /* ignore */ }
    }

    // Load profile for matching
    const savedProfile = localStorage.getItem("userProfile");
    let profile = null;
    if (savedProfile) {
      try { profile = JSON.parse(savedProfile); } catch { /* ignore */ }
    }

    // Fetch jobs and optionally match against profile
    fetch("/api/jobs/discover?company=stripe&company=figma&company=notion&company=linear&company=vercel")
      .then((r) => r.json())
      .then(async (data) => {
        let jobList = data.jobs || [];

        if (profile && profile.skills && profile.skills.length > 0) {
          const matchRes = await fetch("/api/jobs/match-profile", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ profile, jobs: jobList }),
          });
          const matchData = await matchRes.json();
          if (matchData.jobs) jobList = matchData.jobs;
        }

        setJobs(jobList);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const totalJobs = jobs.length;
  const remoteJobs = jobs.filter((j) => j.remote).length;
  const highMatch = jobs.filter((j) => j.match_score >= 90).length;
  const midMatch = jobs.filter((j) => j.match_score >= 70 && j.match_score < 90).length;
  const lowMatch = jobs.filter((j) => j.match_score < 70).length;
  const companies = [...new Set(jobs.map((j) => j.company))];
  const companyCounts = companies.map((c) => ({
    name: c,
    count: jobs.filter((j) => j.company === c).length,
  })).sort((a, b) => b.count - a.count);

  const maxCount = Math.max(...companyCounts.map((c) => c.count), 1);

  return (
    <>
      <TopBar
        title="Analytics"
        subtitle={loading ? "Loading..." : `${totalJobs} jobs analyzed`}
      />

      <div className="p-4 px-5 flex-1">
        <div className="grid grid-cols-2 gap-4">
          {/* Match score distribution */}
          <div className="bg-card-bg border border-card-border rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-card-border">
              <span className="text-[13px] font-medium">Match Score Distribution</span>
            </div>
            <div className="p-4 space-y-3">
              <BarRow label="90-100% (Auto-apply)" value={highMatch} max={totalJobs || 1} color="#1D9E75" />
              <BarRow label="70-89% (Review)" value={midMatch} max={totalJobs || 1} color="#FAC775" />
              <BarRow label="Below 70% (Skip)" value={lowMatch} max={totalJobs || 1} color="#e0e0d8" />
            </div>
          </div>

          {/* Job type breakdown */}
          <div className="bg-card-bg border border-card-border rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-card-border">
              <span className="text-[13px] font-medium">Job Type Breakdown</span>
            </div>
            <div className="p-4 space-y-3">
              <BarRow label="Remote" value={remoteJobs} max={totalJobs || 1} color="#1D9E75" />
              <BarRow label="On-site / Hybrid" value={totalJobs - remoteJobs} max={totalJobs || 1} color="#5DCAA5" />
            </div>
          </div>

          {/* Top companies */}
          <div className="bg-card-bg border border-card-border rounded-xl overflow-hidden col-span-2">
            <div className="px-4 py-3 border-b border-card-border">
              <span className="text-[13px] font-medium">Jobs by Company</span>
            </div>
            <div className="p-4 space-y-2">
              {companyCounts.map((c) => (
                <BarRow key={c.name} label={c.name} value={c.count} max={maxCount} color="#1D9E75" />
              ))}
            </div>
          </div>

          {/* Pipeline summary */}
          <div className="bg-card-bg border border-card-border rounded-xl overflow-hidden col-span-2">
            <div className="px-4 py-3 border-b border-card-border">
              <span className="text-[13px] font-medium">Pipeline Summary</span>
            </div>
            <div className="p-4">
              <div className="grid grid-cols-5 gap-3 text-center">
                <StatBox label="Discovered" value={totalJobs} color="#1D9E75" />
                <StatBox label="Matched (70%+)" value={highMatch + midMatch} color="#5DCAA5" />
                <StatBox label="Review Ready" value={highMatch} color="#FAC775" />
                <StatBox label="Auto-apply" value={highMatch} color="#EF9F27" />
                <StatBox label="Applied" value={appliedCount} color="#BA7517" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

function BarRow({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  const pct = max > 0 ? (value / max) * 100 : 0;
  return (
    <div>
      <div className="flex justify-between text-[11px] mb-1">
        <span className="text-text-dim">{label}</span>
        <span className="font-medium">{value}</span>
      </div>
      <div className="h-[6px] bg-page-bg rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
      </div>
    </div>
  );
}

function StatBox({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="bg-page-bg rounded-lg p-3">
      <div className="text-xl font-semibold" style={{ color }}>{value}</div>
      <div className="text-[10px] text-text-secondary mt-1">{label}</div>
    </div>
  );
}
