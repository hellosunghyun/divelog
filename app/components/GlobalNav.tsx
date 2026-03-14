import { Link, useRouteLoaderData, useLocation } from "react-router";
import { useState, useEffect } from "react";

interface PublicLoaderData {
  isAuthenticated: boolean;
  user: {
    id: string;
    name: string;
    profilePhotoUrl: string | null;
  } | null;
}

export default function GlobalNav() {
  const data = useRouteLoaderData("routes/_public") as PublicLoaderData | undefined;
  const location = useLocation();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [currentUrl, setCurrentUrl] = useState("/");

  useEffect(() => {
    setCurrentUrl(window.location.href);
  }, [location]);

  // Close menu on route change
  useEffect(() => {
    setIsMenuOpen(false);
  }, [location.pathname]);

  const loginUrl = `https://ada-kr-pos.com/login?callbackUrl=${encodeURIComponent(currentUrl)}`;
  const logoutUrl = `https://ada-kr-pos.com/api/auth/logout?callbackUrl=${encodeURIComponent(currentUrl)}`;

  const navLinks = [
    { to: "/journey", label: "여정" },
    { to: "/logs", label: "기록" },
    { to: "/search", label: "검색" },
  ];

  const authLinks = [
    { to: "/inbox", label: "인박스" },
    { to: "/me", label: "내 공간" },
  ];

  return (
    <header className="sticky top-0 z-50 bg-surface border-b border-border">
      <div className="max-w-content mx-auto px-4 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link
          to="/"
          className="font-semibold text-lg text-text-primary hover:text-ocean-blue transition-colors"
        >
          divelog
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-6">
          {navLinks.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className="text-sm text-text-secondary hover:text-text-primary transition-colors"
            >
              {link.label}
            </Link>
          ))}

          {data?.isAuthenticated ? (
            <>
              {authLinks.map((link) => (
                <Link
                  key={link.to}
                  to={link.to}
                  className="text-sm text-text-secondary hover:text-text-primary transition-colors"
                >
                  {link.label}
                </Link>
              ))}
              <Link
                to="/write"
                className="text-sm px-4 py-2 rounded-lg bg-ocean-blue text-white hover:bg-deep-ocean transition-colors"
              >
                기록하기
              </Link>
              <div className="flex items-center gap-2">
                {data.user?.profilePhotoUrl && (
                  <img
                    src={data.user.profilePhotoUrl}
                    alt={data.user.name}
                    className="w-8 h-8 rounded-full object-cover"
                  />
                )}
                <span className="text-sm text-text-secondary">
                  {data.user?.name}
                </span>
              </div>
              <a
                href={logoutUrl}
                className="text-sm text-text-secondary hover:text-text-primary transition-colors"
              >
                로그아웃
              </a>
            </>
          ) : (
            <a
              href={loginUrl}
              className="text-sm px-4 py-2 rounded-lg bg-ocean-blue text-white hover:bg-deep-ocean transition-colors"
            >
              로그인
            </a>
          )}
        </nav>

        {/* Mobile Menu Button */}
        <button
          type="button"
          className="md:hidden p-2 rounded-lg text-text-secondary hover:bg-mist-blue transition-colors"
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          aria-label={isMenuOpen ? "메뉴 닫기" : "메뉴 열기"}
          aria-expanded={isMenuOpen}
        >
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <title>{isMenuOpen ? "메뉴 닫기" : "메뉴 열기"}</title>
            {isMenuOpen ? (
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            ) : (
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 6h16M4 12h16M4 18h16"
              />
            )}
          </svg>
        </button>
      </div>

      {/* Mobile Menu */}
      {isMenuOpen && (
        <div className="md:hidden border-t border-border bg-surface">
          <div className="max-w-content mx-auto px-4 py-4 flex flex-col gap-3">
            {navLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className="text-sm py-2 text-text-secondary hover:text-text-primary transition-colors"
              >
                {link.label}
              </Link>
            ))}

            {data?.isAuthenticated ? (
              <>
                <div className="h-px bg-border my-1" />
                {authLinks.map((link) => (
                  <Link
                    key={link.to}
                    to={link.to}
                    className="text-sm py-2 text-text-secondary hover:text-text-primary transition-colors"
                  >
                    {link.label}
                  </Link>
                ))}
                <Link
                  to="/write"
                  className="text-sm py-2 px-4 rounded-lg bg-ocean-blue text-white text-center hover:bg-deep-ocean transition-colors"
                >
                  기록하기
                </Link>
                <div className="flex items-center gap-2 py-2">
                  {data.user?.profilePhotoUrl && (
                    <img
                      src={data.user.profilePhotoUrl}
                      alt={data.user.name}
                      className="w-8 h-8 rounded-full object-cover"
                    />
                  )}
                  <span className="text-sm text-text-secondary">
                    {data.user?.name}
                  </span>
                </div>
                <a
                  href={logoutUrl}
                  className="text-sm py-2 text-text-secondary hover:text-text-primary transition-colors"
                >
                  로그아웃
                </a>
              </>
            ) : (
              <>
                <div className="h-px bg-border my-1" />
                <a
                  href={loginUrl}
                  className="text-sm py-2 px-4 rounded-lg bg-ocean-blue text-white text-center hover:bg-deep-ocean transition-colors"
                >
                  로그인
                </a>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
