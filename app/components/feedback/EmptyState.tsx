import { Link } from "~/components/content/SmartLink";
import { cn } from "~/lib/utils/cn";
import {
  BookOpen,
  ChatTeardrop,
  Quotes,
  Users,
  Bell,
  MagnifyingGlass,
  FolderOpen,
  type IconProps,
} from "@phosphor-icons/react";

interface EmptyStateProps {
  variant?: "records" | "questions" | "responses" | "learners" | "notifications" | "search" | "generic";
  message?: string;
  action?: { label: string; href: string };
  className?: string;
}

const ICON_MAP: Record<string, React.ComponentType<IconProps>> = {
  records: BookOpen,
  questions: ChatTeardrop,
  responses: Quotes,
  learners: Users,
  notifications: Bell,
  search: MagnifyingGlass,
  generic: FolderOpen,
};

const MESSAGES: Record<string, { title: string; body: string }> = {
  records: {
    title: "아직 기록이 없습니다",
    body: "완성된 글이 아니어도 괜찮습니다. 지금 이 순간을 기록해보세요.",
  },
  questions: {
    title: "남겨진 질문이 없습니다",
    body: "기록에 질문을 달아 깊이 있는 성찰을 이어갈 수 있습니다.",
  },
  responses: {
    title: "아직 응답이 없습니다",
    body: "공명하거나, 질문을 남기거나, 연결해보세요.",
  },
  learners: {
    title: "러너가 없습니다",
    body: "함께 여정을 나눌 러너를 기다리고 있습니다.",
  },
  notifications: {
    title: "알림이 없습니다",
    body: "새로운 응답이나 활동이 있으면 알려드리겠습니다.",
  },
  search: {
    title: "검색 결과가 없습니다",
    body: "다른 키워드로 찾아보세요.",
  },
  generic: {
    title: "내용이 없습니다",
    body: "이 공간은 아직 비어 있습니다.",
  },
};

export default function EmptyState({
  variant = "generic",
  message,
  action,
  className,
}: EmptyStateProps) {
  const content = MESSAGES[variant];
  const Icon = ICON_MAP[variant] ?? FolderOpen;

  return (
    <div
      className={cn(
        "flex flex-col items-center text-center py-16 px-6",
        className
      )}
    >
      <div
        className="mb-6 p-3 rounded-2xl bg-surface-secondary"
        aria-hidden="true"
      >
        <Icon
          size={48}
          weight="light"
          className="text-text-tertiary"
        />
      </div>

      <h3 className="text-xl font-semibold text-text-primary mb-3 tracking-tight">
        {content.title}
      </h3>

      <p className="text-base text-text-secondary leading-body max-w-[360px] mb-6">
        {message ?? content.body}
      </p>

      {action && (
        <Link
          to={action.href}
          prefetch="viewport"
          className={cn(
            "inline-flex items-center justify-center gap-2",
            "px-6 py-3 rounded-full",
            "bg-ocean-blue text-white text-sm font-medium",
            "hover:bg-deep-ocean transition-colors duration-200",
            "focus-visible:outline-none focus-visible:ring-2",
            "focus-visible:ring-ocean-blue focus-visible:ring-offset-2",
            "no-underline"
          )}
        >
          {action.label}
        </Link>
      )}
    </div>
  );
}
