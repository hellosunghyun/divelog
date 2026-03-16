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
     title: "러너가 없습니다",
     body: "아직 등록된 러너가 없습니다.",
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
    <div className="flex flex-col items-center text-center py-16 px-4 gap-4">
      <p className="text-xl font-semibold text-text-primary">
        {content.title}
      </p>
      <p className="text-base text-text-secondary leading-body max-w-[360px]">
        {message ?? content.body}
      </p>
      {action && (
        <Link
          to={action.href}
          className="mt-4 px-5 py-2.5 rounded-full bg-ocean-blue text-white text-sm font-medium hover:bg-deep-ocean transition-all duration-normal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ocean-blue focus-visible:ring-offset-2"
        >
          {action.label}
        </Link>
      )}
    </div>
  );
}
