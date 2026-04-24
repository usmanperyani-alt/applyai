"use client";

import { useEffect, useState } from "react";
import TopBar from "@/components/layout/TopBar";
import Badge from "@/components/ui/Badge";
import { getLocalApplications, getOrCreateUserId, type LocalApplication } from "@/lib/localStore";

interface ApiApplication {
  id: string;
  job_id: string;
  cv_id: string | null;
  status: string;
  applied_at: string;
  auto_applied: boolean;
  jobs?: {
    title: string;
    company: string;
    location: string;
    match_score: number;
    url: string;
  };
}

const statusBadge: Record<string, { variant: "green" | "amber" | "blue" | "gray"; label: string }> = {
  applied: { variant: "blue", label: "Applied" },
  viewed: { variant: "blue", label: "Viewed" },
  screening: { variant: "amber", label: "Screening" },
  interview: { variant: "amber", label: "Interview" },
  offer: { variant: "green", label: "Offer" },
  rejected: { variant: "gray", label: "Rejected" },
  pending_verification: { variant: "amber", label: "Pending verification" },
};

interface DisplayApp {
  id: string;
  title: string;
  company: string;
  location: string;
  matchScore: number;
  appliedAt: string;
  status: string;
  autoApplied: boolean;
  url: string;
}

export default function ApplicationsPage() {
  const [apps, setApps] = useState<DisplayApp[]>([]);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<"local" | "supabase">("local");

  useEffect(() => {
    const userId = getOrCreateUserId();
    fetch(`/api/apply?user_id=${userId}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.mode === "supabase" && Array.isArray(data.applications)) {
          setMode("supabase");
          setApps(
            (data.applications as ApiApplication[]).map((a) => ({
              id: a.id,
              title: a.jobs?.title || "Unknown role",
              company: a.jobs?.company || "Unknown company",
              location: a.jobs?.location || "",
              matchScore: a.jobs?.match_score || 0,
              appliedAt: a.applied_at,
              status: a.status,
              autoApplied: a.auto_applied,
              url: a.jobs?.url || "",
            }))
          );
        } else {
          // Local fallback
          setMode("local");
          const local = getLocalApplications();
          setApps(localToDisplay(local));
        }
      })
      .catch(() => {
        setMode("local");
        setApps(localToDisplay(getLocalApplications()));
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <>
      <TopBar
        title="Applications"
        subtitle={
          loading
            ? "Loading..."
            : `${apps.length} tracked${mode === "local" ? " · stored locally" : ""}`
        }
      />

      <div className="p-4 px-5 flex-1">
        <div className="bg-card-bg border border-card-border rounded-xl overflow-hidden">
          {/* Table header */}
          <div className="grid grid-cols-[1fr_120px_80px_140px_100px_80px] gap-2 px-4 py-2.5 border-b border-card-border text-[11px] text-text-secondary uppercase tracking-wide">
            <span>Job</span>
            <span>Status</span>
            <span>Match</span>
            <span>Applied</span>
            <span>Type</span>
            <span></span>
          </div>

          {apps.length === 0 && !loading && (
            <div className="px-4 py-16 text-center">
              <div className="text-text-secondary text-sm mb-2">No applications yet</div>
              <p className="text-text-secondary text-xs">
                Apply to jobs from the Dashboard or Jobs page to start tracking.
              </p>
            </div>
          )}

          {apps.map((app) => {
            const badge = statusBadge[app.status] || { variant: "gray" as const, label: app.status };
            return (
              <div
                key={app.id}
                className="grid grid-cols-[1fr_120px_80px_140px_100px_80px] gap-2 px-4 py-3 border-b border-card-border last:border-b-0 hover:bg-[#f9f9f7] items-center"
              >
                <div>
                  <div className="text-[13px] font-medium">{app.title}</div>
                  <div className="text-[11px] text-text-secondary">{app.company} · {app.location}</div>
                </div>
                <div>
                  <Badge variant={badge.variant}>{badge.label}</Badge>
                </div>
                <div className="text-[12px] font-medium text-brand-700">
                  {app.matchScore}%
                </div>
                <div className="text-[11px] text-text-secondary">{formatRelative(app.appliedAt)}</div>
                <div>
                  {app.autoApplied ? (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-brand-50 text-brand-700">Auto</span>
                  ) : (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-page-bg text-text-dim">Manual</span>
                  )}
                </div>
                <div className="text-right">
                  {app.url && (
                    <a
                      href={app.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[11px] text-brand-700 hover:underline"
                    >
                      View ↗
                    </a>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}

function localToDisplay(local: LocalApplication[]): DisplayApp[] {
  return local.map((a) => ({
    id: a.id,
    title: a.job_snapshot.title,
    company: a.job_snapshot.company,
    location: a.job_snapshot.location,
    matchScore: a.job_snapshot.match_score,
    appliedAt: a.applied_at,
    status: a.status,
    autoApplied: a.auto_applied,
    url: a.job_snapshot.url,
  }));
}

function formatRelative(isoDate: string): string {
  const date = new Date(isoDate);
  const diff = Date.now() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  if (days > 7) return date.toLocaleDateString();
  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  if (minutes > 0) return `${minutes}m ago`;
  return "Just now";
}
