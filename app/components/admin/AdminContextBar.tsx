import { useLocation } from "react-router";

const ROUTE_LABELS: Record<string, string> = {
  "/admin": "대시보드",
  "/admin/stages": "Stage 관리",
  "/admin/challenges": "챌린지 관리",
  "/admin/learners": "Learner 관리",
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
};

function getCurrentLabel(pathname: string): string {
  if (ROUTE_LABELS[pathname]) return ROUTE_LABELS[pathname];

  const matchedPath = Object.keys(ROUTE_LABELS).find(
    (path) => pathname.startsWith(path + "/")
  );
  return matchedPath ? ROUTE_LABELS[matchedPath] : "관리자";
}

export default function AdminContextBar() {
  const location = useLocation();
  const currentLabel = getCurrentLabel(location.pathname);

  return (
    <header className="h-14 px-6 flex items-center border-b border-admin-border flex-shrink-0 bg-admin-surface">
      <div>
        <h1 className="text-base font-semibold text-admin-text">
          {currentLabel}
        </h1>
      </div>
    </header>
  );
}
