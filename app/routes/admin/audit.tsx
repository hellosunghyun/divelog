import type { Route } from "./+types/audit";
import { eq, desc } from "drizzle-orm";
import {
  adminTableClass,
  adminThClass,
  adminTdClass,
  adminTrClass,
  adminCardClass,
  adminBadgeBase,
  adminBadgeDefault,
  adminBadgeSuccess,
  adminBadgeWarning,
  adminBadgeError,
  adminBadgeInfo,
  adminEmptyStateClass,
  adminEmptyIconClass,
  adminEmptyTitleClass,
  adminEmptyDescClass,
} from "~/components/admin/admin-patterns";

type AuditDiffDetail = {
  label: string;
  summary: string;
};

export function meta(_: Route.MetaArgs) {
  return [{ title: "감사 로그" }];
}

export async function loader({ request, context }: Route.LoaderArgs) {
  const { db } = await import("~/db/client.server");
  const { createLogger } = await import("~/lib/infra/logger.server");
  const { auditLogs } = await import("~/db/schema.server");
  const { compareRecordStates, formatFieldChange } = await import("~/lib/utils/record-diff.server");

  const logger = createLogger(request, context.cloudflare.env).child({ route: "admin.audit" });
  logger.info("loader_start");
  const url = new URL(request.url);
  const targetType = url.searchParams.get("type");
  const database = db(context.cloudflare.env.DB);
  const base = database.select().from(auditLogs).orderBy(desc(auditLogs.createdAt)).limit(100);
  const logs = targetType ? await base.where(eq(auditLogs.targetType, targetType)) : await base;

  const logsWithDiff = logs.map((log) => {
    let diffSummary: string | null = null;
    let diffDetails: AuditDiffDetail[] | null = null;
    let changedFields: string[] | null = null;
    let beforeSnapshot: Record<string, unknown> | null = null;
    let afterSnapshot: Record<string, unknown> | null = null;

    if (log.targetType === "record" && log.beforeState && log.afterState) {
      try {
        const before = JSON.parse(log.beforeState) as Record<string, unknown>;
        const after = JSON.parse(log.afterState) as Record<string, unknown>;
        beforeSnapshot = before;
        afterSnapshot = after;
        const changes = compareRecordStates(before, after);

        if (changes.length > 0) {
          diffSummary = `${changes
            .map((change) => {
              const { label } = formatFieldChange(change.field, change.oldValue, change.newValue);
              return label;
            })
            .join(", ")} 변경`;
          diffDetails = changes.map((change) =>
            formatFieldChange(change.field, change.oldValue, change.newValue)
          );
          changedFields = changes.map((change) => change.field);
        } else {
          diffSummary = "변경 없음";
        }
      } catch (err) {
        console.error("[audit] Failed to parse state:", err);
        diffSummary = "상세 정보 있음";
      }
    } else if (log.action === "create") {
      diffSummary = "기록이 생성되었습니다";
    } else if (log.action === "delete") {
      diffSummary = "기록이 삭제되었습니다";
    } else if (log.beforeState || log.afterState) {
      try {
        const before = log.beforeState
          ? (JSON.parse(log.beforeState) as Record<string, unknown>)
          : {};
        const after = log.afterState ? (JSON.parse(log.afterState) as Record<string, unknown>) : {};
        const changedCount = Object.keys({ ...before, ...after }).filter(
          (key) => JSON.stringify(before[key]) !== JSON.stringify(after[key])
        ).length;
        diffSummary = changedCount > 0 ? `${changedCount}개 필드 변경` : "변경 없음";
      } catch (err) {
        console.error("[audit] Failed to parse state:", err);
        diffSummary = "상세 정보 있음";
      }
    }

    return {
      ...log,
      diffSummary,
      diffDetails,
      changedFields,
      beforeSnapshot,
      afterSnapshot,
    };
  });

  return { logs: logsWithDiff, targetType };
}

const TARGET_TYPES = ["record", "stage", "learner", "response", "challenge", "collaboration", "memory"];

const ACTION_STYLES: Record<string, { label: string; badge: string }> = {
  create: { label: "생성", badge: adminBadgeSuccess },
  update: { label: "수정", badge: adminBadgeInfo },
  delete: { label: "삭제", badge: adminBadgeError },
  publish: { label: "발행", badge: adminBadgeSuccess },
  unpublish: { label: "발행취소", badge: adminBadgeWarning },
  flag: { label: "신고", badge: adminBadgeError },
  unflag: { label: "신고해제", badge: adminBadgeSuccess },
};

const TARGET_LABELS: Record<string, string> = {
  record: "기록",
  stage: "Stage",
  learner: "러너",
  response: "응답",
  challenge: "챌린지",
  collaboration: "협업",
  memory: "메모리",
};

export default function AdminAuditPage({ loaderData }: Route.ComponentProps) {
  const { logs, targetType } = loaderData;

  const getActionBadge = (action: string) => {
    const style = ACTION_STYLES[action];
    if (style) {
      return { label: style.label, badgeClass: style.badge };
    }
    return { label: action, badgeClass: adminBadgeDefault };
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-admin-text">감사 로그</h2>
        <p className="text-meta text-admin-text-secondary tabular-nums">
          최근 100개
        </p>
      </div>

      <div className="flex items-center gap-2 mb-6 flex-wrap">
        <a
          href="/admin/audit"
          className={`text-caption px-3 py-1.5 rounded-lg no-underline transition-colors ${
            !targetType
              ? "bg-admin-accent text-white"
              : "bg-admin-surface text-admin-text border border-admin-border hover:bg-admin-bg"
          }`}
        >
          전체
        </a>
        {TARGET_TYPES.map((t) => (
          <a
            key={t}
            href={`?type=${t}`}
            className={`text-caption px-3 py-1.5 rounded-lg no-underline transition-colors ${
              targetType === t
                ? "bg-admin-accent text-white"
                : "bg-admin-surface text-admin-text border border-admin-border hover:bg-admin-bg"
            }`}
          >
            {TARGET_LABELS[t] ?? t}
          </a>
        ))}
      </div>

      {logs.length === 0 ? (
        <div className={adminCardClass}>
          <div className={adminEmptyStateClass}>
            <svg className={adminEmptyIconClass} fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p className={adminEmptyTitleClass}>로그가 없습니다</p>
            <p className={adminEmptyDescClass}>
              {targetType ? "다른 유형을 선택해보세요" : "시스템 활동이 기록되면 여기에 표시됩니다"}
            </p>
          </div>
        </div>
      ) : (
        <div className={adminCardClass}>
          <table className={adminTableClass}>
            <thead>
              <tr>
                {["시각", "행위자", "대상 유형", "대상 ID", "액션", "상세"].map((header) => (
                  <th key={header} className={adminThClass}>
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => {
                const { label: actionLabel, badgeClass } = getActionBadge(log.action);
                return (
                  <tr key={log.id} className={adminTrClass}>
                    <td className={`${adminTdClass} text-admin-text-secondary tabular-nums whitespace-nowrap`}>
                      {new Date((log.createdAt ?? 0) * 1000).toLocaleString("ko-KR", {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                    <td className={adminTdClass}>
                      <span className="font-mono text-caption text-admin-text-secondary">
                        {log.actorId.substring(0, 12)}…
                      </span>
                    </td>
                    <td className={adminTdClass}>
                      <span className={`${adminBadgeBase} ${adminBadgeDefault}`}>
                        {TARGET_LABELS[log.targetType] ?? log.targetType}
                      </span>
                    </td>
                    <td className={adminTdClass}>
                      <span className="font-mono text-caption text-admin-text-secondary">
                        {log.targetId.substring(0, 12)}…
                      </span>
                    </td>
                    <td className={adminTdClass}>
                      <span className={`${adminBadgeBase} ${badgeClass}`}>
                        {actionLabel}
                      </span>
                    </td>
                    <td className={`${adminTdClass} max-w-[200px]`}>
                      {log.beforeState || log.afterState ? (
                        log.targetType === "record" ? (
                          log.diffDetails && log.changedFields && log.beforeSnapshot && log.afterSnapshot ? (
                            <details className="cursor-pointer">
                              <summary className="text-xs text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] select-none">
                                {log.diffSummary ?? "상세 정보 있음"}
                              </summary>
                              <div className="mt-2 p-2 bg-[var(--color-surface-secondary)] rounded">
                                <ul className="mb-2 space-y-1">
                                  {log.diffDetails.map((detail) => (
                                    <li
                                      key={`${log.id}-diff-${detail.label}-${detail.summary}`}
                                      className="text-xs text-[var(--color-text-secondary)]"
                                    >
                                      {detail.label}: {detail.summary}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            </details>
                          ) : (
                            <span className="text-xs text-[var(--color-text-secondary)]">
                              {log.diffSummary ?? "상세 정보 있음"}
                            </span>
                          )
                        ) : (
                          <span className="text-xs text-[var(--color-text-secondary)]">
                            {log.diffSummary ?? "상세 정보 있음"}
                          </span>
                        )
                      ) : (
                        <span className="text-[var(--color-text-tertiary)]">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
