import { cn } from "~/lib/cn";
import { useId } from "react";

interface LoadingSkeletonProps {
  variant?: "card" | "detail" | "list" | "question" | "profile";
  count?: number;
  className?: string;
}

function SkeletonBase({
  className,
  rounded = "rounded-lg",
}: {
  className?: string;
  rounded?: string;
}) {
  return (
    <div
      className={cn(
        "bg-gradient-to-r from-surface-secondary via-border/50 to-surface-secondary",
        "bg-[length:200%_100%]",
        "animate-shimmer",
        rounded,
        className
      )}
      aria-hidden="true"
    />
  );
}

function CardSkeleton() {
  return (
    <article className="bg-surface-secondary ring-1 ring-border p-1.5 rounded-2xl">
      <div className="bg-surface rounded-xl p-5 md:p-6 h-full flex flex-col gap-4">
        <div className="flex gap-2 flex-wrap">
          <SkeletonBase className="w-16 h-5" rounded="rounded-full" />
          <SkeletonBase className="w-12 h-5" rounded="rounded-full" />
        </div>
        <SkeletonBase className="w-3/4 h-6" />
        <div className="flex flex-col gap-2">
          <SkeletonBase className="w-full h-4" />
          <SkeletonBase className="w-[85%] h-4" />
        </div>
        <div className="flex items-center justify-between mt-auto pt-4 border-t border-border-subtle">
          <SkeletonBase className="w-20 h-4" />
          <SkeletonBase className="w-8 h-4" />
        </div>
      </div>
    </article>
  );
}

function DetailSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex gap-2">
        <SkeletonBase className="w-16 h-6" rounded="rounded-full" />
        <SkeletonBase className="w-12 h-6" rounded="rounded-full" />
      </div>
      <SkeletonBase className="w-2/3 h-8" />
      <div className="flex items-center gap-3">
        <SkeletonBase className="w-10 h-10" rounded="rounded-full" />
        <SkeletonBase className="w-24 h-4" />
      </div>
      <div className="flex flex-col gap-3 pt-6">
        <SkeletonBase className="w-full h-4" />
        <SkeletonBase className="w-full h-4" />
        <SkeletonBase className="w-3/4 h-4" />
        <SkeletonBase className="w-full h-4" />
        <SkeletonBase className="w-[60%] h-4" />
      </div>
    </div>
  );
}

function ListSkeleton() {
  return (
    <div className="flex items-center gap-4 p-4 bg-surface rounded-xl ring-1 ring-border">
      <SkeletonBase className="w-10 h-10 flex-shrink-0" rounded="rounded-full" />
      <div className="flex-1 flex flex-col gap-2 min-w-0">
        <SkeletonBase className="w-1/3 h-4" />
        <SkeletonBase className="w-2/3 h-3" />
      </div>
      <SkeletonBase className="w-16 h-6" rounded="rounded-full" />
    </div>
  );
}

function QuestionSkeleton() {
  return (
    <article className="bg-surface-secondary ring-1 ring-border p-6 rounded-2xl">
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-3">
          <SkeletonBase className="w-8 h-8" rounded="rounded-full" />
          <SkeletonBase className="w-24 h-4" />
        </div>
        <SkeletonBase className="w-full h-5" />
        <SkeletonBase className="w-[80%] h-5" />
        <div className="flex items-center gap-2 mt-2">
          <SkeletonBase className="w-20 h-6" rounded="rounded-full" />
        </div>
      </div>
    </article>
  );
}

function ProfileSkeleton() {
  return (
    <div className="flex flex-col items-center text-center gap-4 py-8">
      <SkeletonBase className="w-20 h-20" rounded="rounded-full" />
      <SkeletonBase className="w-32 h-6" />
      <SkeletonBase className="w-48 h-4" />
      <div className="flex gap-6 mt-2">
        <SkeletonBase className="w-16 h-8" />
        <SkeletonBase className="w-16 h-8" />
        <SkeletonBase className="w-16 h-8" />
      </div>
    </div>
  );
}

const SKELETON_COMPONENTS = {
  card: CardSkeleton,
  detail: DetailSkeleton,
  list: ListSkeleton,
  question: QuestionSkeleton,
  profile: ProfileSkeleton,
} as const;

export default function LoadingSkeleton({
  variant = "card",
  count = 3,
  className,
}: LoadingSkeletonProps) {
  const baseId = useId();
  const SkeletonComponent = SKELETON_COMPONENTS[variant];
  const keys = Array.from({ length: count }, (_, i) => `${baseId}-skeleton-${i}`);

  return (
    <div
      className={cn("flex flex-col gap-4", className)}
      role="status"
      aria-label="콘텐츠 로딩 중"
      aria-live="polite"
    >
      {keys.map((key) => (
        <SkeletonComponent key={key} />
      ))}
      <span className="sr-only">로딩 중입니다...</span>
    </div>
  );
}
