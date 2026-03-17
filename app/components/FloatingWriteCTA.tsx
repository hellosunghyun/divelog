import { useState, useEffect } from "react";
import { useLocation } from "react-router";
import { Link } from "~/components/SmartLink";

const focusRing = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ocean-blue focus-visible:ring-offset-2";

const SCROLL_THRESHOLD = 200;
const HIDDEN_PATHS = ["/write", "/admin", "/settings"];

export function FloatingWriteCTA() {
  const location = useLocation();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setVisible(window.scrollY > SCROLL_THRESHOLD);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const isHidden = HIDDEN_PATHS.some((p) => location.pathname.startsWith(p));

  if (isHidden || !visible) return null;

  return (
    <Link
      to="/write/note"
      prefetch="render"
      data-testid="floating-write-cta"
      aria-label="기록 남기기"
      className={`
        fixed z-30
        lg:hidden
        bg-ocean-blue text-white
        rounded-full shadow-lg shadow-ocean-blue/20
        flex items-center justify-center
        transition-all duration-300
        hover:bg-deep-ocean hover:shadow-xl hover:shadow-ocean-blue/30
        ${focusRing}
      `}
      style={{
        bottom: "calc(env(safe-area-inset-bottom, 0px) + 24px)",
        right: "24px",
        width: "48px",
        height: "48px",
        minWidth: "48px",
        minHeight: "48px",
      }}
    >
      <svg
        aria-hidden="true"
        xmlns="http://www.w3.org/2000/svg"
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M12 20h9" />
        <path d="M16.376 3.622a1 1 0 0 1 3.002 3.002L7.368 18.635a2 2 0 0 1-.855.506l-2.872.838a.5.5 0 0 1-.62-.62l.838-2.872a2 2 0 0 1 .506-.854z" />
      </svg>
    </Link>
  );
}
