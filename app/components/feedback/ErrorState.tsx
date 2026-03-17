import { WarningCircle } from "@phosphor-icons/react";
import { cn } from "~/lib/cn";

interface ErrorStateProps {
  type?: "system" | "permission" | "not_found";
  message?: string;
  onRetry?: () => void;
  className?: string;
}

const ERROR_MESSAGES: Record<string, { title: string; body: string }> = {
  system: {
    title: "연결에 실패했습니다",
    body: "잠시 후 다시 시도해주세요. 문제가 계속되면 페이지를 새로고침 해주세요.",
  },
  permission: {
    title: "접근 권한이 없습니다",
    body: "이 페이지를 보려면 로그인이 필요합니다.",
  },
  not_found: {
    title: "찾을 수 없습니다",
    body: "요청하신 내용이 삭제되었거나 존재하지 않습니다.",
  },
};

export default function ErrorState({
  type = "system",
  message,
  onRetry,
  className,
}: ErrorStateProps) {
  const content = ERROR_MESSAGES[type];

  return (
    <div
      className={cn(
        "flex flex-col items-center text-center py-16 px-6",
        className
      )}
    >
      <div
        className="mb-6 p-3 rounded-2xl bg-destructive/10"
        aria-hidden="true"
      >
        <WarningCircle
          size={48}
          weight="light"
          className="text-destructive"
        />
      </div>

      <h3 className="text-xl font-semibold text-text-primary mb-3 tracking-tight">
        {content.title}
      </h3>

      <p className="text-base text-text-secondary leading-body max-w-[360px] mb-6">
        {message ?? content.body}
      </p>

      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className={cn(
            "inline-flex items-center justify-center",
            "px-6 py-2.5 rounded-full",
            "border border-border bg-transparent",
            "text-sm font-medium text-text-secondary",
            "hover:text-text-primary hover:bg-surface-secondary",
            "transition-colors duration-200",
            "focus-visible:outline-none focus-visible:ring-2",
            "focus-visible:ring-ocean-blue focus-visible:ring-offset-2"
          )}
        >
          다시 시도
        </button>
      )}
    </div>
  );
}
