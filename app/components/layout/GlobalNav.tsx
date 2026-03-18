import { useRouteLoaderData, useLocation, useNavigate, useFetcher } from "react-router";
import { Link } from "~/components/content/SmartLink";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { useState, useEffect, useRef } from "react";
import { User, Envelope, GearSix, ArrowSquareOut, SignOut } from "@phosphor-icons/react";
import { AnimatePresence, motion } from "~/lib/motion/motion";
import { staggerContainer, staggerItem } from "~/lib/motion/motion-utils";
import { cn } from "~/lib/utils/cn";

interface PublicLoaderData {
  isAuthenticated: boolean;
  user: {
    id: string;
    name: string;
    profilePhotoUrl: string | null;
    isAdmin: boolean;
  } | null;
}

interface NotificationItem {
  id: string;
  type: string;
  title: string;
  content: string | null;
  recordId: string | null;
  isRead: boolean;
  createdAt: number;
}

interface NotifData {
  notifications: NotificationItem[];
  unreadCount: number;
}

interface SearchData {
  q: string;
  results: {
    records: Array<{
      record: { id: string; slug: string; title: string };
      author: { displayName: string; slug: string; profilePhotoUrl: string | null } | null;
      contentSnippet: string;
    }>;
    learners: Array<{
      userId: string;
      slug: string;
      displayName: string;
      profilePhotoUrl: string | null;
    }>;
    questions: Array<{ question: { id: string; content: string } }>;
    sentences: Array<{ sentence: { id: string; content: string } }>;
  };
}

const focusRing = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ocean-blue focus-visible:ring-offset-2";

const NOTIF_TYPE_LABEL: Record<string, string> = {
  response: "응답",
  question: "질문",
  mention: "언급",
  memory: "공동 기억",
  system: "시스템",
  reminder: "알림",
  reread_reminder: "다시 읽기",
  carry_over: "이어가기",
  stage_closing: "Stage 마무리",
};

const navLinks = [
  { to: "/journey", label: "여정" },
  { to: "/logs", label: "기록" },
  { to: "/learners", label: "러너" },
  { to: "/guide", label: "가이드" },
];

type DropdownType = "search" | "notifications" | "profile" | null;

function timeAgo(unixTimestamp: number): string {
  const now = Math.floor(Date.now() / 1000);
  const diff = now - unixTimestamp;
  if (diff < 60) return "방금 전";
  if (diff < 3600) return `${Math.floor(diff / 60)}분 전`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}시간 전`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}일 전`;
  const date = new Date(unixTimestamp * 1000);
  return `${date.getMonth() + 1}월 ${date.getDate()}일`;
}

const dropdownMotion = {
  initial: { opacity: 0, y: -8, scale: 0.95 },
  animate: { opacity: 1, y: 0, scale: 1 },
  exit: { opacity: 0, y: -8, scale: 0.95 },
  transition: { duration: 0.2, ease: [0.32, 0.72, 0, 1] as [number, number, number, number] },
} as const;

export default function GlobalNav() {
  const data = useRouteLoaderData("routes/_public") as PublicLoaderData | undefined;
  const location = useLocation();
  const navigate = useNavigate();

  // State
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [openDropdown, setOpenDropdown] = useState<DropdownType>(null);
  const [currentUrl, setCurrentUrl] = useState("/");
  const [searchQuery, setSearchQuery] = useState("");

  // Refs
  const mobileSearchInputRef = useRef<HTMLInputElement>(null);
  const dropdownSearchInputRef = useRef<HTMLInputElement>(null);
  const searchButtonRef = useRef<HTMLButtonElement>(null);
  const searchMenuRef = useRef<HTMLDivElement>(null);
  const notifButtonRef = useRef<HTMLButtonElement>(null);
  const notifMenuRef = useRef<HTMLDivElement>(null);
  const profileButtonRef = useRef<HTMLButtonElement>(null);
  const profileMenuRef = useRef<HTMLDivElement>(null);
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Fetchers
  const searchFetcher = useFetcher({});
  const notifFetcher = useFetcher({});

  // Derived
  const notifData = notifFetcher.data as NotifData | undefined;
  const unreadCount = notifData?.unreadCount ?? 0;
  const notifications = notifData?.notifications ?? [];
  const searchResults = searchFetcher.data as SearchData | undefined;
  const isSearching = searchFetcher.state === "loading";
  const hasSearchResults =
    searchQuery.trim().length >= 2 &&
    searchResults?.results &&
    (searchResults.results.records.length > 0 || searchResults.results.learners.length > 0);

  const isSearchOpen = openDropdown === "search";
  const isNotifOpen = openDropdown === "notifications";
  const isProfileMenuOpen = openDropdown === "profile";

  // --- Effects ---

  useEffect(() => {
    setCurrentUrl(window.location.href);
  }, [location]);

  useEffect(() => {
    setIsMenuOpen(false);
    setOpenDropdown(null);
    setSearchQuery("");
  }, [location.pathname]);

  // Load notification count on mount (authenticated only)
  useEffect(() => {
    if (data?.isAuthenticated) {
      notifFetcher.load("/api/notifications");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data?.isAuthenticated]);

  // Unified outside-click + Escape handler
  useEffect(() => {
    if (!openDropdown) return;

    function handleClickOutside(e: MouseEvent) {
      const target = e.target as Node;
      if (openDropdown === "search") {
        if (searchMenuRef.current?.contains(target) || searchButtonRef.current?.contains(target)) return;
      } else if (openDropdown === "notifications") {
        if (notifMenuRef.current?.contains(target) || notifButtonRef.current?.contains(target)) return;
      } else if (openDropdown === "profile") {
        if (profileMenuRef.current?.contains(target) || profileButtonRef.current?.contains(target)) return;
      }
      setOpenDropdown(null);
    }

    function handleEscape(e: KeyboardEvent) {
      if (e.key === "Escape") {
        const prev = openDropdown;
        setOpenDropdown(null);
        if (prev === "search") searchButtonRef.current?.focus();
        else if (prev === "notifications") notifButtonRef.current?.focus();
        else if (prev === "profile") profileButtonRef.current?.focus();
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [openDropdown]);

  // Auto-focus search input when dropdown opens
  useEffect(() => {
    if (isSearchOpen) {
      const timer = setTimeout(() => dropdownSearchInputRef.current?.focus(), 50);
      return () => clearTimeout(timer);
    }
  }, [isSearchOpen]);

  // Cleanup debounce timer
  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    };
  }, []);

  // --- Computed URLs ---
  const loginUrl = `https://ada-kr-pos.com/login?callbackUrl=${encodeURIComponent(currentUrl)}`;
  const logoutUrl = `https://ada-kr-pos.com/api/auth/logout?callbackUrl=${encodeURIComponent(currentUrl)}`;
  const profileEditUrl = `https://ada-kr-pos.com/mypage?returnTo=${encodeURIComponent(currentUrl)}`;

  const isActive = (path: string) =>
    location.pathname === path || location.pathname.startsWith(path + "/");

  // --- Handlers ---

  function toggleDropdown(type: DropdownType) {
    if (openDropdown === type) {
      setOpenDropdown(null);
    } else {
      setOpenDropdown(type);
      if (type === "notifications" && data?.isAuthenticated) {
        notifFetcher.load("/api/notifications");
      }
    }
  }

  function handleDropdownSearchInput(value: string) {
    setSearchQuery(value);
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    if (value.trim().length >= 2) {
      searchTimeoutRef.current = setTimeout(() => {
        searchFetcher.load(`/search?q=${encodeURIComponent(value.trim())}`);
      }, 300);
    }
  }

  function handleDropdownSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    const q = searchQuery.trim();
    navigate(q ? `/search?q=${encodeURIComponent(q)}` : "/search");
    setOpenDropdown(null);
    setSearchQuery("");
  }

  function handleMobileSearchSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const q = mobileSearchInputRef.current?.value.trim();
    if (q) {
      navigate(`/search?q=${encodeURIComponent(q)}`);
      if (mobileSearchInputRef.current) mobileSearchInputRef.current.value = "";
    } else {
      navigate("/search");
    }
  }

  // --- Render ---

  return (
    <>
      <header className="right-scroll-bar-position fixed top-0 left-0 right-0 z-50 pt-3 px-4 pointer-events-none">
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
          {/* Logo + Nav Links */}
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
                  prefetch="intent"
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

          {/* Right section — desktop */}
          <div className="hidden lg:flex items-center gap-1.5">
            {/* ═══ SEARCH DROPDOWN ═══ */}
            <div className="relative">
              <button
                ref={searchButtonRef}
                type="button"
                onClick={() => toggleDropdown("search")}
                className={cn(
                  "p-2 rounded-lg transition-colors",
                  focusRing,
                  isSearchOpen
                    ? "text-ocean-blue bg-mist-blue/50"
                    : "text-text-tertiary hover:text-ocean-blue hover:bg-mist-blue/50"
                )}
                aria-label="검색"
                aria-expanded={isSearchOpen}
                aria-haspopup="true"
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
              </button>

              <AnimatePresence>
                {isSearchOpen && (
                  <motion.div
                    ref={searchMenuRef}
                    {...dropdownMotion}
                    className="absolute right-0 top-full mt-2 w-80 rounded-xl border border-border bg-surface shadow-lg z-50 overflow-hidden"
                    role="dialog"
                    aria-label="빠른 검색"
                  >
                    {/* Search input */}
                    <form onSubmit={handleDropdownSearchSubmit} className="p-3 border-b border-border">
                      <div className="relative">
                        <svg
                          className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary pointer-events-none"
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
                        <input
                          ref={dropdownSearchInputRef}
                          type="text"
                          value={searchQuery}
                          onChange={(e) => handleDropdownSearchInput(e.target.value)}
                          placeholder="기록, 러너 검색..."
                          className={cn(
                            "w-full h-9 rounded-lg border border-border bg-surface-secondary/50 pl-9 pr-3 text-sm",
                            "placeholder:text-text-tertiary",
                            focusRing
                          )}
                          aria-label="검색어 입력"
                        />
                      </div>
                    </form>

                    {/* Search results */}
                    <div className="max-h-72 overflow-y-auto">
                      {isSearching && (
                        <div className="px-4 py-6 text-center text-meta text-text-tertiary">
                          검색 중...
                        </div>
                      )}

                      {!isSearching && searchQuery.trim().length < 2 && (
                        <div className="px-4 py-6 text-center text-meta text-text-tertiary">
                          두 글자 이상 입력하세요
                        </div>
                      )}

                      {!isSearching && searchQuery.trim().length >= 2 && !hasSearchResults && searchResults && (
                        <div className="px-4 py-6 text-center text-meta text-text-tertiary">
                          검색 결과가 없습니다
                        </div>
                      )}

                      {!isSearching && hasSearchResults && searchResults && (
                        <>
                          {searchResults.results.records.length > 0 && (
                            <div className="py-1.5">
                              <p className="px-4 py-1.5 text-caption font-medium text-text-tertiary uppercase tracking-wider">
                                기록
                              </p>
                              {searchResults.results.records.slice(0, 3).map((item) => (
                                <Link
                                  key={item.record.id}
                                  to={`/logs/${item.record.slug}`}
                                  className={cn(
                                    "flex flex-col gap-0.5 px-4 py-2.5 text-sm hover:bg-surface-secondary transition-colors no-underline",
                                    focusRing
                                  )}
                                  onClick={() => setOpenDropdown(null)}
                                >
                                  <span className="text-text-primary font-medium truncate">
                                    {item.record.title}
                                  </span>
                                  {item.author && (
                                    <span className="text-caption text-text-tertiary">
                                      {item.author.displayName}
                                    </span>
                                  )}
                                </Link>
                              ))}
                            </div>
                          )}

                          {searchResults.results.learners.length > 0 && (
                            <div className="py-1.5 border-t border-border">
                              <p className="px-4 py-1.5 text-caption font-medium text-text-tertiary uppercase tracking-wider">
                                러너
                              </p>
                              {searchResults.results.learners.slice(0, 3).map((learner) => (
                                <Link
                                  key={learner.userId}
                                  to={`/learners/${learner.slug}`}
                                  className={cn(
                                    "flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-surface-secondary transition-colors no-underline",
                                    focusRing
                                  )}
                                  onClick={() => setOpenDropdown(null)}
                                >
                                  {learner.profilePhotoUrl ? (
                                    <img
                                      src={learner.profilePhotoUrl}
                                      alt=""
                                      className="w-6 h-6 rounded-full object-cover"
                                    />
                                  ) : (
                                    <div className="w-6 h-6 rounded-full bg-mist-blue flex items-center justify-center text-[10px] font-semibold text-ocean-blue">
                                      {learner.displayName?.[0] ?? "?"}
                                    </div>
                                  )}
                                  <span className="text-text-primary">{learner.displayName}</span>
                                </Link>
                              ))}
                            </div>
                          )}
                        </>
                      )}
                    </div>

                    {/* Footer: 상세히 보기 */}
                    <div className="border-t border-border">
                      <Link
                        to={searchQuery.trim() ? `/search?q=${encodeURIComponent(searchQuery.trim())}` : "/search"}
                        className={cn(
                          "flex items-center justify-between px-4 py-3 text-sm text-ocean-blue hover:bg-mist-blue/30 transition-colors no-underline",
                          focusRing
                        )}
                        onClick={() => setOpenDropdown(null)}
                      >
                        <span>검색 페이지에서 상세히 보기</span>
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
                          <path d="M5 12h14" />
                          <path d="m12 5 7 7-7 7" />
                        </svg>
                      </Link>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {data?.isAuthenticated ? (
              <>
                {/* ═══ NOTIFICATION DROPDOWN ═══ */}
                <div className="relative">
                  <button
                    ref={notifButtonRef}
                    type="button"
                    onClick={() => toggleDropdown("notifications")}
                    className={cn(
                      "p-2 rounded-lg transition-colors relative",
                      focusRing,
                      isNotifOpen || isActive("/inbox")
                        ? "text-ocean-blue bg-mist-blue/50"
                        : "text-text-tertiary hover:text-ocean-blue hover:bg-mist-blue/50"
                    )}
                    aria-label={`알림${unreadCount > 0 ? ` (읽지 않은 알림 ${unreadCount}개)` : ""}`}
                    aria-expanded={isNotifOpen}
                    aria-haspopup="true"
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
                    {unreadCount > 0 && (
                      <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-ocean-blue text-white text-[10px] font-bold flex items-center justify-center leading-none">
                        {unreadCount > 9 ? "9+" : unreadCount}
                      </span>
                    )}
                  </button>

                  <AnimatePresence>
                    {isNotifOpen && (
                      <motion.div
                        ref={notifMenuRef}
                        {...dropdownMotion}
                        className="absolute right-0 top-full mt-2 w-80 rounded-xl border border-border bg-surface shadow-lg z-50 overflow-hidden"
                        role="dialog"
                        aria-label="알림"
                      >
                        {/* Header */}
                        <div className="px-4 py-3 border-b border-border flex items-center justify-between">
                          <h3 className="text-sm font-semibold text-text-primary">알림</h3>
                          {unreadCount > 0 && (
                            <span className="text-caption text-ocean-blue font-medium">
                              읽지 않음 {unreadCount}개
                            </span>
                          )}
                        </div>

                        {/* Notification list */}
                        <div className="max-h-80 overflow-y-auto">
                          {notifFetcher.state === "loading" && notifications.length === 0 && (
                            <div className="px-4 py-8 text-center text-meta text-text-tertiary">
                              불러오는 중...
                            </div>
                          )}

                          {notifFetcher.state !== "loading" && notifications.length === 0 && (
                            <div className="px-4 py-8 text-center text-meta text-text-tertiary">
                              아직 알림이 없습니다
                            </div>
                          )}

                          {notifications.length > 0 && (
                            <div className="py-1">
                              {notifications.map((notif) => (
                                <Link
                                  key={notif.id}
                                  to={notif.recordId ? `/logs/${notif.recordId}` : "/inbox"}
                                  className={cn(
                                    "flex items-start gap-3 px-4 py-3 transition-colors no-underline",
                                    focusRing,
                                    notif.isRead
                                      ? "hover:bg-surface-secondary"
                                      : "bg-mist-blue/30 hover:bg-mist-blue/50"
                                  )}
                                  onClick={() => setOpenDropdown(null)}
                                >
                                  {!notif.isRead && (
                                    <span className="w-2 h-2 rounded-full bg-ocean-blue mt-1.5 shrink-0" />
                                  )}
                                  <div className={cn("flex-1 min-w-0", notif.isRead && "ml-5")}>
                                    <div className="flex items-center gap-2 mb-0.5">
                                      <span className="text-caption text-ocean-blue font-medium">
                                        {NOTIF_TYPE_LABEL[notif.type] ?? notif.type}
                                      </span>
                                      <span className="text-caption text-text-tertiary">
                                        {timeAgo(notif.createdAt)}
                                      </span>
                                    </div>
                                    <p className="text-sm text-text-primary truncate">{notif.title}</p>
                                    {notif.content && (
                                      <p className="text-caption text-text-secondary truncate mt-0.5">
                                        {notif.content}
                                      </p>
                                    )}
                                  </div>
                                </Link>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Footer: 상세히 보기 */}
                        <div className="border-t border-border">
                          <Link
                            to="/inbox"
                            className={cn(
                              "flex items-center justify-between px-4 py-3 text-sm text-ocean-blue hover:bg-mist-blue/30 transition-colors no-underline",
                              focusRing
                            )}
                            onClick={() => setOpenDropdown(null)}
                          >
                            <span>인박스에서 모두 보기</span>
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
                              <path d="M5 12h14" />
                              <path d="m12 5 7 7-7 7" />
                            </svg>
                          </Link>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Write buttons */}
                <Link
                   to="/write/note"
                   prefetch="none"
                   className={cn(
                     "bg-surface border border-border shadow-sm text-text-secondary ml-1 px-4 py-1.5 rounded-full text-[13px] font-medium hover:bg-surface-secondary transition-colors no-underline",
                     focusRing
                   )}
                 >
                   짧은 메모
                 </Link>
                 <Link
                   to="/write/article"
                   prefetch="none"
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

                 {/* ═══ PROFILE DROPDOWN ═══ */}
                <div className="relative self-center">
                  <Button
                    ref={profileButtonRef}
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => toggleDropdown("profile")}
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
                        {...dropdownMotion}
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
                   prefetch="none"
                   className={cn(
                     "border border-border text-text-secondary ml-1 px-4 py-1.5 rounded-full text-[13px] font-medium hover:bg-surface-secondary transition-colors no-underline",
                     focusRing
                   )}
                 >
                   짧은 메모
                 </Link>
                 <Link
                   to="/write/article"
                   prefetch="none"
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

          {/* Mobile hamburger */}
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

      {/* ═══ MOBILE MENU ═══ */}
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
            <form onSubmit={handleMobileSearchSubmit} className="relative mb-6">
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
                ref={mobileSearchInputRef}
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
                    prefetch="intent"
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
                     prefetch="none"
                     className={cn(
                       "w-full bg-surface border border-border shadow-sm text-text-secondary py-3 px-5 rounded-full text-sm font-medium text-center hover:bg-surface-secondary transition-colors no-underline",
                       focusRing
                     )}
                   >
                     짧은 메모
                   </Link>
                   <Link
                     to="/write/article"
                     prefetch="none"
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
                     prefetch="none"
                     className={cn(
                       "w-full bg-surface border border-border shadow-sm text-text-secondary py-3 px-5 rounded-full text-sm font-medium text-center hover:bg-surface-secondary transition-colors no-underline",
                       focusRing
                     )}
                   >
                     짧은 메모
                   </Link>
                   <Link
                     to="/write/article"
                     prefetch="none"
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
