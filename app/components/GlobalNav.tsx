import { Link, useRouteLoaderData, useLocation, useNavigate } from "react-router";
import { useState, useEffect, useRef } from "react";

interface PublicLoaderData {
  isAuthenticated: boolean;
  user: {
    id: string;
    name: string;
    profilePhotoUrl: string | null;
  } | null;
}

const focusRing = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ocean-blue focus-visible:ring-offset-2";

const navLinks = [
  { to: "/journey", label: "여정" },
  { to: "/logs", label: "기록" },
  { to: "/challenges", label: "챌린지" },
  { to: "/learners", label: "러너" },
  { to: "/guide", label: "가이드" },
];

const authLinks = [
  { to: "/inbox", label: "인박스" },
  { to: "/me", label: "내 공간" },
];

export default function GlobalNav() {
  const data = useRouteLoaderData("routes/_public") as PublicLoaderData | undefined;
  const location = useLocation();
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [currentUrl, setCurrentUrl] = useState("/");
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setCurrentUrl(window.location.href);
  }, [location]);

  useEffect(() => {
    setIsMenuOpen(false);
  }, [location.pathname]);

  const loginUrl = `https://ada-kr-pos.com/login?callbackUrl=${encodeURIComponent(currentUrl)}`;
  const logoutUrl = `https://ada-kr-pos.com/api/auth/logout?callbackUrl=${encodeURIComponent(currentUrl)}`;

  const isActive = (path: string) =>
    location.pathname === path || location.pathname.startsWith(path + "/");

  function handleSearchSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const q = searchInputRef.current?.value.trim();
    if (q) {
      navigate(`/search?q=${encodeURIComponent(q)}`);
      if (searchInputRef.current) searchInputRef.current.value = "";
    } else {
      navigate("/search");
    }
  }

  return (
    <>
    <header className="sticky top-0 z-50 bg-surface/75 backdrop-blur-xl backdrop-saturate-[1.8] border-b border-ocean-blue/5">
      <div className="max-w-canvas mx-auto px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-10">
          <Link
            to="/"
            className={`flex items-center gap-2.5 group no-underline ${focusRing}`}
          >
            <div className="bg-ocean-blue w-8 h-8 rounded-lg flex items-center justify-center text-white shadow-lg shadow-ocean-blue/20">
              <svg className="w-[18px] h-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M2 6c.6.5 1.2 1 2.5 1C7 7 7 5 9.5 5c2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1" />
                <path d="M2 12c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1" />
                <path d="M2 18c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1" />
              </svg>
            </div>
            <span className="text-lg font-bold tracking-tight text-deep-ocean">divelog</span>
          </Link>

          <nav className="hidden lg:flex items-center gap-8">
            {navLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className={`text-[14px] font-medium transition-colors no-underline ${focusRing} ${
                  isActive(link.to)
                    ? "text-ocean-blue"
                    : "text-text-secondary hover:text-ocean-blue"
                }`}
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="hidden md:flex items-center gap-1.5">
          <Link
            to="/search"
            className={`p-2 rounded-lg text-text-tertiary hover:text-ocean-blue hover:bg-mist-blue/50 transition-colors no-underline ${focusRing}`}
            aria-label="검색"
          >
            <svg className="w-[18px] h-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.3-4.3" />
            </svg>
          </Link>

          {data?.isAuthenticated ? (
            <>
              <Link
                to="/inbox"
                className={`p-2 rounded-lg transition-colors no-underline ${focusRing} ${
                  isActive("/inbox") ? "text-ocean-blue bg-mist-blue/50" : "text-text-tertiary hover:text-ocean-blue hover:bg-mist-blue/50"
                }`}
                aria-label="인박스"
              >
                <svg className="w-[18px] h-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
                  <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
                </svg>
              </Link>

              <Link
                to="/write"
                className={`bg-ocean-blue text-white ml-1 px-4 py-1.5 rounded-full text-[13px] font-semibold hover:bg-ocean-blue/90 transition-all flex items-center gap-1.5 no-underline ${focusRing}`}
              >
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M12 20h9" />
                  <path d="M16.376 3.622a1 1 0 0 1 3.002 3.002L7.368 18.635a2 2 0 0 1-.855.506l-2.872.838a.5.5 0 0 1-.62-.62l.838-2.872a2 2 0 0 1 .506-.854z" />
                </svg>
                기록 남기기
              </Link>

              <Link
                to="/me"
                className={`ml-1 rounded-full transition-all no-underline ${focusRing} ${
                  isActive("/me") ? "ring-2 ring-ocean-blue" : "hover:ring-2 hover:ring-ocean-blue/40"
                }`}
                aria-label="내 공간"
              >
                {data.user?.profilePhotoUrl ? (
                  <img
                    src={data.user.profilePhotoUrl}
                    alt={data.user.name}
                    className="w-8 h-8 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-mist-blue flex items-center justify-center text-xs font-semibold text-ocean-blue">
                    {data.user?.name?.[0] ?? "?"}
                  </div>
                )}
              </Link>
            </>
          ) : (
            <Link
              to="/write"
              className={`bg-ocean-blue text-white ml-1 px-4 py-1.5 rounded-full text-[13px] font-semibold hover:bg-ocean-blue/90 transition-all flex items-center gap-1.5 no-underline ${focusRing}`}
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M12 20h9" />
                <path d="M16.376 3.622a1 1 0 0 1 3.002 3.002L7.368 18.635a2 2 0 0 1-.855.506l-2.872.838a.5.5 0 0 1-.62-.62l.838-2.872a2 2 0 0 1 .506-.854z" />
              </svg>
              기록 남기기
            </Link>
          )}
        </div>

        <button
          type="button"
          className={`lg:hidden p-2 -mr-2 rounded-lg text-text-secondary hover:text-text-primary hover:bg-mist-blue transition-colors ${focusRing}`}
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          aria-label={isMenuOpen ? "메뉴 닫기" : "메뉴 열기"}
          aria-expanded={isMenuOpen}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            {isMenuOpen ? (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6h16M4 12h16M4 18h16" />
            )}
          </svg>
        </button>
      </div>

    </header>

      {isMenuOpen && (
        <div className="lg:hidden fixed inset-x-0 top-16 bottom-0 z-[9999] bg-white overflow-y-auto">
          <div className="border-t border-border-subtle" />
          <div className="max-w-content mx-auto px-6 py-8 flex flex-col gap-1">
            <form onSubmit={handleSearchSubmit} className="relative mb-4">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-text-tertiary pointer-events-none" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.3-4.3" />
              </svg>
              <input
                type="text"
                placeholder="기록, 질문, 러너 검색..."
                className={`w-full bg-text-tertiary/10 border-none rounded-full pl-10 pr-4 py-2.5 text-sm placeholder:text-text-tertiary ${focusRing}`}
              />
            </form>

            {navLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className={`text-base py-3 px-1 -mx-1 rounded-lg transition-colors no-underline ${focusRing} ${
                  isActive(link.to)
                    ? "font-medium text-ocean-blue"
                    : "text-text-secondary hover:text-text-primary"
                }`}
              >
                {link.label}
              </Link>
            ))}

            {data?.isAuthenticated ? (
              <>
                <div className="h-px bg-border-subtle my-4" />
                {authLinks.map((link) => (
                  <Link
                    key={link.to}
                    to={link.to}
                    className={`text-base py-3 px-1 -mx-1 rounded-lg transition-colors no-underline ${focusRing} ${
                      isActive(link.to)
                        ? "font-medium text-ocean-blue"
                        : "text-text-secondary hover:text-text-primary"
                    }`}
                  >
                    {link.label}
                  </Link>
                ))}
                <div className="mt-4">
                  <Link
                    to="/write"
                    className={`w-full bg-ocean-blue text-white py-3 px-5 rounded-full text-sm font-semibold text-center flex items-center justify-center gap-2 hover:bg-ocean-blue/90 transition-all no-underline ${focusRing}`}
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M12 20h9" />
                      <path d="M16.376 3.622a1 1 0 0 1 3.002 3.002L7.368 18.635a2 2 0 0 1-.855.506l-2.872.838a.5.5 0 0 1-.62-.62l.838-2.872a2 2 0 0 1 .506-.854z" />
                    </svg>
                    기록 남기기
                  </Link>
                </div>
                <div className="flex items-center gap-3 py-4 mt-2">
                  {data.user?.profilePhotoUrl ? (
                    <img src={data.user.profilePhotoUrl} alt={data.user.name} className="w-9 h-9 rounded-full object-cover ring-1 ring-border" />
                  ) : (
                    <div className="w-9 h-9 rounded-full bg-mist-blue flex items-center justify-center text-sm font-semibold text-ocean-blue">
                      {data.user?.name?.[0] ?? "?"}
                    </div>
                  )}
                  <span className="text-base text-text-secondary">{data.user?.name}</span>
                </div>
                <a href={logoutUrl} className={`text-sm text-text-tertiary hover:text-text-secondary transition-colors ${focusRing}`}>
                  로그아웃
                </a>
              </>
            ) : (
              <>
                <div className="h-px bg-border-subtle my-4" />
                <div className="mt-4 flex flex-col gap-3">
                  <Link
                    to="/write"
                    className={`w-full bg-ocean-blue text-white py-3 px-5 rounded-full text-sm font-semibold text-center flex items-center justify-center gap-2 hover:bg-ocean-blue/90 transition-all no-underline ${focusRing}`}
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M12 20h9" />
                      <path d="M16.376 3.622a1 1 0 0 1 3.002 3.002L7.368 18.635a2 2 0 0 1-.855.506l-2.872.838a.5.5 0 0 1-.62-.62l.838-2.872a2 2 0 0 1 .506-.854z" />
                    </svg>
                    기록 남기기
                  </Link>
                  <a
                    href={loginUrl}
                    className={`w-full border border-border text-text-secondary py-3 px-5 rounded-full text-sm font-medium text-center hover:border-ocean-blue/30 hover:text-ocean-blue transition-all ${focusRing}`}
                  >
                    로그인
                  </a>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
