import { Link } from "~/components/content/SmartLink";

interface HeroSectionProps {
  variant: "home" | "stage" | "learner" | "memory";
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  accentTone?: string;
  badge?: string;
  ctaText?: string;
  ctaHref?: string;
  children?: React.ReactNode;
}

const ACCENT_BG: Record<string, string> = {
  prelude: "bg-prelude/8 text-prelude",
  bridge: "bg-bridge/8 text-bridge",
  challenge: "bg-challenge/8 text-challenge",
  epilogue: "bg-epilogue/8 text-epilogue",
};

const ACCENT_BORDER: Record<string, string> = {
  prelude: "border-prelude/15",
  bridge: "border-bridge/15",
  challenge: "border-challenge/15",
  epilogue: "border-epilogue/15",
};

export default function HeroSection({
  variant,
  title,
  subtitle,
  accentTone,
  badge,
  ctaText,
  ctaHref,
  children,
}: HeroSectionProps) {
  const isHome = variant === "home";

  if (isHome) {
    return (
      <section className="relative overflow-hidden bg-gradient-to-br from-deep-ocean via-ocean-blue/90 to-deep-ocean/80 -mt-15 sm:-mt-16 pt-15 sm:pt-16">
        <div
          className="absolute inset-0 bg-[radial-gradient(ellipse_at_30%_50%,rgba(20,108,148,0.3),transparent_70%)] pointer-events-none"
          aria-hidden="true"
        />
        <div className="hero-caustics" aria-hidden="true" />

        <div className="relative z-10 max-w-content mx-auto px-6 w-full grid grid-cols-1 md:grid-cols-5 gap-8 md:gap-10 items-end pb-12 sm:pb-16 md:pb-20 pt-8 sm:pt-12 md:pt-20">
          <div className="md:col-span-3 space-y-5 md:space-y-6">
            <div>
              <span className="inline-flex items-center rounded-full px-3 py-1 text-xs uppercase tracking-wide font-medium bg-white/10 text-white/80 backdrop-blur-sm border border-white/20">
                {badge ?? "Apple Developer Academy @ POSTECH Learner 9개월의 여정"}
              </span>
            </div>

            <h1
              className="text-[2.75rem] sm:text-5xl md:text-7xl font-semibold text-white leading-hero"
              style={{ letterSpacing: "var(--tracking-tighter)" }}
            >
              {title}
            </h1>

            {subtitle && (
              <p className="text-base sm:text-lg text-white/70 leading-relaxed max-w-[50ch]">
                {subtitle}
              </p>
            )}

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4">
              {ctaHref && ctaText && (
                <Link
                  to={ctaHref}
                  className="inline-flex items-center justify-center rounded-full px-6 py-3 bg-white text-deep-ocean font-medium hover:bg-mist-blue transition-premium active:scale-[0.98]"
                >
                  {ctaText}
                </Link>
              )}
              {children}
            </div>
          </div>

          <div className="md:col-span-2 hidden md:flex items-center justify-end self-center">
            <div
              className="w-48 h-48 md:w-56 md:h-56 rounded-full bg-white/10 backdrop-blur-xl border border-white/20 shadow-[0_8px_32px_rgba(11,36,71,0.15)] flex items-center justify-center overflow-hidden"
              aria-hidden="true"
            >
              <img
                src="/icon.svg"
                alt=""
                className="w-full h-full object-cover drop-shadow-lg scale-[1.2]"
              />
            </div>
          </div>
        </div>

        <div
          className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-[#F6F8FB] to-transparent"
          aria-hidden="true"
        />
      </section>
    );
  }

  const accentBgClass = accentTone
    ? ACCENT_BG[accentTone] ?? "bg-ocean-blue/8 text-ocean-blue"
    : "bg-ocean-blue/8 text-ocean-blue";
  const accentBorderClass = accentTone
    ? ACCENT_BORDER[accentTone] ?? "border-ocean-blue/15"
    : "border-ocean-blue/15";

  return (
    <section className="relative overflow-hidden -mt-15 sm:-mt-16 pt-[7.75rem] sm:pt-32 md:pt-36 pb-16 md:pb-20 px-6 bg-gradient-to-b from-mist-blue/60 via-mist-blue/30 to-bg">
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 80% 50% at 50% 0%, rgba(108,196,214,0.05) 0%, transparent 60%)",
        }}
        aria-hidden="true"
      />

      <div className="relative max-w-content mx-auto">
        {badge && (
          <div>
            <div
              className={`inline-block text-caption font-medium tracking-wide px-3 py-1 rounded-full border ${accentBgClass} ${accentBorderClass} mb-5`}
            >
              {badge}
            </div>
          </div>
        )}

        <h1
          className={`font-semibold text-deep-ocean leading-hero text-3xl md:text-4xl ${subtitle ? "mb-5" : ""}`}
          style={{ letterSpacing: "var(--tracking-tight)" }}
        >
          {title}
        </h1>

        {subtitle && (
          <p className="text-lg md:text-xl text-text-secondary leading-relaxed max-w-[600px]">
            {subtitle}
          </p>
        )}

        {children && (
          <div className="mt-8">
            {children}
          </div>
        )}
      </div>
    </section>
  );
}
