interface ErrorStateProps {
  type?: "system" | "permission" | "not_found";
  message?: string;
  onRetry?: () => void;
}

const ERROR_MESSAGES: Record<string, { title: string; body: string }> = {
  system: {
    title: "오류가 발생했습니다",
    body: "잠시 후 다시 시도해주세요. 문제가 계속되면 새로 고침 해주세요.",
  },
  permission: {
    title: "접근 권한이 없습니다",
    body: "이 페이지를 보려면 로그인이 필요합니다.",
  },
  not_found: {
    title: "찾을 수 없습니다",
    body: "요청하신 내용을 찾을 수 없습니다.",
  },
};

export default function ErrorState({ type = "system", message, onRetry }: ErrorStateProps) {
  const content = ERROR_MESSAGES[type];

  return (
    <div className="flex flex-col items-center text-center py-16 px-4 gap-4">
      <p className="text-xl font-semibold text-text-primary">
        {content.title}
      </p>
      <p className="text-base text-text-secondary leading-body max-w-[360px]">
        {message ?? content.body}
      </p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="mt-4 px-5 py-2.5 rounded-full border border-border bg-transparent text-text-secondary text-sm font-medium cursor-base hover:bg-surface-secondary transition-all duration-normal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ocean-blue focus-visible:ring-offset-2"
        >
          다시 시도
        </button>
      )}
    </div>
  );
}
