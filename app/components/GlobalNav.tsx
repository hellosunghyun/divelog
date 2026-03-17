import { useRouteLoaderData, useLocation, useNavigate } from "react-router";
import { Link } from "~/components/SmartLink";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { useState, useEffect, useRef } from "react";
import { User, Envelope, GearSix, ArrowSquareOut, SignOut } from "@phosphor-icons/react";
import { AnimatePresence, motion } from "~/lib/motion";
import { staggerContainer, staggerItem } from "~/lib/motion-utils";
import { cn } from "~/lib/cn";

interface PublicLoaderData {
  isAuthenticated: boolean;
  user: {
    id: string;
    name: string;
    profilePhotoUrl: string | null;
    isAdmin: boolean;
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

export default function GlobalNav() {
  const data = useRouteLoaderData("routes/_public") as PublicLoaderData | undefined;
  const location = useLocation();
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [currentUrl, setCurrentUrl] = useState("/");
  const searchInputRef = useRef<HTMLInputElement>(null);
  const profileMenuRef = useRef<HTMLDivElement>(null);
  const profileButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    setCurrentUrl(window.location.href);
  }, [location]);

  useEffect(() => {
    setIsMenuOpen(false);
    setIsProfileMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!isProfileMenuOpen) return;

    function handleClickOutside(e: MouseEvent) {
      if (
        profileMenuRef.current &&
        !profileMenuRef.current.contains(e.target as Node) &&
        profileButtonRef.current &&
        !profileButtonRef.current.contains(e.target as Node)
      ) {
        setIsProfileMenuOpen(false);
      }
    }

    function handleEscape(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setIsProfileMenuOpen(false);
        profileButtonRef.current?.focus();
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isProfileMenuOpen]);

  const loginUrl = `https://ada-kr-pos.com/login?callbackUrl=${encodeURIComponent(currentUrl)}`;
  const logoutUrl = `https://ada-kr-pos.com/api/auth/logout?callbackUrl=${encodeURIComponent(currentUrl)}`;
  const profileEditUrl = `https://auth.ada-kr-pos.com/mypage?returnTo=${encodeURIComponent(currentUrl)}`;

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
      <header className="fixed top-0 left-0 right-0 z-50 pt-3 px-4 pointer-events-none">
        <nav
          aria-label="주요 내비게이션"
          className={cn(
            "max-w-content mx-auto rounded-full",
            "bg-surface/85 backdrop-blur-xl backdrop-saturate-[1.8]",
            "ring-1 ring-border/60 shadow-tinted-sm",
            "pointer-events-auto",
            "px-3 sm:px-5 py-2 sm:py-2.5",
            "flex items-center justify-between gap-3 sm:gap-4"
          )}
        >
          <div className="flex items-center gap-3 sm:gap-8 min-w-0">
            <Link
              to="/"
              className={cn("flex items-center gap-2.5 group no-underline", focusRing)}
            >
              <img
                src="/icon.svg"
                alt=""
                aria-hidden="true"
                className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg shadow-lg shadow-ocean-blue/20"
              />
              <span className="text-base sm:text-lg font-bold tracking-tight text-deep-ocean whitespace-nowrap">
                DiveLog
              </span>
            </Link>

            <div className="hidden lg:flex items-center gap-6">
              {navLinks.map((link) => (
                <Link
                  key={link.to}
                  to={link.to}
                  className={cn(
                    "text-[14px] font-medium transition-colors no-underline",
                    focusRing,
                    isActive(link.to)
                      ? "text-ocean-blue"
                      : "text-text-secondary hover:text-ocean-blue"
                  )}
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </div>

          <div className="hidden lg:flex items-center gap-1.5">
            <Link
              to="/search"
              className={cn(
                "p-2 rounded-lg text-text-tertiary hover:text-ocean-blue hover:bg-mist-blue/50 transition-colors no-underline",
                focusRing
              )}
              aria-label="검색"
            >
              <svg
                className="w-[18px] h-[18px]"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.3-4.3" />
              </svg>
            </Link>

            {data?.isAuthenticated ? (
              <>
                <Link
                  to="/inbox"
                  className={cn(
                    "p-2 rounded-lg transition-colors no-underline",
                    focusRing,
                    isActive("/inbox")
                      ? "text-ocean-blue bg-mist-blue/50"
                      : "text-text-tertiary hover:text-ocean-blue hover:bg-mist-blue/50"
                  )}
                  aria-label="인박스"
                >
                  <svg
                    className="w-[18px] h-[18px]"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
                    <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
                  </svg>
                </Link>

                <Link
                  to="/write/note"
                  prefetch="render"
                  className={cn(
                    "bg-surface border border-border shadow-sm text-text-secondary ml-1 px-4 py-1.5 rounded-full text-[13px] font-medium hover:bg-surface-secondary transition-colors no-underline",
                    focusRing
                  )}
                >
                  짧은 메모
                </Link>
                <Link
                  to="/write/article"
                  prefetch="render"
                  className={cn(
                    "bg-ocean-blue text-white ml-1 px-4 py-1.5 rounded-full text-[13px] font-semibold",
                    "hover:bg-ocean-blue/90 active:scale-[0.98] transition-all",
                    "flex items-center gap-1.5 no-underline",
                    focusRing
                  )}
                >
                  <svg
                    className="w-3.5 h-3.5"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="M12 20h9" />
                    <path d="M16.376 3.622a1 1 0 0 1 3.002 3.002L7.368 18.635a2 2 0 0 1-.855.506l-2.872.838a.5.5 0 0 1-.62-.62l.838-2.872a2 2 0 0 1 .506-.854z" />
                  </svg>
                  글쓰기
                </Link>

                <div className="relative self-center">
                  <Button
                    ref={profileButtonRef}
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
                    className={cn(
                      "ml-1 flex items-center justify-center rounded-full transition-all",
                      focusRing,
                      isProfileMenuOpen || isActive("/me") || isActive("/settings")
                        ? "ring-2 ring-ocean-blue"
                        : "hover:ring-2 hover:ring-ocean-blue/40"
                    )}
                    aria-label="프로필 메뉴"
                    aria-expanded={isProfileMenuOpen}
                    aria-haspopup="true"
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
                  </Button>

                  <AnimatePresence>
                    {isProfileMenuOpen && (
                      <motion.div
                        ref={profileMenuRef}
                        initial={{ opacity: 0, y: -8, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -8, scale: 0.95 }}
                        transition={{ duration: 0.2, ease: [0.32, 0.72, 0, 1] }}
                        className="absolute right-0 top-full mt-2 w-60 rounded-xl border border-border bg-surface shadow-lg z-50 overflow-hidden"
                        role="menu"
                        aria-label="프로필 메뉴"
                      >
                        <div className="px-4 py-3.5 border-b border-border bg-surface-secondary/50">
                          <div className="flex items-center gap-3">
                            {data.user?.profilePhotoUrl ? (
                              <img
                                src={data.user.profilePhotoUrl}
                                alt={data.user.name}
                                className="w-10 h-10 rounded-full object-cover ring-1 ring-border"
                              />
                            ) : (
                              <div className="w-10 h-10 rounded-full bg-mist-blue flex items-center justify-center text-sm font-semibold text-ocean-blue">
                                {data.user?.name?.[0] ?? "?"}
                              </div>
                            )}
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-text-primary truncate">
                                {data.user?.name}
                              </p>
                              <p className="text-caption text-text-tertiary">DiveLog</p>
                            </div>
                          </div>
                        </div>

                        <div className="py-1.5">
                          <Link
                            to="/me"
                            className={cn(
                              "flex items-center gap-3 px-4 py-2.5 text-sm transition-colors no-underline",
                              focusRing,
                              isActive("/me")
                                ? "text-ocean-blue bg-mist-blue/40"
                                : "text-text-primary hover:bg-surface-secondary"
                            )}
                            role="menuitem"
                          >
                            <User size={16} weight="light" className="shrink-0" aria-hidden="true" />
                            내 공간
                          </Link>
                          <Link
                            to="/inbox"
                            className={cn(
                              "flex items-center gap-3 px-4 py-2.5 text-sm transition-colors no-underline",
                              focusRing,
                              isActive("/inbox")
                                ? "text-ocean-blue bg-mist-blue/40"
                                : "text-text-primary hover:bg-surface-secondary"
                            )}
                            role="menuitem"
                          >
                            <Envelope size={16} weight="light" className="shrink-0" aria-hidden="true" />
                            인박스
                          </Link>
                          <Link
                            to="/settings"
                            className={cn(
                              "flex items-center gap-3 px-4 py-2.5 text-sm transition-colors no-underline",
                              focusRing,
                              isActive("/settings")
                                ? "text-ocean-blue bg-mist-blue/40"
                                : "text-text-primary hover:bg-surface-secondary"
                            )}
                            role="menuitem"
                          >
                            <GearSix size={16} weight="light" className="shrink-0" aria-hidden="true" />
                            설정
                          </Link>
                        </div>

                        {data.user?.isAdmin && (
                          <>
                            <div className="h-px bg-border mx-3" />
                            <div className="py-1.5">
                              <Link
                                to="/admin"
                                className={cn(
                                  "flex items-center gap-3 px-4 py-2.5 text-sm text-text-primary hover:bg-surface-secondary transition-colors no-underline",
                                  focusRing
                                )}
                                role="menuitem"
                              >
                                <svg
                                  className="w-4 h-4 shrink-0"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="2"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  aria-hidden="true"
                                >
                                  <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
                                  <circle cx="12" cy="12" r="3" />
                                </svg>
                                어드민
                              </Link>
                            </div>
                          </>
                        )}

                        <div className="h-px bg-border mx-3" />

                        <div className="py-1.5">
                          <a
                            href={profileEditUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={cn(
                              "flex items-center gap-3 px-4 py-2.5 text-sm text-text-primary hover:bg-surface-secondary transition-colors no-underline",
                              focusRing
                            )}
                            role="menuitem"
                          >
                            <ArrowSquareOut size={16} weight="light" className="shrink-0" aria-hidden="true" />
                            프로필 수정
                            <span className="ml-auto text-caption text-text-tertiary">ada-kr-pos.com</span>
                          </a>
                        </div>

                        <div className="h-px bg-border mx-3" />

                        <div className="py-1.5">
                          <a
                            href={logoutUrl}
                            className={cn(
                              "flex items-center gap-3 px-4 py-2.5 text-sm text-text-secondary hover:text-error hover:bg-error/5 transition-colors no-underline",
                              focusRing
                            )}
                            role="menuitem"
                          >
                            <SignOut size={16} weight="light" className="shrink-0" aria-hidden="true" />
                            로그아웃
                          </a>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </>
            ) : (
              <>
                <Link
                  to="/write/note"
                  prefetch="render"
                  className={cn(
                    "border border-border text-text-secondary ml-1 px-4 py-1.5 rounded-full text-[13px] font-medium hover:bg-surface-secondary transition-colors no-underline",
                    focusRing
                  )}
                >
                  짧은 메모
                </Link>
                <Link
                  to="/write/article"
                  prefetch="render"
                  className={cn(
                    "bg-ocean-blue text-white ml-1 px-4 py-1.5 rounded-full text-[13px] font-semibold",
                    "hover:bg-ocean-blue/90 active:scale-[0.98] transition-all",
                    "flex items-center gap-1.5 no-underline",
                    focusRing
                  )}
                >
                  <svg
                    className="w-3.5 h-3.5"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="M12 20h9" />
                    <path d="M16.376 3.622a1 1 0 0 1 3.002 3.002L7.368 18.635a2 2 0 0 1-.855.506l-2.872.838a.5.5 0 0 1-.62-.62l.838-2.872a2 2 0 0 1 .506-.854z" />
                  </svg>
                  글쓰기
                </Link>
              </>
            )}
          </div>

          <Button
            type="button"
            variant="ghost"
            size="icon"
            className={cn(
              "lg:hidden p-2 -mr-2 rounded-lg text-text-secondary hover:text-text-primary hover:bg-mist-blue transition-colors",
              focusRing
            )}
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
          </Button>
        </nav>
      </header>

      <div className="h-15 sm:h-16" />

      <AnimatePresence>
        {isMenuOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="lg:hidden fixed inset-0 z-40 backdrop-blur-2xl bg-surface/95 flex flex-col pt-20 px-6 overflow-y-auto"
            aria-label="메인 메뉴"
          >
            <form onSubmit={handleSearchSubmit} className="relative mb-6">
              <svg
                className="absolute left-3 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-text-tertiary pointer-events-none"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.3-4.3" />
              </svg>
              <Input
                ref={searchInputRef}
                type="text"
                placeholder="기록, 질문, 러너 검색..."
                aria-label="검색"
                className={cn(
                  "h-11 rounded-full border-0 bg-text-tertiary/10 pl-10 pr-4 py-2.5 text-base shadow-none",
                  "placeholder:text-text-tertiary focus-visible:border-ocean-blue focus-visible:ring-ocean-blue/20",
                  focusRing
                )}
              />
            </form>

            <motion.nav
              variants={staggerContainer}
              initial="hidden"
              animate="visible"
              className="flex flex-col gap-1"
            >
              {navLinks.map((link) => (
                <motion.div key={link.to} variants={staggerItem}>
                  <Link
                    to={link.to}
                    className={cn(
                      "block py-3 text-2xl font-medium no-underline",
                      focusRing,
                      isActive(link.to)
                        ? "text-ocean-blue"
                        : "text-text-primary hover:text-ocean-blue"
                    )}
                  >
                    {link.label}
                  </Link>
                </motion.div>
              ))}
            </motion.nav>

            {data?.isAuthenticated ? (
              <>
                <div className="h-px bg-border-subtle my-6" />

                <motion.nav
                  variants={staggerContainer}
                  initial="hidden"
                  animate="visible"
                  className="flex flex-col gap-1"
                >
                  <motion.div variants={staggerItem}>
                    <Link
                      to="/me"
                      className={cn(
                        "block py-3 text-2xl font-medium no-underline",
                        focusRing,
                        isActive("/me")
                          ? "text-ocean-blue"
                          : "text-text-primary hover:text-ocean-blue"
                      )}
                    >
                      내 공간
                    </Link>
                  </motion.div>
                  <motion.div variants={staggerItem}>
                    <Link
                      to="/inbox"
                      className={cn(
                        "block py-3 text-2xl font-medium no-underline",
                        focusRing,
                        isActive("/inbox")
                          ? "text-ocean-blue"
                          : "text-text-primary hover:text-ocean-blue"
                      )}
                    >
                      인박스
                    </Link>
                  </motion.div>
                  <motion.div variants={staggerItem}>
                    <Link
                      to="/settings"
                      className={cn(
                        "block py-3 text-2xl font-medium no-underline",
                        focusRing,
                        isActive("/settings")
                          ? "text-ocean-blue"
                          : "text-text-primary hover:text-ocean-blue"
                      )}
                    >
                      설정
                    </Link>
                  </motion.div>
                  {data.user?.isAdmin && (
                    <motion.div variants={staggerItem}>
                      <Link
                        to="/admin"
                        className={cn(
                          "block py-3 text-2xl font-medium no-underline",
                          focusRing,
                          isActive("/admin")
                            ? "text-ocean-blue"
                            : "text-text-primary hover:text-ocean-blue"
                        )}
                      >
                        어드민
                      </Link>
                    </motion.div>
                  )}
                </motion.nav>

                <motion.div
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4, duration: 0.35, ease: [0.32, 0.72, 0, 1] }}
                  className="mt-6 flex flex-col gap-2"
                >
                  <Link
                    to="/write/note"
                    prefetch="render"
                    className={cn(
                      "w-full bg-surface border border-border shadow-sm text-text-secondary py-3 px-5 rounded-full text-sm font-medium text-center hover:bg-surface-secondary transition-colors no-underline",
                      focusRing
                    )}
                  >
                    짧은 메모
                  </Link>
                  <Link
                    to="/write/article"
                    prefetch="render"
                    className={cn(
                      "w-full bg-ocean-blue text-white py-3 px-5 rounded-full text-sm font-semibold text-center",
                      "hover:bg-ocean-blue/90 active:scale-[0.98] transition-all",
                      "flex items-center justify-center gap-2 no-underline",
                      focusRing
                    )}
                  >
                    <svg
                      className="w-4 h-4"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <path d="M12 20h9" />
                      <path d="M16.376 3.622a1 1 0 0 1 3.002 3.002L7.368 18.635a2 2 0 0 1-.855.506l-2.872.838a.5.5 0 0 1-.62-.62l.838-2.872a2 2 0 0 1 .506-.854z" />
                    </svg>
                    글쓰기
                  </Link>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.5, duration: 0.3 }}
                  className="flex items-center gap-3 py-4 mt-4"
                >
                  {data.user?.profilePhotoUrl ? (
                    <img
                      src={data.user.profilePhotoUrl}
                      alt={data.user.name}
                      className="w-9 h-9 rounded-full object-cover ring-1 ring-border"
                    />
                  ) : (
                    <div className="w-9 h-9 rounded-full bg-mist-blue flex items-center justify-center text-sm font-semibold text-ocean-blue">
                      {data.user?.name?.[0] ?? "?"}
                    </div>
                  )}
                  <span className="text-base text-text-secondary">{data.user?.name}</span>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.55, duration: 0.3 }}
                >
                  <a
                    href={profileEditUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={cn(
                      "flex items-center gap-2 text-sm text-text-secondary hover:text-ocean-blue transition-colors no-underline",
                      focusRing
                    )}
                  >
                    <ArrowSquareOut size={14} weight="light" aria-hidden="true" />
                    프로필 수정
                    <span className="text-caption text-text-tertiary ml-1">ada-kr-pos.com</span>
                  </a>
                  <a
                    href={logoutUrl}
                    className={cn("text-sm text-text-tertiary hover:text-text-secondary transition-colors mt-2 block", focusRing)}
                  >
                    로그아웃
                  </a>
                </motion.div>
              </>
            ) : (
              <>
                <div className="h-px bg-border-subtle my-6" />

                <motion.div
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3, duration: 0.35, ease: [0.32, 0.72, 0, 1] }}
                  className="flex flex-col gap-3"
                >
                  <Link
                    to="/write/note"
                    prefetch="render"
                    className={cn(
                      "w-full bg-surface border border-border shadow-sm text-text-secondary py-3 px-5 rounded-full text-sm font-medium text-center hover:bg-surface-secondary transition-colors no-underline",
                      focusRing
                    )}
                  >
                    짧은 메모
                  </Link>
                  <Link
                    to="/write/article"
                    prefetch="render"
                    className={cn(
                      "w-full bg-ocean-blue text-white py-3 px-5 rounded-full text-sm font-semibold text-center",
                      "hover:bg-ocean-blue/90 active:scale-[0.98] transition-all",
                      "flex items-center justify-center gap-2 no-underline",
                      focusRing
                    )}
                  >
                    <svg
                      className="w-4 h-4"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <path d="M12 20h9" />
                      <path d="M16.376 3.622a1 1 0 0 1 3.002 3.002L7.368 18.635a2 2 0 0 1-.855.506l-2.872.838a.5.5 0 0 1-.62-.62l.838-2.872a2 2 0 0 1 .506-.854z" />
                    </svg>
                    글쓰기
                  </Link>
                  <a
                    href={loginUrl}
                    className={cn(
                      "w-full border border-border text-text-secondary py-3 px-5 rounded-full text-sm font-medium text-center hover:border-ocean-blue/30 hover:text-ocean-blue transition-all",
                      focusRing
                    )}
                  >
                    로그인
                  </a>
                </motion.div>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
