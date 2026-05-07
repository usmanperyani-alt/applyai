import Link from "next/link";

// Shown when the user has no master CV. Single primary CTA: upload.
// Matches design ATfyh in Designs/pencil-new.pen with the agent-voiced copy.
export default function EmptyDashboard() {
  return (
    <div className="flex-1 flex items-center justify-center p-10">
      <div className="bg-white border border-cream-300 rounded-3xl px-12 py-14 max-w-[480px] text-center shadow-sm">
        <div className="w-14 h-14 rounded-full bg-amber-badge-bg mx-auto flex items-center justify-center mb-5">
          <FileTextIcon className="w-6 h-6 text-amber-darkest" />
        </div>
        <h2 className="text-[22px] font-bold text-forest-900 -tracking-[0.025em]">
          Your dashboard is waiting
        </h2>
        <p className="text-[13px] text-ink-700 mt-2 leading-relaxed">
          Upload your CV and the agent will start scoring jobs against your real
          experience — no generic matching.
        </p>
        <Link
          href="/cv"
          className="inline-flex items-center gap-2.5 h-[48px] px-6 rounded-full bg-forest-900 text-white text-[14px] font-semibold hover:bg-forest-800 transition-colors mt-6"
        >
          <UploadIcon className="w-4 h-4" />
          Upload your CV
        </Link>
        <div className="text-[11px] text-warm-400 mt-4">
          or paste a LinkedIn URL · skip and explore first
        </div>
      </div>
    </div>
  );
}

type IconProps = { className?: string };
const FileTextIcon = ({ className }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" />
  </svg>
);
const UploadIcon = ({ className }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12" />
  </svg>
);
