interface SourceChipProps {
  name: string;
  active?: boolean;
}

export default function SourceChip({ name, active = false }: SourceChipProps) {
  return (
    <span
      className={`px-2.5 py-1 rounded-full text-[11px] border cursor-pointer transition-colors ${
        active
          ? "bg-brand-50 text-brand-700 border-brand-300"
          : "bg-card-bg text-text-dim border-card-border hover:bg-page-bg"
      }`}
    >
      {name}
    </span>
  );
}
