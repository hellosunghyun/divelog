import { useState } from "react";
import { Link } from "~/components/SmartLink";
import { useLocation } from "react-router";

interface NavItem {
  label: string;
  href: string;
}

interface NavCategory {
  label: string;
  items: NavItem[];
}

const NAV_CATEGORIES: NavCategory[] = [
  {
    label: "개요",
    items: [{ label: "대시보드", href: "/admin" }],
  },
  {
    label: "콘텐츠",
    items: [
      { label: "Stage 관리", href: "/admin/stages" },
      { label: "챌린지 관리", href: "/admin/challenges" },
      { label: "기록 관리", href: "/admin/records" },
      { label: "템플릿", href: "/admin/templates" },
      { label: "태그 관리", href: "/admin/tags" },
    ],
  },
  {
    label: "커뮤니티",
    items: [
      { label: "러너 관리", href: "/admin/learners" },
      { label: "Dialogue 관리", href: "/admin/dialogue" },
      { label: "Collaboration 관리", href: "/admin/collaboration" },
    ],
  },
  {
    label: "큐레이션",
    items: [
      { label: "큐레이션", href: "/admin/curation" },
      { label: "Collective Memory", href: "/admin/memories" },
    ],
  },
  {
    label: "시스템",
    items: [
      { label: "애널리틱스", href: "/admin/analytics" },
      { label: "시스템 설정", href: "/admin/settings" },
      { label: "역할 & 권한", href: "/admin/roles" },
      { label: "감사 로그", href: "/admin/audit" },
    ],
  },
];

function isItemActive(href: string, pathname: string): boolean {
  if (href === "/admin") return pathname === "/admin";
  return pathname.startsWith(href);
}

function isCategoryActive(category: NavCategory, pathname: string): boolean {
  return category.items.some((item) => isItemActive(item.href, pathname));
}

export default function AdminSidebar() {
  const location = useLocation();

  const [expanded, setExpanded] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    for (const cat of NAV_CATEGORIES) {
      initial[cat.label] = isCategoryActive(cat, location.pathname);
    }
    return initial;
  });

  function toggleCategory(label: string) {
    setExpanded((prev) => ({ ...prev, [label]: !prev[label] }));
  }

  return (
    <aside className="w-56 flex-shrink-0 h-full overflow-y-auto flex flex-col bg-admin-sidebar">
      <div className="px-4 py-5 border-b border-admin-sidebar-hover">
        <Link
          to="/admin"
          className="text-sm font-semibold text-admin-sidebar-text hover:opacity-80 transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-admin-accent focus-visible:ring-offset-2 focus-visible:ring-offset-admin-sidebar"
        >
           DiveLog admin
        </Link>
      </div>

      <nav className="flex-1 py-3 px-2 space-y-0.5">
        {NAV_CATEGORIES.map((category) => {
          const isOpen = expanded[category.label] ?? false;
          const hasActive = isCategoryActive(category, location.pathname);

          return (
            <div key={category.label}>
              <button
                type="button"
                onClick={() => toggleCategory(category.label)}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-md text-xs font-semibold uppercase tracking-wider transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-admin-accent focus-visible:ring-offset-2 focus-visible:ring-offset-admin-sidebar ${
                  hasActive
                    ? "text-admin-sidebar-text"
                    : "text-admin-text-secondary hover:text-admin-sidebar-text"
                }`}
                aria-expanded={isOpen}
              >
                <span>{category.label}</span>
                <svg
                  className={`w-3.5 h-3.5 transition-transform duration-150 ${isOpen ? "rotate-180" : ""}`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                  aria-hidden="true"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {isOpen && (
                <div className="mt-0.5 ml-2 space-y-0.5">
                  {category.items.map((item) => {
                    const isActive = isItemActive(item.href, location.pathname);

                    return (
                      <Link
                        key={item.href}
                        to={item.href}
                        className={`flex items-center px-3 py-1.5 rounded-md text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-admin-accent focus-visible:ring-offset-2 focus-visible:ring-offset-admin-sidebar ${
                          isActive
                            ? "text-admin-sidebar-text bg-admin-sidebar-active"
                            : "text-admin-text-secondary hover:text-admin-sidebar-text hover:bg-admin-sidebar-hover"
                        }`}
                      >
                        {item.label}
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      <div className="px-4 py-4 border-t border-admin-sidebar-hover">
        <Link
          to="/"
          className="text-caption text-admin-text-secondary hover:text-admin-sidebar-text hover:underline transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-admin-accent focus-visible:ring-offset-2 focus-visible:ring-offset-admin-sidebar"
        >
          ← 사이트로 돌아가기
        </Link>
      </div>
    </aside>
  );
}
