interface SeverityTagProps {
  severity: string;
  size?: "sm" | "md";
}

// Every color here stays within the locked token system — no new hues
// introduced for severity levels. Differentiation comes from weight,
// fill vs. outline, and label, not from a rainbow of status colors.
const SEVERITY_STYLES: Record<string, string> = {
  critical: "bg-ink text-seal border border-ink",
  high: "bg-seal text-ink border border-ink",
  medium: "bg-paper text-ink border border-ink",
  low: "bg-paper text-graphite border border-graphite-line",
  invalid: "bg-paper text-graphite border border-graphite-line line-through",
  "": "bg-paper text-graphite border border-graphite-line",
};

export function SeverityTag({ severity, size = "md" }: SeverityTagProps) {
  const style = SEVERITY_STYLES[severity] ?? SEVERITY_STYLES[""];
  const sizing = size === "sm" ? "text-[10px] px-2 py-0.5" : "text-xs px-2.5 py-1";
  const label = severity ? severity.toUpperCase() : "PENDING";

  return (
    <span className={`mono-tag inline-block rounded-sm uppercase tracking-wider ${style} ${sizing}`}>
      {label}
    </span>
  );
}
