interface HeroSectionProps {
  variant: "home" | "stage" | "challenge" | "learner" | "memory";
  title: string;
  subtitle?: string;
  accentTone?: string;
  badge?: string;
  children?: React.ReactNode;
}

const ACCENT_BG: Record<string, string> = {
  prelude: "bg-prelude/10 text-prelude",
  bridge: "bg-bridge/10 text-bridge",
  challenge: "bg-challenge/10 text-challenge",
  epilogue: "bg-epilogue/10 text-epilogue",
};

const ACCENT_BORDER: Record<string, string> = {
  prelude: "border-prelude/30",
  bridge: "border-bridge/30",
  challenge: "border-challenge/30",
  epilogue: "border-epilogue/30",
};

export default function HeroSection({ variant, title, subtitle, accentTone, badge, children }: HeroSectionProps) {
  const accentBgClass = accentTone ? (ACCENT_BG[accentTone] ?? "bg-ocean-blue/10 text-ocean-blue") : "bg-ocean-blue/10 text-ocean-blue";
  const accentBorderClass = accentTone ? (ACCENT_BORDER[accentTone] ?? "border-ocean-blue/30") : "border-ocean-blue/30";

  return (
    <section className="py-16 px-4 bg-gradient-to-b from-mist-blue to-bg border-b border-border">
      <div className="max-w-content mx-auto">
        {badge && (
          <div className={`inline-block text-caption px-2.5 py-0.5 rounded-full border ${accentBgClass} ${accentBorderClass} font-medium mb-4`}>
            {badge}
          </div>
        )}
        <h1 className={`${variant === "home" ? "text-5xl lg:text-6xl" : "text-3xl lg:text-4xl"} font-semibold text-text-primary leading-hero ${subtitle ? "mb-4" : ""}`}>
          {title}
        </h1>
        {subtitle && (
          <p className="text-lg text-text-secondary leading-body max-w-reading">
            {subtitle}
          </p>
        )}
        {children && <div className="mt-6">{children}</div>}
      </div>
    </section>
  );
}
