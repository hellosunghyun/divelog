interface HeroSectionProps {
  variant: "home" | "stage" | "challenge" | "learner" | "memory";
  title: React.ReactNode;
  subtitle?: string;
  accentTone?: string;
  badge?: string;
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

export default function HeroSection({ variant, title, subtitle, accentTone, badge, children }: HeroSectionProps) {
  const isHome = variant === "home";

  if (isHome) {
    return (
      <section className="deep-ocean-hero min-h-[560px] flex items-center justify-center text-center px-6">
        <div className="hero-caustics" aria-hidden="true" />
        <div className="relative z-10 max-w-4xl py-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md text-white/90 text-[11px] font-semibold tracking-[0.15em] mb-8 border border-white/10">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" aria-hidden="true" />
            {badge ?? "REFLECTIVE ARCHIVING"}
          </div>
          <h1 className="text-5xl md:text-7xl font-extrabold text-white mb-8 leading-[1.1] tracking-tight text-glow">
            {title}
          </h1>
          {subtitle && (
            <p className="text-lg md:text-xl text-mist-blue/70 font-light leading-relaxed mb-10 max-w-2xl mx-auto">
              {subtitle}
            </p>
          )}
          {children && <div className="flex flex-col sm:flex-row items-center justify-center gap-4">{children}</div>}
        </div>
        <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-[#F6F8FB] to-transparent" aria-hidden="true" />
      </section>
    );
  }

  const accentBgClass = accentTone ? (ACCENT_BG[accentTone] ?? "bg-ocean-blue/8 text-ocean-blue") : "bg-ocean-blue/8 text-ocean-blue";
  const accentBorderClass = accentTone ? (ACCENT_BORDER[accentTone] ?? "border-ocean-blue/15") : "border-ocean-blue/15";

  const paddingClass = "py-16 md:py-20";
  const titleClass = "text-3xl md:text-4xl -tracking-[0.02em]";

  return (
    <section className={`relative overflow-hidden ${paddingClass} px-6 bg-gradient-to-b from-mist-blue/60 via-mist-blue/30 to-bg`}>
      <div 
        className="absolute inset-0 pointer-events-none" 
        style={{
          background: "radial-gradient(ellipse 80% 50% at 50% 0%, rgba(108,196,214,0.05) 0%, transparent 60%)"
        }}
        aria-hidden="true"
      />
      <div className="relative max-w-content mx-auto">
        {badge && (
          <div className={`inline-block text-caption font-medium tracking-wide px-3 py-1 rounded-full border ${accentBgClass} ${accentBorderClass} mb-5`}>
            {badge}
          </div>
        )}
        <h1 className={`font-semibold text-deep-ocean leading-hero ${titleClass} ${subtitle ? "mb-5" : ""}`}>
          {title}
        </h1>
        {subtitle && (
          <p className="text-lg md:text-xl text-text-secondary leading-relaxed max-w-[600px]">
            {subtitle}
          </p>
        )}
        {children && <div className="mt-8">{children}</div>}
      </div>
    </section>
  );
}
