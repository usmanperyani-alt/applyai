type BadgeVariant = "green" | "amber" | "blue" | "gray";

const variantStyles: Record<BadgeVariant, string> = {
  green: "bg-brand-50 text-brand-700",
  amber: "bg-amber-badge-bg text-amber-badge-text",
  blue: "bg-blue-badge-bg text-blue-badge-text",
  gray: "bg-page-bg text-text-dim",
};

interface BadgeProps {
  variant: BadgeVariant;
  children: React.ReactNode;
}

export default function Badge({ variant, children }: BadgeProps) {
  return (
    <span className={`px-2 py-0.5 rounded-full text-[11px] ${variantStyles[variant]}`}>
      {children}
    </span>
  );
}
