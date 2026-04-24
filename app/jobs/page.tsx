"use client";

import { useState, useEffect, useCallback } from "react";
import TopBar from "@/components/layout/TopBar";
import JobCard from "@/components/jobs/JobCard";
import { Job } from "@/types";

const companies = ["stripe", "figma", "notion", "linear", "vercel"];
const workTypes = ["All", "Remote", "On-site"];

export default function JobsPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [workType, setWorkType] = useState("All");
  const [selectedCompanies, setSelectedCompanies] = useState<string[]>(["stripe"]);
  const [error, setError] = useState<string | null>(null);

  const fetchJobs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      selectedCompanies.forEach((c) => params.append("company", c));
      if (search) params.set("q", search);

      const res = await fetch(`/api/jobs/discover?${params}`);
      const data = await res.json();
      setJobs(data.jobs || []);
    } catch {
      setError("Failed to fetch jobs. Check your connection.");
    } finally {
      setLoading(false);
    }
  }, [selectedCompanies, search]);

  useEffect(() => {
    const timer = setTimeout(() => fetchJobs(), 300);
    return () => clearTimeout(timer);
  }, [fetchJobs]);

  const toggleCompany = (company: string) => {
    setSelectedCompanies((prev) =>
      prev.includes(company)
        ? prev.filter((c) => c !== company)
        : [...prev, company]
    );
  };

  const filtered = jobs.filter((job) => {
    if (workType === "Remote" && !job.remote) return false;
    if (workType === "On-site" && job.remote) return false;
    return true;
  });

  return (
    <>
      <TopBar
        title="Job Discovery"
        subtitle={
          loading
            ? "Scanning Greenhouse boards..."
            : `${filtered.length} live jobs from ${selectedCompanies.length} companies`
        }
        actions={
          <button
            onClick={fetchJobs}
            className="py-[7px] px-3.5 rounded-lg text-[13px] cursor-pointer border border-brand-500 bg-brand-500 text-white hover:bg-brand-700 transition-colors"
          >
            Refresh
          </button>
        }
      />

      <div className="p-4 px-5 flex-1">
        {/* Search + Filters */}
        <div className="flex flex-wrap items-center gap-2.5 mb-4">
          <input
            type="text"
            placeholder="Search jobs, companies, locations..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 min-w-[200px] px-3 py-2 text-[13px] rounded-lg border border-card-border bg-card-bg placeholder:text-text-secondary focus:outline-none focus:border-brand-300"
          />

          {/* Work type */}
          <div className="flex gap-1">
            {workTypes.map((wt) => (
              <button
                key={wt}
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
        </div>

        {/* Company chips */}
        <div className="flex flex-wrap gap-1.5 mb-4">
          {companies.map((company) => {
            const active = selectedCompanies.includes(company);
            return (
              <button
                key={company}
                onClick={() => toggleCompany(company)}
                className={`px-3 py-1.5 rounded-full text-[11px] border cursor-pointer transition-colors capitalize ${
                  active
                    ? "bg-brand-50 text-brand-700 border-brand-300"
                    : "bg-card-bg text-text-dim border-card-border hover:bg-page-bg"
                }`}
              >
                {company}
              </button>
            );
          })}
        </div>

        {/* Loading state */}
        {loading && (
          <div className="flex items-center justify-center py-20">
            <div className="flex items-center gap-2 text-text-secondary text-sm">
              <div className="w-2 h-2 rounded-full bg-brand-500 animate-pulse-dot" />
              Scanning Greenhouse boards...
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="text-center py-16 text-red-500 text-sm">{error}</div>
        )}

        {/* Job grid */}
        {!loading && !error && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {filtered.map((job) => (
              <JobCard key={job.id} job={job} />
            ))}
          </div>
        )}

        {!loading && !error && filtered.length === 0 && (
          <div className="text-center py-16 text-text-secondary text-sm">
            No jobs match your filters. Try selecting more companies or adjusting your search.
          </div>
        )}
      </div>
    </>
  );
}
