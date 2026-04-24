interface TopBarProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}

export default function TopBar({ title, subtitle, actions }: TopBarProps) {
  return (
    <div className="bg-card-bg border-b border-card-border px-5 py-3 flex items-center justify-between shrink-0">
      <div>
        <div className="text-[15px] font-medium">{title}</div>
        {subtitle && (
          <div className="text-xs text-text-secondary mt-px">{subtitle}</div>
        )}
      </div>
      {actions && <div className="flex gap-2">{actions}</div>}
    </div>
  );
}
