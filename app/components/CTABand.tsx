import { Link } from "react-router";

interface CTABandProps {
  primaryCta?: { label: string; href: string };
  secondaryCta?: { label: string; href: string };
  message?: string;
}

export default function CTABand({ primaryCta, secondaryCta, message }: CTABandProps) {
  return (
    <section style={{ padding: "var(--space-10) var(--space-4)", backgroundColor: "var(--color-mist-blue)", borderRadius: "var(--radius-lg)", textAlign: "center" }}>
      {message && <p style={{ fontSize: "var(--font-size-lg)", color: "var(--color-text-secondary)", marginBottom: "var(--space-6)" }}>{message}</p>}
      <div style={{ display: "flex", gap: "var(--space-4)", justifyContent: "center", flexWrap: "wrap" }}>
        {primaryCta && (
          <Link to={primaryCta.href} style={{ padding: "12px 24px", borderRadius: "var(--radius-md)", backgroundColor: "var(--color-ocean-blue)", color: "white", fontWeight: "var(--font-weight-medium)", fontSize: "var(--font-size-base)" }}>
            {primaryCta.label}
          </Link>
        )}
        {secondaryCta && (
          <Link to={secondaryCta.href} style={{ padding: "12px 24px", borderRadius: "var(--radius-md)", border: "1px solid var(--color-border)", color: "var(--color-text-secondary)", fontSize: "var(--font-size-base)" }}>
            {secondaryCta.label}
          </Link>
        )}
      </div>
    </section>
  );
}
