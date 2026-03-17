import { Link } from "~/components/SmartLink";
import { cn } from "~/lib/cn";

const focusRing = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ocean-blue focus-visible:ring-offset-2 focus-visible:ring-offset-surface-secondary";

const navLinks = [
  { to: "/journey", label: "여정" },
  { to: "/logs", label: "기록" },
  { to: "/challenges", label: "챌린지" },
  { to: "/learners", label: "러너" },
];

const legalLinks = [
  { to: "/privacy", label: "개인정보처리방침" },
  { to: "/terms", label: "이용약관" },
];

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-surface-secondary border-t border-border">
      <div className="max-w-[1200px] mx-auto px-6 py-16 md:py-24">
        <div className="flex flex-col md:flex-row justify-between gap-10 md:gap-8">
          <div className="flex flex-col gap-4">
            <Link
              to="/"
              className={cn(
                "flex items-center gap-2.5 no-underline w-fit",
                focusRing
              )}
            >
              <img
                src="/icon.svg"
                alt=""
                aria-hidden="true"
                className="w-8 h-8 rounded-lg shadow-lg shadow-ocean-blue/10"
              />
              <span className="text-lg font-bold tracking-tight text-deep-ocean">
                DiveLog
              </span>
            </Link>
            <p className="text-sm text-text-secondary leading-relaxed max-w-xs">
              아홉 달의 여정을 기록하고, 질문을 남기고, 서로의 사유에 공명하는 공간
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-8 sm:gap-12 md:gap-16">
            <nav aria-label="푸터 내비게이션">
              <h3 className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-4">
                탐색
              </h3>
              <ul className="flex flex-col gap-3">
                {navLinks.map((link) => (
                  <li key={link.to}>
                    <Link
                      to={link.to}
                      className={cn(
                        "text-sm text-text-secondary hover:text-ocean-blue transition-colors no-underline",
                        focusRing
                      )}
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>

            <nav aria-label="법적 고지">
              <h3 className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-4">
                법적 고지
              </h3>
              <ul className="flex flex-col gap-3">
                {legalLinks.map((link) => (
                  <li key={link.to}>
                    <Link
                      to={link.to}
                      className={cn(
                        "text-sm text-text-secondary hover:text-ocean-blue transition-colors no-underline",
                        focusRing
                      )}
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          </div>
        </div>

        <div className="border-t border-border mt-12 pt-8">
          <p className="text-xs text-text-secondary">
            © {currentYear} DiveLog. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
