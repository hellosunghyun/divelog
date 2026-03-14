import { Link } from "react-router";

interface CTABandProps {
  primaryCta?: { label: string; href: string };
  secondaryCta?: { label: string; href: string };
  message?: string;
}

export default function CTABand({ primaryCta, secondaryCta, message }: CTABandProps) {
  return (
    <section className="py-8 px-4 bg-mist-blue rounded-lg text-center flex flex-col items-center gap-4">
      {message && <p className="text-lg text-text-secondary">{message}</p>}
      <div className="flex gap-4 justify-center flex-wrap">
        {primaryCta && (
          <Link
            to={primaryCta.href}
            className="px-6 py-3 rounded-md bg-ocean-blue text-white font-medium text-base hover:bg-deep-ocean transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ocean-blue focus-visible:ring-offset-2"
          >
            {primaryCta.label}
          </Link>
        )}
        {secondaryCta && (
          <Link
            to={secondaryCta.href}
            className="px-6 py-3 rounded-md border border-border text-text-secondary text-base hover:bg-surface-secondary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ocean-blue focus-visible:ring-offset-2"
          >
            {secondaryCta.label}
          </Link>
        )}
      </div>
    </section>
  );
}
