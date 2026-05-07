"use client";

type Props = {
  // Base64 PNG of the rendered application form (from /api/auto-apply/prepare).
  screenshot?: string | null;
  ats: string;
  jobUrl: string;
  capturedAt?: string;
};

// The "we filled this in for you" preview. Big card with the screenshot,
// metadata strip on top.
export default function FormSnapshot({ screenshot, ats, jobUrl, capturedAt }: Props) {
  return (
    <section className="bg-card-bg rounded-2xl border border-cream-300 overflow-hidden">
      <header className="px-5 py-3 border-b border-cream-300 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold tracking-[0.13em] uppercase text-warm-400">
            Form snapshot
          </span>
          <span className="text-[10px] text-text-secondary">
            captured {capturedAt || "just now"}
          </span>
        </div>
        <a
          href={jobUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-[10px] font-semibold tracking-[0.1em] uppercase text-brand-700 hover:text-brand-900"
        >
          {ats}
          <ExternalIcon className="w-3 h-3" />
        </a>
      </header>
      <div className="bg-page-bg p-3">
        {screenshot ? (
          <img
            src={screenshot.startsWith("data:") ? screenshot : `data:image/png;base64,${screenshot}`}
            alt="Filled application form"
            className="w-full rounded-lg border border-cream-300 max-h-[640px] object-top object-contain bg-white"
          />
        ) : (
          <div className="aspect-[4/3] rounded-lg border-2 border-dashed border-cream-300 bg-card-bg flex items-center justify-center">
            <div className="text-center max-w-[280px] px-6">
              <div className="text-[14px] font-semibold text-forest-900 mb-1">
                No screenshot available
              </div>
              <p className="text-[12px] text-text-secondary leading-relaxed">
                The headless browser couldn't render the form. You can still review the filled fields on the right and submit, or open the original posting to apply manually.
              </p>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

function ExternalIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14 21 3" />
    </svg>
  );
}
