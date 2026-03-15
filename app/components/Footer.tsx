import { Link } from "react-router";

const exploreLinks = [
  { to: "/journey", label: "여정" },
  { to: "/logs", label: "기록" },
  { to: "/challenges", label: "챌린지" },
];

const communityLinks = [
  { to: "/learners", label: "러너" },
  { to: "/guide", label: "가이드" },
];

const supportLinks = [
  { to: "/search", label: "검색" },
  { to: "/write", label: "기록 남기기" },
  { to: "/inbox", label: "인박스" },
];

const focusRing = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ocean-blue focus-visible:ring-offset-2 focus-visible:ring-offset-deep-ocean";

export default function Footer() {
  return (
    <footer className="bg-deep-ocean text-white pt-20 pb-12 border-t border-white/5">
      <div className="max-w-canvas mx-auto px-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 mb-20">
          <div className="lg:col-span-4">
            <Link to="/" className={`flex items-center gap-2.5 mb-6 no-underline ${focusRing}`}>
              <div className="bg-ocean-blue w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-xl shadow-ocean-blue/20">
                <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M2 6c.6.5 1.2 1 2.5 1C7 7 7 5 9.5 5c2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1" />
                  <path d="M2 12c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1" />
                  <path d="M2 18c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1" />
                </svg>
              </div>
              <span className="text-2xl font-bold tracking-tight text-white">divelog</span>
            </Link>
            <p className="text-mist-blue/60 text-[15px] leading-relaxed max-w-sm">
              ADA Learner의 아홉 달을 조용한 깊이에서 기록하고 돌아보는 아카이브입니다.
            </p>
          </div>

          <div className="lg:col-span-2 lg:col-start-6">
            <h4 className="text-[11px] font-bold uppercase tracking-[0.2em] text-mist-blue/40 mb-5">탐색</h4>
            <nav className="flex flex-col gap-3">
              {exploreLinks.map((link) => (
                <Link
                  key={link.to}
                  to={link.to}
                  className={`text-[15px] text-mist-blue/70 hover:text-white transition-colors no-underline ${focusRing}`}
                >
                  {link.label}
                </Link>
              ))}
            </nav>
          </div>

          <div className="lg:col-span-2">
            <h4 className="text-[11px] font-bold uppercase tracking-[0.2em] text-mist-blue/40 mb-5">러너</h4>
            <nav className="flex flex-col gap-3">
              {communityLinks.map((link) => (
                <Link
                  key={link.to}
                  to={link.to}
                  className={`text-[15px] text-mist-blue/70 hover:text-white transition-colors no-underline ${focusRing}`}
                >
                  {link.label}
                </Link>
              ))}
            </nav>
          </div>

          <div className="lg:col-span-2">
            <h4 className="text-[11px] font-bold uppercase tracking-[0.2em] text-mist-blue/40 mb-5">도구</h4>
            <nav className="flex flex-col gap-3">
              {supportLinks.map((link) => (
                <Link
                  key={link.to}
                  to={link.to}
                  className={`text-[15px] text-mist-blue/70 hover:text-white transition-colors no-underline ${focusRing}`}
                >
                  {link.label}
                </Link>
              ))}
            </nav>
          </div>
        </div>

        <div className="pt-8 border-t border-white/10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <p className="text-[13px] text-mist-blue/40">
            아홉 달의 여정을 기록하고, 질문을 남기고, 서로의 사유에 공명하는 공간
          </p>
          <p className="text-[13px] text-mist-blue/30">
            divelog.ada-kr-pos.com
          </p>
        </div>
      </div>
    </footer>
  );
}
