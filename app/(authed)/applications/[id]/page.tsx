import Link from "next/link";
import { notFound } from "next/navigation";
import TopBar from "@/components/layout/TopBar";
import Badge from "@/components/ui/Badge";
import { hasSupabase } from "@/lib/supabase";
import { getCurrentUser, getServerClient } from "@/lib/supabase/server";
import type { CVContent } from "@/types";

interface PageProps {
  params: Promise<{ id: string }>;
}

const statusBadge: Record<string, { variant: "green" | "amber" | "blue" | "gray"; label: string }> = {
  applied: { variant: "blue", label: "Applied" },
  viewed: { variant: "blue", label: "Viewed" },
  screening: { variant: "amber", label: "Screening" },
  interview: { variant: "amber", label: "Interview" },
  offer: { variant: "green", label: "Offer" },
  rejected: { variant: "gray", label: "Rejected" },
};

export default async function ApplicationDetailPage({ params }: PageProps) {
  const { id } = await params;

  if (!hasSupabase()) {
    return (
      <>
        <TopBar title="Application detail" subtitle="Local mode — no detail view available" />
        <div className="p-5">
          <p className="text-sm text-text-secondary">
            Detail view requires Supabase. Configure it in <code>.env.local</code>.
          </p>
        </div>
      </>
    );
  }

  const user = await getCurrentUser();
  if (!user) notFound();

  const supabase = await getServerClient();
  const { data: app } = await supabase
    .from("applications")
    .select("*, jobs(*), cvs(id, label, content, pdf_url, is_master, created_at, tailored_for_job_id)")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (!app) notFound();

  const job = app.jobs as {
    id: string;
    title: string;
    company: string;
    location: string;
    remote: boolean;
    description: string | null;
    description_text: string | null;
    url: string;
    match_score: number | null;
  } | null;
  const cv = app.cvs as {
    id: string;
    label: string;
    content: CVContent;
    pdf_url: string | null;
    is_master: boolean;
    created_at: string;
  } | null;
  const badge = statusBadge[app.status] || { variant: "gray" as const, label: app.status };

  return (
    <>
      <TopBar
        title={job ? `${job.title} · ${job.company}` : "Application"}
        subtitle={`Applied ${new Date(app.applied_at).toLocaleString()}`}
        actions={
          <Link
            href="/applications"
            className="py-[7px] px-3.5 rounded-lg text-[13px] cursor-pointer border border-card-border bg-card-bg text-text-primary hover:bg-page-bg transition-colors"
          >
            ← All applications
          </Link>
        }
      />

      <div className="p-4 px-5 flex-1 flex flex-col gap-4">
        {/* Status / meta */}
        <div className="bg-card-bg border border-card-border rounded-xl p-4 flex flex-wrap items-center gap-3">
          <Badge variant={badge.variant}>{badge.label}</Badge>
          {app.auto_applied && (
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-brand-50 text-brand-700">
              Auto-applied
            </span>
          )}
          {job?.match_score != null && (
            <span className="text-[12px] text-brand-700 font-medium">{job.match_score}% match</span>
          )}
          {job?.location && (
            <span className="text-[11px] text-text-dim">· {job.location}</span>
          )}
          {job?.remote && (
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-brand-50 text-brand-700">Remote</span>
          )}
          {job?.url && (
            <a
              href={job.url}
              target="_blank"
              rel="noopener noreferrer"
              className="ml-auto text-[12px] text-brand-700 hover:underline"
            >
              View original posting ↗
            </a>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Job description */}
          <div className="bg-card-bg border border-card-border rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-card-border">
              <span className="text-[13px] font-medium">Job description</span>
            </div>
            <div className="p-4 max-h-[600px] overflow-y-auto">
              {job?.description ? (
                <div
                  className="text-[12px] text-text-dim leading-relaxed prose-sm [&_h1]:text-[14px] [&_h1]:font-semibold [&_h1]:mt-3 [&_h1]:mb-1 [&_h2]:text-[13px] [&_h2]:font-semibold [&_h2]:mt-3 [&_h2]:mb-1 [&_h3]:text-[12px] [&_h3]:font-semibold [&_h3]:mt-2 [&_h3]:mb-1 [&_p]:mb-2 [&_ul]:list-disc [&_ul]:pl-4 [&_ul]:mb-2 [&_li]:mb-0.5 [&_a]:text-brand-700 [&_a]:underline [&_strong]:font-semibold"
                  dangerouslySetInnerHTML={{ __html: job.description }}
                />
              ) : (
                <p className="text-[12px] text-text-secondary">
                  Job description wasn&apos;t captured for this application.
                </p>
              )}
            </div>
          </div>

          {/* CV that was sent */}
          <div className="bg-card-bg border border-card-border rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-card-border flex items-center justify-between">
              <div>
                <div className="text-[13px] font-medium">CV sent to {job?.company || "this employer"}</div>
                {cv && (
                  <div className="text-[11px] text-text-secondary mt-0.5">
                    {cv.label}
                    {cv.is_master && " (master CV — not tailored)"}
                  </div>
                )}
              </div>
              {cv?.pdf_url && (
                <a
                  href={`/api/cv/${cv.id}/pdf?download=1`}
                  className="px-3 py-1.5 rounded-lg text-[11px] font-medium bg-brand-500 text-white hover:bg-brand-700 transition-colors"
                >
                  Download PDF
                </a>
              )}
            </div>
            <div className="p-4 max-h-[600px] overflow-y-auto">
              {!cv ? (
                <p className="text-[12px] text-text-secondary">
                  No CV was attached to this application.
                </p>
              ) : (
                <CVContentView content={cv.content} />
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

function CVContentView({ content }: { content: CVContent }) {
  return (
    <div className="space-y-4 text-[12px]">
      {content.summary && (
        <div>
          <div className="text-[10px] uppercase tracking-wider text-text-secondary mb-1">Summary</div>
          <p className="text-text-dim leading-relaxed">{content.summary}</p>
        </div>
      )}
      {content.experience?.length > 0 && (
        <div>
          <div className="text-[10px] uppercase tracking-wider text-text-secondary mb-2">Experience</div>
          <div className="space-y-3">
            {content.experience.map((exp, i) => (
              <div key={i}>
                <div className="font-medium text-text-primary">{exp.title}</div>
                <div className="text-[11px] text-text-secondary">
                  {exp.company}
                  {exp.location ? ` · ${exp.location}` : ""}
                  {(exp.start_date || exp.end_date) ? ` · ${exp.start_date || ""}–${exp.end_date || "Present"}` : ""}
                </div>
                {exp.bullets?.length > 0 && (
                  <ul className="mt-1 space-y-0.5 pl-4 list-disc text-text-dim">
                    {exp.bullets.filter(Boolean).map((b, j) => (
                      <li key={j}>{b}</li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
      {content.education?.length > 0 && (
        <div>
          <div className="text-[10px] uppercase tracking-wider text-text-secondary mb-2">Education</div>
          <div className="space-y-1.5">
            {content.education.map((edu, i) => (
              <div key={i}>
                <div className="font-medium text-text-primary">{edu.degree}</div>
                <div className="text-[11px] text-text-secondary">
                  {edu.school}{edu.year ? ` · ${edu.year}` : ""}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      {content.skills?.length > 0 && (
        <div>
          <div className="text-[10px] uppercase tracking-wider text-text-secondary mb-1">Skills</div>
          <div className="flex flex-wrap gap-1">
            {content.skills.map((s) => (
              <span
                key={s}
                className="px-2 py-0.5 rounded-full text-[10px] bg-brand-50 text-brand-700 border border-brand-300"
              >
                {s}
              </span>
            ))}
          </div>
        </div>
      )}
      {content.certifications?.length > 0 && (
        <div>
          <div className="text-[10px] uppercase tracking-wider text-text-secondary mb-1">Certifications</div>
          <ul className="text-text-dim list-disc pl-4 space-y-0.5">
            {content.certifications.map((c, i) => <li key={i}>{c}</li>)}
          </ul>
        </div>
      )}
    </div>
  );
}
