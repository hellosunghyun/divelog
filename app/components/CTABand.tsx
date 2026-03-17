import { Link } from "~/components/SmartLink";

interface CTABandProps {
  eyebrow?: string;
  heading?: string;
  cta?: { label: string; href: string };
  /** @deprecated Use eyebrow + heading instead */
  message?: string;
  /** @deprecated Use cta instead */
  primaryCta?: { label: string; href: string };
  /** @deprecated Secondary CTA removed in new design */
  secondaryCta?: { label: string; href: string };
}

export default function CTABand({
  eyebrow,
  heading,
  cta,
  message,
  primaryCta,
  secondaryCta,
}: CTABandProps) {
  const displayEyebrow = eyebrow ?? "완성된 글이 아니어도 괜찮습니다";
  const displayHeading = heading ?? message ?? "무엇이 남았는지부터 적어도 좋습니다";
  const displayCta = cta ?? primaryCta;

  return (
    <section className="bg-mist-blue/50 border-y border-mist-blue py-16 md:py-24">
      <div className="max-w-content mx-auto px-6 text-center">
        <p className="text-text-secondary text-base mb-2">
          {displayEyebrow}
        </p>

        <h2 className="text-3xl font-semibold tracking-tight mb-6 text-text-primary">
          {displayHeading}
        </h2>

        {displayCta && (
          <Link
            to={displayCta.href}
            className="inline-flex items-center justify-center rounded-full px-8 py-3.5 bg-deep-ocean text-white font-medium hover:bg-ocean-blue transition-premium active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ocean-blue focus-visible:ring-offset-2"
          >
            {displayCta.label}
          </Link>
        )}

        {secondaryCta && (
          <Link
            to={secondaryCta.href}
            className="ml-4 inline-flex items-center justify-center rounded-full border border-border text-text-secondary px-6 py-3 text-[15px] font-medium hover:border-ocean-blue/30 hover:bg-mist-blue/30 hover:text-ocean-blue transition-premium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ocean-blue focus-visible:ring-offset-2"
          >
            {secondaryCta.label}
          </Link>
        )}
      </div>
    </section>
  );
}
