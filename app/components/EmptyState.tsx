import { Link } from "react-router";

interface EmptyStateProps {
  variant?: "records" | "questions" | "responses" | "learners" | "notifications" | "search" | "generic";
  action?: { label: string; href: string };
  message?: string;
}

const MESSAGES: Record<string, { title: string; body: string }> = {
  records: {
    title: "아직 기록이 없습니다",
    body: "완성된 글이 아니어도 괜찮습니다. 지금 이 순간을 기록해보세요.",
  },
  questions: {
    title: "남겨진 질문이 없습니다",
    body: "기록을 남기면 질문을 달 수 있습니다.",
  },
  responses: {
    title: "아직 응답이 없습니다",
    body: "이 기록에 공명하거나, 질문을 남기거나, 연결할 수 있습니다.",
  },
  learners: {
    title: "Learner가 없습니다",
    body: "아직 등록된 Learner가 없습니다.",
  },
  notifications: {
    title: "알림이 없습니다",
    body: "새로운 응답이나 알림이 오면 여기에 표시됩니다.",
  },
  search: {
    title: "검색 결과가 없습니다",
    body: "다른 검색어로 찾아보세요.",
  },
  generic: {
    title: "내용이 없습니다",
    body: "아직 이 공간이 비어 있습니다.",
  },
};

export default function EmptyState({ variant = "generic", action, message }: EmptyStateProps) {
  const content = MESSAGES[variant];

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
      {action && (
        <Link to={action.href} style={{
          marginTop: "var(--space-2)",
          padding: "10px 20px",
          borderRadius: "var(--radius-md)",
          backgroundColor: "var(--color-ocean-blue)",
          color: "white",
          fontSize: "var(--font-size-base)",
        }}>
          {action.label}
        </Link>
      )}
    </div>
  );
}
