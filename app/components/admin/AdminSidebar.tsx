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
    <aside className="w-56 flex-shrink-0 h-full overflow-y-auto flex flex-col bg-admin-sidebar">
      <div className="px-4 py-5 border-b border-admin-sidebar-hover">
        <Link
          to="/admin"
          className="text-sm font-semibold text-admin-sidebar-text hover:opacity-80 transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-admin-accent focus-visible:ring-offset-2 focus-visible:ring-offset-admin-sidebar"
        >
          divelog admin
        </Link>
      </div>

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
              className={`flex items-center px-3 py-2 mb-0.5 rounded-md text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-admin-accent focus-visible:ring-offset-2 focus-visible:ring-offset-admin-sidebar ${
                isActive
                  ? "text-admin-sidebar-text bg-admin-sidebar-active"
                  : "text-admin-text-secondary hover:text-admin-sidebar-text hover:bg-admin-sidebar-hover"
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="px-4 py-4 border-t border-admin-sidebar-hover">
        <Link
          to="/"
          className="text-xs text-admin-text-secondary hover:text-admin-sidebar-text hover:underline transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-admin-accent focus-visible:ring-offset-2 focus-visible:ring-offset-admin-sidebar"
        >
          ← 사이트로 돌아가기
        </Link>
      </div>
    </aside>
  );
}
