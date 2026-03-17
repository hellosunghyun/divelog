import { useState } from "react";
import { Link } from "~/components/SmartLink";
import { useLocation } from "react-router";
import {
  House,
  BookOpen,
  Flag,
  Users,
  ChatTeardrop,
  UsersThree,
  Selection,
  Brain,
  Files,
  Tag,
  ChartBar,
  GearSix,
  ShieldCheck,
  ClipboardText,
  ArrowLeft,
  CaretRight,
  List,
} from "@phosphor-icons/react";
import { cn } from "~/lib/cn";

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ size?: number; weight?: string; className?: string }>;
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

const NAV_GROUPS: NavGroup[] = [
  {
    label: "개요",
    items: [{ label: "대시보드", href: "/admin", icon: House }],
  },
  {
    label: "콘텐츠",
    items: [
      { label: "Stage 관리", href: "/admin/stages", icon: BookOpen },
      { label: "챌린지 관리", href: "/admin/challenges", icon: Flag },
      { label: "기록 관리", href: "/admin/records", icon: Files },
      { label: "템플릿", href: "/admin/templates", icon: List },
      { label: "태그 관리", href: "/admin/tags", icon: Tag },
    ],
  },
  {
    label: "커뮤니티",
    items: [
      { label: "러너 관리", href: "/admin/learners", icon: Users },
      { label: "Dialogue 관리", href: "/admin/dialogue", icon: ChatTeardrop },
      { label: "Collaboration 관리", href: "/admin/collaboration", icon: UsersThree },
    ],
  },
  {
    label: "큐레이션",
    items: [
      { label: "큐레이션", href: "/admin/curation", icon: Selection },
      { label: "Collective Memory", href: "/admin/memories", icon: Brain },
    ],
  },
  {
    label: "시스템",
    items: [
      { label: "애널리틱스", href: "/admin/analytics", icon: ChartBar },
      { label: "시스템 설정", href: "/admin/settings", icon: GearSix },
      { label: "역할 & 권한", href: "/admin/roles", icon: ShieldCheck },
      { label: "감사 로그", href: "/admin/audit", icon: ClipboardText },
    ],
  },
];

function isItemActive(href: string, pathname: string): boolean {
  if (href === "/admin") return pathname === "/admin";
  return pathname.startsWith(href);
}

interface AdminSidebarProps {
  className?: string;
}

export default function AdminSidebar({ className }: AdminSidebarProps) {
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      className={cn(
        "flex-shrink-0 h-full flex flex-col bg-admin-sidebar transition-[width] duration-200",
        collapsed ? "w-16" : "w-56",
        className
      )}
    >
      <div className="flex items-center justify-between px-3 py-3 border-b border-admin-sidebar-hover">
        {!collapsed && (
          <Link
            to="/admin"
            className="flex items-center gap-2 text-sm font-semibold text-admin-sidebar-text hover:opacity-80 transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-admin-accent focus-visible:ring-offset-2 focus-visible:ring-offset-admin-sidebar"
          >
            <img src="/icon.svg" alt="" aria-hidden="true" className="w-5 h-5 rounded" />
            <span className="truncate">관리자</span>
          </Link>
        )}
        <button
          type="button"
          onClick={() => setCollapsed((prev) => !prev)}
          className={cn(
            "p-1.5 rounded text-admin-text-secondary hover:text-admin-sidebar-text hover:bg-admin-sidebar-hover transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-admin-accent",
            collapsed && "mx-auto"
          )}
          aria-label={collapsed ? "사이드바 펼치기" : "사이드바 접기"}
          title={collapsed ? "사이드바 펼치기" : "사이드바 접기"}
        >
          <CaretRight
            size={16}
            weight="bold"
            className={cn("transition-transform duration-200", !collapsed && "rotate-180")}
          />
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto py-2 px-1.5">
        {NAV_GROUPS.map((group) => (
          <div key={group.label} className="mb-3">
            {!collapsed && (
              <p className="px-3 py-1.5 text-[11px] font-medium text-admin-text-secondary uppercase tracking-wider">
                {group.label}
              </p>
            )}
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const isActive = isItemActive(item.href, location.pathname);
                const Icon = item.icon;

                return (
                  <Link
                    key={item.href}
                    to={item.href}
                    className={cn(
                      "flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-admin-accent focus-visible:ring-offset-2 focus-visible:ring-offset-admin-sidebar",
                      collapsed && "justify-center px-2",
                      isActive
                        ? "bg-admin-sidebar-active text-admin-sidebar-text font-medium"
                        : "text-admin-text-secondary hover:text-admin-sidebar-text hover:bg-admin-sidebar-hover"
                    )}
                    title={collapsed ? item.label : undefined}
                  >
                    <Icon size={18} weight={isActive ? "regular" : "light"} />
                    {!collapsed && <span className="truncate">{item.label}</span>}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="px-3 py-3 border-t border-admin-sidebar-hover">
        <Link
          to="/"
          className={cn(
            "flex items-center gap-2 text-xs text-admin-text-secondary hover:text-admin-sidebar-text transition-colors",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-admin-accent focus-visible:ring-offset-2 focus-visible:ring-offset-admin-sidebar",
            collapsed && "justify-center"
          )}
          title={collapsed ? "사이트로 돌아가기" : undefined}
        >
          <ArrowLeft size={14} weight="light" />
          {!collapsed && <span>사이트로 돌아가기</span>}
        </Link>
      </div>
    </aside>
  );
}
