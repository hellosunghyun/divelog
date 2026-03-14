interface HeroSectionProps {
  variant: "home" | "stage" | "challenge" | "learner" | "memory";
  title: string;
  subtitle?: string;
  accentTone?: string;
  badge?: string;
  children?: React.ReactNode;
}

const ACCENT_COLORS: Record<string, string> = {
  prelude: "var(--color-prelude)",
  bridge: "var(--color-bridge)",
  challenge: "var(--color-challenge)",
  epilogue: "var(--color-epilogue)",
};

export default function HeroSection({ variant, title, subtitle, accentTone, badge, children }: HeroSectionProps) {
  const accentColor = accentTone ? ACCENT_COLORS[accentTone] : "var(--color-ocean-blue)";
  return (
    <section style={{ padding: "var(--space-16) var(--space-4)", backgroundColor: "var(--color-surface)", borderBottom: "1px solid var(--color-border)" }}>
      <div style={{ maxWidth: "var(--max-content-width)", margin: "0 auto" }}>
        {badge && (
          <div style={{ display: "inline-block", fontSize: "12px", padding: "2px 10px", borderRadius: "var(--radius-full)", backgroundColor: `color-mix(in srgb, ${accentColor} 12%, transparent)`, color: accentColor, marginBottom: "var(--space-4)", fontWeight: "var(--font-weight-medium)" }}>
            {badge}
          </div>
        )}
        <h1 style={{ fontSize: variant === "home" ? "var(--font-size-4xl)" : "var(--font-size-3xl)", fontWeight: "var(--font-weight-bold)", color: "var(--color-text-primary)", lineHeight: "var(--line-height-tight)", marginBottom: subtitle ? "var(--space-4)" : "0" }}>
          {title}
        </h1>
        {subtitle && (
          <p style={{ fontSize: "var(--font-size-lg)", color: "var(--color-text-secondary)", lineHeight: "var(--line-height-normal)", maxWidth: "var(--max-reading-width)" }}>
            {subtitle}
          </p>
        )}
        {children && <div style={{ marginTop: "var(--space-6)" }}>{children}</div>}
      </div>
    </section>
  );
}
