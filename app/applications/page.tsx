"use client";

import TopBar from "@/components/layout/TopBar";

const statusBadge: Record<string, { variant: "green" | "amber" | "blue" | "gray"; label: string }> = {
  applied: { variant: "blue", label: "Applied" },
  viewed: { variant: "blue", label: "Viewed" },
  screening: { variant: "amber", label: "Screening" },
  interview: { variant: "amber", label: "Interview" },
  offer: { variant: "green", label: "Offer" },
  rejected: { variant: "gray", label: "Rejected" },
};

export default function ApplicationsPage() {
  // Applications will be populated from Supabase once connected
  return (
    <>
      <TopBar
        title="Applications"
        subtitle="No applications yet"
      />

      <div className="p-4 px-5 flex-1">
        <div className="bg-card-bg border border-card-border rounded-xl overflow-hidden">
          {/* Table header */}
          <div className="grid grid-cols-[1fr_120px_80px_120px_120px_80px] gap-2 px-4 py-2.5 border-b border-card-border text-[11px] text-text-secondary uppercase tracking-wide">
            <span>Job</span>
            <span>Status</span>
            <span>Match</span>
            <span>Applied</span>
            <span>Last Activity</span>
            <span>Type</span>
          </div>

          {/* Empty state */}
          <div className="px-4 py-16 text-center">
            <div className="text-text-secondary text-sm mb-2">No applications yet</div>
            <p className="text-text-secondary text-xs">
              Discover jobs and apply to start tracking your applications here.
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
