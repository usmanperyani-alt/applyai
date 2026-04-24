interface ProgressBarProps {
  value: number;
  color?: string;
}

export default function ProgressBar({ value, color = "#1D9E75" }: ProgressBarProps) {
  return (
    <div className="h-1 bg-page-bg rounded-sm overflow-hidden">
      <div
        className="h-full rounded-sm"
        style={{ width: `${value}%`, background: color }}
      />
    </div>
  );
}
