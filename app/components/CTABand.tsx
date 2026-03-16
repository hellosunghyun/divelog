import { Link } from "~/components/SmartLink";

interface CTABandProps {
  primaryCta?: { label: string; href: string };
  secondaryCta?: { label: string; href: string };
  message?: string;
}

export default function CTABand({ primaryCta, secondaryCta, message }: CTABandProps) {
  return (
    <section className="py-8 px-4 bg-mist-blue rounded-2xl text-center flex flex-col items-center gap-4">
      {message && <p className="text-lg text-text-secondary">{message}</p>}
      <div className="flex gap-4 justify-center flex-wrap">
        {primaryCta && (
          <Link
            to={primaryCta.href}
            className="rounded-full bg-deep-ocean text-white px-7 py-3 text-[15px] font-medium shadow-sm hover:bg-ocean-blue hover:shadow-md transition-all duration-normal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ocean-blue focus-visible:ring-offset-2"
          >
            {primaryCta.label}
          </Link>
        )}
        {secondaryCta && (
          <Link
            to={secondaryCta.href}
            className="rounded-full border border-border text-text-secondary px-7 py-3 text-[15px] font-medium hover:border-ocean-blue/30 hover:bg-mist-blue/30 hover:text-ocean-blue transition-all duration-normal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ocean-blue focus-visible:ring-offset-2"
          >
            {secondaryCta.label}
          </Link>
        )}
      </div>
    </section>
  );
}
