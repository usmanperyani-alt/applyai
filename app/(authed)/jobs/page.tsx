"use client";

import { useState, useEffect, useCallback, useMemo, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import TopBar from "@/components/layout/TopBar";
import JobCard from "@/components/jobs/JobCard";
import { Job } from "@/types";
import { loadMasterCV } from "@/lib/store/cv";
import { getAppliedIds } from "@/lib/localStore";
import SourcesTab from "./SourcesTab";
import CompareModal from "./CompareModal";
import ColdStartEmpty from "./ColdStartEmpty";

type Tab = "browse" | "sources";
type SortKey = "best" | "newest" | "salary";

const greenhouseCompanies = ["stripe", "figma", "vercel", "airbnb", "ramp", "brex"];
const workTypes = ["All", "Remote", "On-site"] as const;

function JobsPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tab = (searchParams.get("tab") as Tab) || "browse";

  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [workType, setWorkType] = useState<(typeof workTypes)[number]>("All");
  const [sort, setSort] = useState<SortKey>("best");
  const [error, setError] = useState<string | null>(null);
  const [hasCV, setHasCV] = useState<boolean | null>(null);
  const [appliedIds, setAppliedIds] = useState<Set<string>>(new Set());

  // Compare mode
  const [compareMode, setCompareMode] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [compareOpen, setCompareOpen] = useState(false);

  function setTab(next: Tab) {
    const params = new URLSearchParams(searchParams.toString());
    if (next === "browse") params.delete("tab");
    else params.set("tab", next);
    router.replace(`/jobs${params.toString() ? `?${params}` : ""}`);
  }

  // CV gating: cold-start state only fires when user has a CV but DB is empty.
  // Without a CV, the Empty Dashboard / onboarding handles them.
  useEffect(() => {
    loadMasterCV().then((cv) => setHasCV(Boolean(cv?.content)));
    setAppliedIds(getAppliedIds());
  }, []);

  const fetchJobs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      greenhouseCompanies.forEach((c) => params.append("company", c));
      if (search) params.set("q", search);
      const res = await fetch(`/api/jobs/discover?${params}`);
      const data = await res.json();
      setJobs(data.jobs || []);
    } catch {
      setError("Failed to fetch jobs. Check your connection.");
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    if (tab !== "browse") return;
    const t = setTimeout(() => fetchJobs(), 300);
    return () => clearTimeout(t);
  }, [fetchJobs, tab]);

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else if (next.size < 3) next.add(id);
      return next;
    });
  }

  const filtered = useMemo(() => {
    let list = jobs.filter((job) => {
      if (workType === "Remote" && !job.remote) return false;
      if (workType === "On-site" && job.remote) return false;
      if (search) {
        const q = search.toLowerCase();
        if (!job.title.toLowerCase().includes(q) &&
            !job.company.toLowerCase().includes(q) &&
            !(job.location || "").toLowerCase().includes(q)) {
          return false;
        }
      }
      return true;
    });
    if (sort === "best") list = [...list].sort((a, b) => (b.match_score || 0) - (a.match_score || 0));
    else if (sort === "newest") list = [...list].sort((a, b) => +new Date(b.discovered_at) - +new Date(a.discovered_at));
    else if (sort === "salary") list = [...list].sort((a, b) => (b.salary_max || 0) - (a.salary_max || 0));
    return list;
  }, [jobs, workType, search, sort]);

  const selectedJobs = useMemo(
    () => jobs.filter((j) => selected.has(j.id)),
    [jobs, selected]
  );

  const showColdStart =
    tab === "browse" &&
    !loading &&
    jobs.length === 0 &&
    hasCV === true &&
    !error;

  return (
    <>
      <TopBar
        title="Jobs"
        subtitle={
          tab === "sources"
            ? "Agent control center · sweeps, sources, history"
            : loading
            ? "Scanning Greenhouse boards…"
            : `${filtered.length} of ${jobs.length} live jobs`
        }
        actions={
          tab === "browse" ? (
            <button
              type="button"
              onClick={() => {
                setCompareMode((v) => !v);
                if (compareMode) setSelected(new Set());
              }}
              className={`py-[7px] px-3.5 rounded-lg text-[13px] cursor-pointer border transition-colors ${
                compareMode
                  ? "bg-brand-500 text-white border-brand-500"
                  : "bg-card-bg text-text-dim border-card-border hover:bg-page-bg"
              }`}
            >
              {compareMode ? "Cancel compare" : "Compare jobs"}
            </button>
          ) : null
        }
      />

      {/* Tab strip */}
      <div className="px-5 pt-3 border-b border-card-border">
        <div className="flex gap-1">
          {(["browse", "sources"] as Tab[]).map((t) => {
            const active = tab === t;
            return (
              <button
                key={t}
                type="button"
                onClick={() => setTab(t)}
                className={`px-3 py-2 text-[13px] font-medium border-b-2 -mb-px transition-colors capitalize ${
                  active
                    ? "border-brand-500 text-forest-900"
                    : "border-transparent text-text-secondary hover:text-text-primary"
                }`}
              >
                {t === "browse" ? "Browse" : "Sources"}
              </button>
            );
          })}
        </div>
      </div>

      <div className="p-5 flex-1">
        {tab === "sources" && <SourcesTab />}

        {tab === "browse" && (
          <>
            {/* Filters */}
            <div className="flex flex-wrap items-center gap-2.5 mb-4">
              <input
                type="text"
                placeholder="Search jobs, companies, locations…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="flex-1 min-w-[240px] px-3 py-2 text-[13px] rounded-lg border border-card-border bg-card-bg placeholder:text-text-secondary focus:outline-none focus:border-brand-300"
              />

              <div className="flex gap-1">
                {workTypes.map((wt) => (
                  <button
                    key={wt}
                    type="button"
                    onClick={() => setWorkType(wt)}
                    className={`px-3 py-1.5 rounded-full text-[11px] border cursor-pointer transition-colors ${
                      workType === wt
                        ? "bg-brand-50 text-brand-700 border-brand-300"
                        : "bg-card-bg text-text-dim border-card-border hover:bg-page-bg"
                    }`}
                  >
                    {wt}
                  </button>
                ))}
              </div>

              <select
                value={sort}
                onChange={(e) => setSort(e.target.value as SortKey)}
                className="px-3 py-1.5 text-[12px] rounded-full border border-card-border bg-card-bg text-text-dim cursor-pointer hover:bg-page-bg"
              >
                <option value="best">Sort: Best match</option>
                <option value="newest">Sort: Newest</option>
                <option value="salary">Sort: Salary high to low</option>
              </select>
            </div>

            {/* States */}
            {loading && (
              <div className="flex items-center justify-center py-20">
                <div className="flex items-center gap-2 text-text-secondary text-sm">
                  <div className="w-2 h-2 rounded-full bg-brand-500 animate-pulse-dot" />
                  Scanning Greenhouse boards…
                </div>
              </div>
            )}

            {error && (
              <div className="text-center py-16 text-red-700 text-sm">{error}</div>
            )}

            {showColdStart && <ColdStartEmpty onSweep={fetchJobs} />}

            {!loading && !error && jobs.length > 0 && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                {filtered.map((job) => {
                  const isSelected = selected.has(job.id);
                  return (
                    <div key={job.id} className="relative">
                      {compareMode && (
                        <button
                          type="button"
                          onClick={() => toggleSelect(job.id)}
                          aria-label={isSelected ? "Deselect" : "Select for compare"}
                          className={`absolute top-3 right-3 z-10 w-6 h-6 rounded-md border-2 flex items-center justify-center transition-colors ${
                            isSelected
                              ? "bg-brand-500 border-brand-500 text-white"
                              : "bg-card-bg border-card-border hover:border-brand-500"
                          }`}
                        >
                          {isSelected && (
                            <svg viewBox="0 0 16 16" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M3 8l3 3 7-7" />
                            </svg>
                          )}
                        </button>
                      )}
                      {compareMode ? (
                        <div onClick={() => toggleSelect(job.id)} className="cursor-pointer">
                          <JobCard job={job} />
                        </div>
                      ) : (
                        <Link href={`/jobs/${job.id}`} className="block">
                          <JobCard job={job} />
                        </Link>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {!loading && !error && jobs.length > 0 && filtered.length === 0 && (
              <div className="text-center py-16 text-text-secondary text-sm">
                No jobs match your filters. Try removing constraints.
              </div>
            )}
          </>
        )}
      </div>

      {/* Compare action bar — sticky at bottom when 2+ selected */}
      {compareMode && selected.size > 0 && (
        <div className="sticky bottom-0 mx-5 mb-5 bg-forest-900 text-white rounded-2xl px-5 py-3 flex items-center justify-between shadow-lg">
          <div className="text-[13px] font-medium">
            {selected.size} of 3 selected{selected.size < 2 && " · pick at least 2 to compare"}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setSelected(new Set())}
              className="text-[12px] text-warm-400 hover:text-white"
            >
              Clear
            </button>
            <button
              type="button"
              onClick={() => setCompareOpen(true)}
              disabled={selected.size < 2}
              className="h-9 px-4 rounded-full bg-brand-500 text-forest-900 text-[12px] font-bold disabled:opacity-50"
            >
              Compare {selected.size > 1 ? selected.size : ""}
            </button>
          </div>
        </div>
      )}

      {compareOpen && selectedJobs.length > 0 && (
        <CompareModal
          jobs={selectedJobs}
          appliedIds={appliedIds}
          onClose={() => setCompareOpen(false)}
        />
      )}
    </>
  );
}

export default function JobsPage() {
  return (
    <Suspense fallback={null}>
      <JobsPageInner />
    </Suspense>
  );
}
