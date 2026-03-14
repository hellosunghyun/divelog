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
    <div style={{
      textAlign: "center",
      padding: "var(--space-16) var(--space-4)",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      gap: "var(--space-4)",
    }}>
      <p style={{ fontSize: "var(--font-size-lg)", fontWeight: "var(--font-weight-medium)", color: "var(--color-text-primary)" }}>
        {content.title}
      </p>
      <p style={{ fontSize: "var(--font-size-base)", color: "var(--color-text-secondary)", maxWidth: "360px" }}>
        {message ?? content.body}
      </p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          style={{
            marginTop: "var(--space-2)",
            padding: "10px 20px",
            borderRadius: "var(--radius-md)",
            border: "1px solid var(--color-border)",
            backgroundColor: "transparent",
            color: "var(--color-text-secondary)",
            cursor: "pointer",
            fontSize: "var(--font-size-base)",
          }}
        >
          다시 시도
        </button>
      )}
    </div>
  );
}
