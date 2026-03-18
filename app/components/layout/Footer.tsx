import { Link } from "~/components/content/SmartLink";
import { cn } from "~/lib/utils/cn";

const focusRing = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ocean-blue focus-visible:ring-offset-2 focus-visible:ring-offset-surface-secondary";

const navLinks = [
  { to: "/logs", label: "기록" },
  { to: "/learners", label: "러너" },
  { to: "/guide", label: "가이드" },
];

const legalLinks = [
  { to: "/terms", label: "이용약관" },
  { to: "/privacy", label: "개인정보처리방침" },
];



export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-surface-secondary border-t border-border">
      <div className="max-w-[1200px] mx-auto px-6 py-12 md:py-24">
        <div className="flex flex-col md:flex-row justify-between gap-8 md:gap-8">
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
            <p className="max-w-xs text-[15px] text-text-secondary leading-relaxed">
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
                        "text-[15px] text-text-secondary hover:text-ocean-blue transition-colors no-underline",
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
                안내
              </h3>
              <ul className="flex flex-col gap-3">
                {legalLinks.map((link) => (
                  <li key={link.to}>
                    <Link
                      to={link.to}
                      className={cn(
                        "text-[15px] text-text-secondary hover:text-ocean-blue transition-colors no-underline",
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

        <div className="border-t border-border mt-12 pt-8 flex items-center justify-between">
          <p className="text-sm text-text-secondary">
            © {currentYear} DiveLog. All rights reserved.
          </p>
          <a
            href="https://github.com/hellosunghyun/divelog"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="GitHub 저장소"
            className={cn(
              "text-text-secondary hover:text-ocean-blue transition-colors",
              focusRing
            )}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="currentColor"
              aria-hidden="true"
            >
              <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
            </svg>
          </a>
        </div>
      </div>
    </footer>
  );
}
