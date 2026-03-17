import { useLocation } from "react-router";
import { Link } from "~/components/content/SmartLink";
import { CaretRight } from "@phosphor-icons/react";

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface AdminContextBarProps {
  title: string;
  breadcrumbs?: BreadcrumbItem[];
  actions?: React.ReactNode;
}

const ROUTE_LABELS: Record<string, string> = {
  "/admin": "대시보드",
  "/admin/stages": "Stage 관리",
  "/admin/challenges": "챌린지 관리",
  "/admin/learners": "러너 관리",
  "/admin/records": "기록 관리",
  "/admin/dialogue": "Dialogue 관리",
  "/admin/collaboration": "Collaboration 관리",
  "/admin/curation": "큐레이션",
  "/admin/memories": "Collective Memory",
  "/admin/templates": "템플릿",
  "/admin/analytics": "애널리틱스",
  "/admin/settings": "시스템 설정",
  "/admin/roles": "역할 & 권한",
  "/admin/audit": "감사 로그",
  "/admin/tags": "태그 관리",
};

function generateBreadcrumbs(pathname: string): BreadcrumbItem[] {
  const crumbs: BreadcrumbItem[] = [{ label: "Admin", href: "/admin" }];
  const segments = pathname.split("/").filter(Boolean);
  
  if (segments.length > 1 && segments[0] === "admin") {
    const mainPath = `/admin/${segments[1]}`;
    const mainLabel = ROUTE_LABELS[mainPath];
    
    if (mainLabel) {
      crumbs.push({ label: mainLabel, href: mainPath });
    }
  }

  return crumbs;
}

function getCurrentTitle(pathname: string): string {
  if (pathname.match(/\/admin\/stages\/[^/]+$/)) return "Stage 상세";
  if (pathname.match(/\/admin\/challenges\/[^/]+$/)) return "챌린지 상세";
  if (pathname.match(/\/admin\/learners\/[^/]+$/)) return "러너 상세";
  if (pathname.match(/\/admin\/records\/[^/]+$/)) return "기록 상세";
  if (pathname.match(/\/admin\/dialogue\/[^/]+$/)) return "Dialogue 상세";
  if (pathname.match(/\/admin\/collaboration\/[^/]+$/)) return "Collaboration 상세";
  if (pathname.match(/\/admin\/memories\/[^/]+$/)) return "Memory 상세";
  if (pathname.match(/\/admin\/templates\/[^/]+$/)) return "템플릿 상세";

  if (ROUTE_LABELS[pathname]) return ROUTE_LABELS[pathname];

  const matchedPath = Object.keys(ROUTE_LABELS).find(
    (path) => pathname.startsWith(path + "/")
  );
  return matchedPath ? ROUTE_LABELS[matchedPath] : "관리자";
}

export default function AdminContextBar({
  title: propTitle,
  breadcrumbs: propBreadcrumbs,
  actions,
}: AdminContextBarProps) {
  const location = useLocation();
  const title = propTitle ?? getCurrentTitle(location.pathname);
  const breadcrumbs = propBreadcrumbs ?? generateBreadcrumbs(location.pathname);

  return (
    <header className="h-14 border-b border-admin-border flex-shrink-0 bg-admin-surface flex items-center justify-between px-6">
      <div className="flex items-center gap-3">
        {breadcrumbs.length > 0 && (
          <nav className="flex items-center gap-1 text-sm text-admin-text-secondary" aria-label="브레드크럼">
            {breadcrumbs.map((crumb, index) => (
              <span key={crumb.href ?? index} className="flex items-center gap-1">
                {index > 0 && (
                  <CaretRight 
                    weight="bold" 
                    className="w-3 h-3 text-admin-text-secondary opacity-50" 
                    aria-hidden="true" 
                  />
                )}
                {crumb.href ? (
                  <Link
                    to={crumb.href}
                    className="hover:text-admin-text transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-admin-accent focus-visible:ring-offset-2 focus-visible:ring-offset-admin-surface rounded"
                  >
                    {crumb.label}
                  </Link>
                ) : (
                  <span>{crumb.label}</span>
                )}
              </span>
            ))}
            <CaretRight 
              weight="bold" 
              className="w-3 h-3 text-admin-text-secondary opacity-50" 
              aria-hidden="true" 
            />
          </nav>
        )}
        <h1 className="text-base font-semibold text-admin-text">{title}</h1>
      </div>

      {actions && (
        <div className="flex items-center gap-2">
          {actions}
        </div>
      )}
    </header>
  );
}

export function AdminButton({
  children,
  variant = "primary",
  disabled = false,
  onClick,
  type = "button",
  className = "",
}: {
  children: React.ReactNode;
  variant?: "primary" | "secondary" | "ghost" | "danger";
  disabled?: boolean;
  onClick?: () => void;
  type?: "button" | "submit" | "reset";
  className?: string;
}) {
  const baseStyles = "px-4 py-2 rounded-lg text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-admin-accent focus-visible:ring-offset-2 focus-visible:ring-offset-admin-surface disabled:opacity-50 disabled:cursor-not-allowed";
  
  const variantStyles: Record<string, string> = {
    primary: "bg-admin-accent text-white hover:opacity-90",
    secondary: "border border-admin-border text-admin-text hover:bg-admin-bg",
    ghost: "text-admin-text-secondary hover:text-admin-text hover:bg-admin-bg",
    danger: "bg-error text-white hover:opacity-90",
  };

  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className={`${baseStyles} ${variantStyles[variant]} ${className}`}
    >
      {children}
    </button>
  );
}
