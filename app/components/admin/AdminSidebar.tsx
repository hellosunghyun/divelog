import { Link, useLocation } from "react-router";

const NAV_ITEMS = [
  { label: "대시보드", href: "/admin" },
  { label: "Stage 관리", href: "/admin/stages" },
  { label: "챌린지 관리", href: "/admin/challenges" },
  { label: "Learner 관리", href: "/admin/learners" },
  { label: "기록 관리", href: "/admin/records" },
  { label: "Dialogue 관리", href: "/admin/dialogue" },
  { label: "Collaboration 관리", href: "/admin/collaboration" },
  { label: "큐레이션", href: "/admin/curation" },
  { label: "Collective Memory", href: "/admin/memories" },
  { label: "템플릿", href: "/admin/templates" },
  { label: "애널리틱스", href: "/admin/analytics" },
  { label: "시스템 설정", href: "/admin/settings" },
  { label: "역할 & 권한", href: "/admin/roles" },
  { label: "감사 로그", href: "/admin/audit" },
];

export default function AdminSidebar() {
  const location = useLocation();

  return (
    <aside
      className="w-56 flex-shrink-0 h-full overflow-y-auto flex flex-col"
      style={{ backgroundColor: "var(--color-admin-sidebar)" }}
    >
      {/* Logo/Brand */}
      <div
        className="px-4 py-5 border-b"
        style={{ borderColor: "#1F2937" }}
      >
        <Link
          to="/admin"
          className="text-sm font-semibold"
          style={{ color: "var(--color-admin-sidebar-text)" }}
        >
          divelog admin
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 px-2">
        {NAV_ITEMS.map((item) => {
          const isActive =
            item.href === "/admin"
              ? location.pathname === "/admin"
              : location.pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              to={item.href}
              className="flex items-center px-3 py-2 mb-0.5 rounded-md text-sm transition-colors"
              style={{
                color: isActive
                  ? "var(--color-admin-sidebar-text)"
                  : "#9CA3AF",
                backgroundColor: isActive
                  ? "var(--color-admin-sidebar-active)"
                  : "transparent",
              }}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div
        className="px-4 py-4 border-t"
        style={{ borderColor: "#1F2937" }}
      >
        <Link
          to="/"
          className="text-xs hover:underline"
          style={{ color: "#6B7280" }}
        >
          ← 사이트로 돌아가기
        </Link>
      </div>
    </aside>
  );
}
